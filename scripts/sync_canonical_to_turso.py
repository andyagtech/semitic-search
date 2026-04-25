"""Sync only the `root_canonical` column to Turso.

The full sync_to_turso.py would overwrite every row; we just need the
canonical key added to existing rows. Does ALTER TABLE + UPDATE-by-id in
batches, with the same retry/reconnect logic as the main sync.
"""

from __future__ import annotations

import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import libsql_experimental as libsql
from dotenv import load_dotenv

from semitic_search.db import DEFAULT_LOCAL_PATH

BATCH_SIZE = 100


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
    import os
    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]

    local = sqlite3.connect(DEFAULT_LOCAL_PATH)
    remote_holder = [libsql.connect(database=url, auth_token=token)]

    def reconnect():
        remote_holder[0] = libsql.connect(database=url, auth_token=token)

    def current():
        return remote_holder[0]

    # Schema: add column + index
    print("Adding root_canonical column + indexes on Turso...", flush=True)
    for stmt in [
        "ALTER TABLE entries ADD COLUMN root_canonical TEXT",
        "CREATE INDEX IF NOT EXISTS idx_entries_canonical ON entries(root_canonical)",
        "CREATE INDEX IF NOT EXISTS idx_entries_canonical_lang ON entries(root_canonical, lang)",
    ]:
        try:
            _retry(lambda s=stmt: current().cursor().execute(s), label=stmt[:40], reconnect_cb=reconnect)
            current().commit()
        except Exception as e:
            if "duplicate column" not in str(e).lower():
                raise
            print(f"  (column already exists — skipping)")

    rows = local.execute(
        "SELECT id, root_canonical FROM entries WHERE root_canonical IS NOT NULL ORDER BY id"
    ).fetchall()
    print(f"Syncing {len(rows):,} canonical keys...", flush=True)

    t0 = time.monotonic()
    sent = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = [tuple(r) for r in rows[i : i + BATCH_SIZE]]
        def _go(b=batch):
            conn = current()
            cur = conn.cursor()
            cur.executemany("UPDATE entries SET root_canonical = ? WHERE id = ?", [(c, eid) for eid, c in b])
            conn.commit()
        _retry(_go, label=f"batch id={batch[0][0]}", reconnect_cb=reconnect)
        sent += len(batch)
        if sent % 5000 < BATCH_SIZE:
            elapsed = time.monotonic() - t0
            rate = sent / max(elapsed, 0.001)
            print(f"  ...{sent:,}/{len(rows):,}  ({rate:.0f} rows/s)", flush=True)

    print(f"\n✓ Done in {time.monotonic() - t0:.0f}s")
    local.close()
    current().close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
