"""Populate the `root_canonical` column on every entry.

The canonical key is a space-separated phonetic transliteration of the root
(e.g. `ك ت ب` / `כ ת ב` / `ܟ ܬ ܒ` / `ከ ተ በ` / `𐤊 𐤕 𐤁` all → `k t b`).

Prefers gold `root` when present, falls back to `root_inferred`. Used by the
/api/cognates endpoint to find cross-script cognates instantly.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.canonical_root import canonical
from semitic_search.db import connect


SCHEMA = [
    "ALTER TABLE entries ADD COLUMN root_canonical TEXT",
    "CREATE INDEX IF NOT EXISTS idx_entries_canonical ON entries(root_canonical)",
    "CREATE INDEX IF NOT EXISTS idx_entries_canonical_lang ON entries(root_canonical, lang)",
]


def _ensure_schema(db) -> None:
    for stmt in SCHEMA:
        try:
            db.execute(stmt)
        except Exception as e:
            if "duplicate column" not in str(e).lower():
                raise
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    _ensure_schema(db)

    rows = db.execute(
        """SELECT id, COALESCE(NULLIF(root, ''), root_inferred) AS r
             FROM entries
            WHERE COALESCE(NULLIF(root, ''), root_inferred) IS NOT NULL"""
    )
    print(f"Computing canonical for {len(rows):,} rooted entries...", flush=True)

    updates: list[tuple] = []
    for entry_id, root in rows:
        c = canonical(root)
        if c is None:
            continue
        updates.append((c, entry_id))

    print(f"Writing {len(updates):,} canonical keys...", flush=True)
    for i in range(0, len(updates), 2000):
        batch = updates[i : i + 2000]
        db.executemany("UPDATE entries SET root_canonical = ? WHERE id = ?", batch)
        db.commit()
        if i % 20000 == 0:
            print(f"  ...{i:,}/{len(updates):,}", flush=True)

    # Distribution sanity
    print("\nTop 5 most-represented canonical roots:")
    top = db.execute(
        """SELECT root_canonical, COUNT(DISTINCT lang) AS langs, COUNT(*) AS lemmas
             FROM entries WHERE root_canonical IS NOT NULL
            GROUP BY root_canonical
            ORDER BY langs DESC, lemmas DESC
            LIMIT 5""",
    )
    for r in top:
        print(f"  {r[0]:<14} {r[1]} langs, {r[2]} lemmas")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
