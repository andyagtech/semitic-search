"""Sync the attestations table to Turso.

Tiny relative to the fuzzy sync (~52k rows vs 399k), but uses the same
retry/reconnect scaffolding. Safe to run while fuzzy sync is active — they
touch disjoint tables.
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

BATCH_SIZE = 200


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

    print("Creating attestations table + indexes on Turso...", flush=True)
    for stmt in [
        """CREATE TABLE IF NOT EXISTS attestations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             entry_id INTEGER NOT NULL,
             source TEXT NOT NULL,
             citation TEXT NOT NULL,
             book_order INTEGER NOT NULL,
             UNIQUE(entry_id, source, citation)
           )""",
        "CREATE INDEX IF NOT EXISTS idx_attestations_entry ON attestations(entry_id)",
        "CREATE INDEX IF NOT EXISTS idx_attestations_source ON attestations(source)",
    ]:
        _retry(lambda s=stmt: current().cursor().execute(s), label=stmt[:40], reconnect_cb=reconnect)
        current().commit()

    # Smart resumption: query Turso for the set of (entry_id, source, citation)
    # already synced, and skip those. Attestations are idempotent so the
    # existing ones don't need re-sending.
    print("Querying Turso for already-synced attestation keys...", flush=True)
    synced: set[tuple[int, str, str]] = set()
    def _fetch_keys():
        cur = current().cursor()
        cur.execute("SELECT entry_id, source, citation FROM attestations")
        return cur.fetchall()
    try:
        existing = _retry(_fetch_keys, label="existing-keys", reconnect_cb=reconnect)
        synced = {(int(r[0]), r[1], r[2]) for r in existing or []}
        print(f"  Turso already has {len(synced):,} attestation rows.", flush=True)
    except Exception as e:
        print(f"  (couldn't query Turso: {e}; will sync everything)", flush=True)

    all_rows = local.execute(
        "SELECT entry_id, source, citation, book_order FROM attestations ORDER BY entry_id, source"
    ).fetchall()
    rows = [r for r in all_rows if (int(r[0]), r[1], r[2]) not in synced]
    print(f"Syncing {len(rows):,} new rows (total local: {len(all_rows):,})...", flush=True)
    if not rows:
        print("✓ Nothing to sync.")
        local.close()
        current().close()
        return 0

    t0 = time.monotonic()
    for i in range(0, len(rows), BATCH_SIZE):
        batch = [tuple(r) for r in rows[i : i + BATCH_SIZE]]
        def _go(b=batch):
            conn = current()
            cur = conn.cursor()
            cur.executemany(
                "INSERT OR REPLACE INTO attestations (entry_id, source, citation, book_order) VALUES (?, ?, ?, ?)",
                b,
            )
            conn.commit()
        _retry(_go, label=f"batch id={batch[0][0]}", reconnect_cb=reconnect)
        if i % 5000 < BATCH_SIZE:
            elapsed = time.monotonic() - t0
            rate = (i + BATCH_SIZE) / max(elapsed, 0.001)
            print(f"  ...{i + BATCH_SIZE:,}/{len(rows):,}  ({rate:.0f} rows/s)", flush=True)

    print(f"\n✓ Done in {time.monotonic() - t0:.0f}s")
    local.close()
    current().close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
