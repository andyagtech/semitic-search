"""Resilient bulk sync from the local SQLite index to Turso.

Prior attempts died mid-Arabic with a transient "No route to host" error,
forcing a restart from zero. This version:

1. Streams rows from local SQLite in ordered chunks (by id).
2. Writes to Turso in small batches with per-batch retry (exponential backoff
   on connection errors).
3. Keeps a checkpoint file so we can resume where we left off after a crash.
4. Works table-by-table (entries, ingest_meta, cognate_claims).

Safe to re-run: remote state is wiped per-language then repopulated, so a
partial prior run just gets overwritten.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import libsql_experimental as libsql  # type: ignore
from dotenv import load_dotenv

from semitic_search.db import DEFAULT_LOCAL_PATH

CHECKPOINT_FILE = Path("/tmp/semitic-turso-sync.checkpoint.json")
BATCH_SIZE = 100  # smaller batches tolerate per-statement latency better
MAX_RETRIES = 8
RETRY_BASE_DELAY = 2.0

ENTRIES_COLUMNS = [
    "id", "lang", "word", "etymology_number", "pos", "root",
    "vocalized_form", "romanization", "glosses_json", "etymology_text",
    "wiktionary_title", "root_inferred", "root_inferred_confidence",
    "root_inferred_source",
]

ENTRIES_BASE_SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY,
    lang TEXT NOT NULL,
    word TEXT NOT NULL,
    etymology_number INTEGER,
    pos TEXT NOT NULL DEFAULT '',
    root TEXT,
    vocalized_form TEXT,
    romanization TEXT,
    glosses_json TEXT NOT NULL DEFAULT '[]',
    etymology_text TEXT,
    wiktionary_title TEXT NOT NULL,
    UNIQUE (lang, word, etymology_number, pos)
);
""".strip()

# Idempotent column additions for tables that predate our v2 columns.
ENTRIES_NEW_COLUMNS = [
    ("root_inferred", "TEXT"),
    ("root_inferred_confidence", "TEXT"),
    ("root_inferred_source", "TEXT"),
]

