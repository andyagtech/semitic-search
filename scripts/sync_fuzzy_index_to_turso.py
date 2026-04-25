"""Sync the fuzzy variant junction table to Turso.

Creates entry_fuzzy_variants + index on Turso, then streams local rows up
in batches with the same retry/reconnect logic as the main sync.

Safe to run in parallel with sync_canonical_to_turso.py — they touch
disjoint tables.
"""

from __future__ import annotations

import os
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import libsql_experimental as libsql
from dotenv import load_dotenv

from semitic_search.db import DEFAULT_LOCAL_PATH

BATCH_SIZE = 200  # smaller batch → less to retransmit after stream drop


def _retry(fn, label, reconnect_cb=None, max_retries=6):
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in (
                "connection", "network", "timeout", "stream not found",
                "reset", "hrana", "broken pipe",
            ))
            if not transient or attempt == max_retries - 1:
                raise
            delay = min(2.0 * (2 ** attempt), 20.0)
            print(f"  [retry {attempt+1}] {label}: {str(e)[:80]} sleeping {delay:.0f}s", flush=True)
            time.sleep(delay)
            if "stream not found" in msg and reconnect_cb:
                try: reconnect_cb()
                except Exception: pass


def main() -> int:
    load_dotenv()
    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]

    local = sqlite3.connect(DEFAULT_LOCAL_PATH)
    holder = [libsql.connect(database=url, auth_token=token)]
    def reconnect(): holder[0] = libsql.connect(database=url, auth_token=token)
    def current(): return holder[0]

    print("Creating entry_fuzzy_variants + index on Turso...", flush=True)
    for stmt in [
        """CREATE TABLE IF NOT EXISTS entry_fuzzy_variants (
             entry_id INTEGER NOT NULL,
             variant  TEXT    NOT NULL,
             PRIMARY KEY (entry_id, variant)
           )""",
        "CREATE INDEX IF NOT EXISTS idx_efv_variant ON entry_fuzzy_variants(variant)",
    ]:
        _retry(lambda s=stmt: current().cursor().execute(s), label=stmt[:40], reconnect_cb=reconnect)
        current().commit()

    # Resumption: ask Turso what's already there and skip past it. The
    # previous script iterated from the beginning and paid full network
    # roundtrip for each INSERT OR IGNORE no-op — wasteful at 25 rows/s.
    print("Querying Turso high-water mark for resumption...", flush=True)
    def _fetch_max():
        cur = current().cursor()
        cur.execute("SELECT COALESCE(MAX(entry_id), 0) FROM entry_fuzzy_variants")
        return cur.fetchone()[0]
    max_id_on_turso = _retry(_fetch_max, label="max_id", reconnect_cb=reconnect)
    print(f"  Turso is at entry_id={max_id_on_turso:,}; only syncing rows beyond that.", flush=True)

    rows = local.execute(
        """SELECT entry_id, variant FROM entry_fuzzy_variants
           WHERE entry_id > ?
           ORDER BY entry_id""",
        (max_id_on_turso,),
    ).fetchall()
    print(f"Syncing {len(rows):,} variant rows (skipped already-synced)...", flush=True)

    t0 = time.monotonic()
    sent = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = [tuple(r) for r in rows[i : i + BATCH_SIZE]]
        def _go(b=batch):
            conn = current()
            cur = conn.cursor()
            cur.executemany(
                "INSERT OR IGNORE INTO entry_fuzzy_variants (entry_id, variant) VALUES (?, ?)",
                b,
            )
            conn.commit()
        _retry(_go, label=f"batch id={batch[0][0]}", reconnect_cb=reconnect)
        sent += len(batch)
        if sent % 10000 < BATCH_SIZE:
            elapsed = time.monotonic() - t0
            rate = sent / max(elapsed, 0.001)
            print(f"  ...{sent:,}/{len(rows):,}  ({rate:.0f} rows/s)", flush=True)

    print(f"\n✓ Done in {time.monotonic() - t0:.0f}s")
    local.close()
    current().close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