ENTRIES_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_entries_lang_root ON entries(lang, root);
CREATE INDEX IF NOT EXISTS idx_entries_lang_word ON entries(lang, word);
CREATE INDEX IF NOT EXISTS idx_entries_root ON entries(root) WHERE root IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_lang_root_inferred ON entries(lang, root_inferred);
CREATE INDEX IF NOT EXISTS idx_entries_root_inferred ON entries(root_inferred) WHERE root_inferred IS NOT NULL;
""".strip()

CLAIMS_SCHEMA = """
CREATE TABLE IF NOT EXISTS cognate_claims (
    id INTEGER PRIMARY KEY,
    source_lang TEXT NOT NULL,
    source_word TEXT NOT NULL,
    source_etym_num INTEGER,
    source_pos TEXT NOT NULL DEFAULT '',
    claimed_lang TEXT NOT NULL,
    claimed_root TEXT NOT NULL,
    source_template TEXT NOT NULL,
    UNIQUE (source_lang, source_word, source_etym_num, source_pos, claimed_lang, claimed_root)
);
CREATE INDEX IF NOT EXISTS idx_claims_source ON cognate_claims(source_lang, source_word);
CREATE INDEX IF NOT EXISTS idx_claims_claimed ON cognate_claims(claimed_lang, claimed_root);
""".strip()


def _load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        return json.loads(CHECKPOINT_FILE.read_text())
    return {}


def _save_checkpoint(state: dict) -> None:
    CHECKPOINT_FILE.write_text(json.dumps(state, indent=2))


def _retry_execute(fn, *, label: str, reconnect_cb=None):
    """Call fn(), retrying on transient network errors with capped backoff.

    When we hit a "stream not found" error from Turso (the server timed out
    the connection and our client holds a dead stream id), reconnect_cb is
    invoked to rebuild the connection before retrying.
    """
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in (
                "connection", "network", "timeout", "timed out",
                "route to host", "reset", "hrana", "broken pipe",
                "temporarily unavailable", "stream not found",
            ))
            if not transient:
                raise
            last_err = e
            # Cap backoff so we don't sleep for 4+ minutes on late retries.
            delay = min(RETRY_BASE_DELAY * (2 ** attempt), 20.0)
            err_msg = str(e)[:90]
            print(f"  [retry {attempt+1}/{MAX_RETRIES}] {label}: {err_msg}  sleeping {delay:.0f}s", flush=True)
            time.sleep(delay)
            # If the stream is dead, reconnect before the next attempt.
            if "stream not found" in msg and reconnect_cb is not None:
                try:
                    reconnect_cb()
                    print("  [reconnected]", flush=True)
                except Exception as re:
                    re_msg = str(re)[:80]
                    print(f"  [reconnect failed] {re_msg}", flush=True)
    raise last_err or RuntimeError(f"retries exhausted for {label}")


def _executescript(conn, sql: str, label: str) -> None:
    for stmt in (s.strip() for s in sql.split(";") if s.strip()):
        _retry_execute(lambda: conn.cursor().execute(stmt), label=f"{label}:{stmt[:40]}")
    conn.commit()


def _sync_entries_for_lang(
    local: sqlite3.Cursor, remote_holder: list, lang: str, checkpoint: dict
) -> None:
    """remote_holder is a single-element list [conn] so reconnect can swap it."""
    remote = remote_holder[0]
    # Reconnection callback — re-opens the libsql stream when the server
    # drops it. Updates remote_holder so future batches use the fresh conn.
    import os
    def _reconnect():
        url = os.environ["TURSO_DATABASE_URL"]
        token = os.environ["TURSO_AUTH_TOKEN"]
        new_conn = libsql.connect(database=url, auth_token=token)
        remote_holder[0] = new_conn

    def _current():
        return remote_holder[0]

    # Wipe existing remote rows for this lang (safe to re-run)
    last_id = checkpoint.get(f"entries:{lang}:last_id", 0)
    if last_id == 0:
        _retry_execute(
            lambda: _current().cursor().execute("DELETE FROM entries WHERE lang = ?", (lang,)),
            label=f"wipe {lang}",
            reconnect_cb=_reconnect,
        )
        _current().commit()

    total = local.execute("SELECT COUNT(*) FROM entries WHERE lang = ?", (lang,)).fetchone()[0]
    if total == 0:
        return
    print(f"  {lang}: {total:,} rows (resuming from id > {last_id})", flush=True)

    cols = ", ".join(ENTRIES_COLUMNS)
    placeholders = ", ".join("?" * len(ENTRIES_COLUMNS))
    insert_sql = f"INSERT OR REPLACE INTO entries ({cols}) VALUES ({placeholders})"

    done = 0
    t0 = time.monotonic()
    while True:
        rows = local.execute(
            f"SELECT {cols} FROM entries WHERE lang = ? AND id > ? ORDER BY id LIMIT ?",
            (lang, last_id, BATCH_SIZE),
        ).fetchall()
        if not rows:
            break
        batch = [tuple(r) for r in rows]
        def _go():
            conn = _current()
            cur = conn.cursor()
            cur.executemany(insert_sql, batch)
            conn.commit()
        _retry_execute(_go, label=f"{lang} id>{last_id}", reconnect_cb=_reconnect)
        last_id = rows[-1][0]
        done += len(rows)
        checkpoint[f"entries:{lang}:last_id"] = last_id
        _save_checkpoint(checkpoint)
        if done % 1000 < BATCH_SIZE:
            elapsed = time.monotonic() - t0
            rate = done / max(elapsed, 0.001)
            print(f"    ...{done:,}/{total:,}  ({rate:.0f} rows/s)", flush=True)

    print(f"  {lang}: ✓ done in {time.monotonic() - t0:.0f}s", flush=True)


def _sync_cognate_claims(local: sqlite3.Cursor, remote, checkpoint: dict) -> None:
    if checkpoint.get("cognate_claims:done"):
        print("  cognate_claims: already synced")
        return
    _retry_execute(lambda: remote.cursor().execute("DELETE FROM cognate_claims"), label="wipe claims")
    remote.commit()
    rows = local.execute(
        """SELECT source_lang, source_word, source_etym_num, source_pos,
                  claimed_lang, claimed_root, source_template
             FROM cognate_claims"""
    ).fetchall()
    if rows:
        def _go():
            cur = remote.cursor()
            cur.executemany(
                """INSERT OR IGNORE INTO cognate_claims
                   (source_lang, source_word, source_etym_num, source_pos,
                    claimed_lang, claimed_root, source_template)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [tuple(r) for r in rows],
            )
            remote.commit()
        _retry_execute(_go, label="insert claims")
    print(f"  cognate_claims: ✓ {len(rows):,} rows")
    checkpoint["cognate_claims:done"] = True
    _save_checkpoint(checkpoint)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Ignore checkpoint, start fresh")
    args = parser.parse_args()

    load_dotenv()
    import os
    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]

    checkpoint = {} if args.reset else _load_checkpoint()
    if args.reset and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()

    local_conn = sqlite3.connect(DEFAULT_LOCAL_PATH)
    local_conn.row_factory = sqlite3.Row
    local = local_conn.cursor()
    remote = libsql.connect(database=url, auth_token=token)

    # 1. Ensure remote schema — CREATE TABLE first (skipped if exists), then
    # ALTER TABLE for new columns (pre-existing tables may miss them), then
    # CREATE INDEX (references the new columns).
    print("Applying schema...", flush=True)
    _executescript(remote, ENTRIES_BASE_SCHEMA, "entries base")
    for col_name, col_type in ENTRIES_NEW_COLUMNS:
        try:
            _retry_execute(
                lambda c=col_name, t=col_type: remote.cursor().execute(
                    f"ALTER TABLE entries ADD COLUMN {c} {t}"
                ),
                label=f"add column {col_name}",
            )
            remote.commit()
        except Exception as e:
            # "duplicate column name" when the column already exists — safe to ignore
            if "duplicate column" not in str(e).lower():
                raise
    _executescript(remote, ENTRIES_INDEXES, "entries indexes")
    _executescript(remote, CLAIMS_SCHEMA, "claims schema")

    # 2. Sync entries per lang (so progress is meaningful)
    langs = [r[0] for r in local.execute(
        "SELECT DISTINCT lang FROM entries ORDER BY "
        "CASE lang "
        "  WHEN 'aii' THEN 1 WHEN 'arc' THEN 2 WHEN 'syc' THEN 3 "
        "  WHEN 'he' THEN 4 WHEN 'akk' THEN 5 WHEN 'ug' THEN 6 "
        "  WHEN 'gez' THEN 7 WHEN 'am' THEN 8 WHEN 'ti' THEN 9 "
        "  WHEN 'sab' THEN 10 WHEN 'osa' THEN 11 WHEN 'phn' THEN 12 "
        "  WHEN 'pun' THEN 13 WHEN 'tru' THEN 14 WHEN 'mid' THEN 15 "
        "  WHEN 'amw' THEN 16 WHEN 'ar' THEN 99 ELSE 50 END"
    )]
    print(f"Syncing {len(langs)} languages (smaller first): {langs}", flush=True)
    remote_holder = [remote]
    for lang in langs:
        _sync_entries_for_lang(local, remote_holder, lang, checkpoint)

    # 3. Sync cognate_claims
    _sync_cognate_claims(local, remote_holder[0], checkpoint)

    # Summary
    counts = local.execute(
        "SELECT lang, COUNT(*) FROM entries GROUP BY lang ORDER BY lang"
    ).fetchall()
    print("\n=== Local row counts (should match remote after sync) ===")
    total = 0
    for lang, n in counts:
        print(f"  {lang:<5} {n:>8,}")
        total += n
    print(f"  TOTAL {total:>8,}")

    remote.close()
    local_conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
