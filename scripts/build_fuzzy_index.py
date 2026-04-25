"""Build the fuzzy-canonical junction table for Proto-Semitic-reflex-aware
cognate matching.

The strict `root_canonical` column finds cognates where all languages kept
identical phonemes. The fuzzy table adds cases where languages reflect the
same Proto-Semitic consonant with different surface phonemes (Ar ض ↔ Syc ܥ
from *ḍ, Ar ṯ ↔ Syc t from *ṯ, hollow-verb w/y, etc.).

One row per (entry_id, proto-variant). Typical fanout is 1–10 variants per
root. At ~110k rooted entries we expect ~300k–1M junction rows, easily
indexable.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect
from semitic_search.fuzzy_canonical import fuzzy_variants


SCHEMA = [
    """CREATE TABLE IF NOT EXISTS entry_fuzzy_variants (
         entry_id INTEGER NOT NULL,
         variant  TEXT    NOT NULL,
         PRIMARY KEY (entry_id, variant)
       )""",
    "CREATE INDEX IF NOT EXISTS idx_efv_variant ON entry_fuzzy_variants(variant)",
]


def _ensure_schema(db) -> None:
    for stmt in SCHEMA:
        try:
            db.execute(stmt)
        except Exception as e:
            if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                raise
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    parser.add_argument("--truncate", action="store_true",
                        help="wipe the junction table before rebuilding")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    _ensure_schema(db)

    if args.truncate:
        print("Truncating entry_fuzzy_variants...")
        db.execute("DELETE FROM entry_fuzzy_variants")
        db.commit()

    rows = db.execute(
        """SELECT id, root_canonical FROM entries
           WHERE root_canonical IS NOT NULL"""
    )
    rows = list(rows)
    print(f"Building variants for {len(rows):,} rooted entries...", flush=True)

    writes: list[tuple[int, str]] = []
    for entry_id, canon in rows:
        for v in fuzzy_variants(canon):
            writes.append((entry_id, v))

    print(f"Writing {len(writes):,} junction rows...", flush=True)

    for i in range(0, len(writes), 5000):
        batch = writes[i : i + 5000]
        db.executemany(
            "INSERT OR IGNORE INTO entry_fuzzy_variants (entry_id, variant) VALUES (?, ?)",
            batch,
        )
        db.commit()
        if i % 50000 == 0 and i:
            print(f"  ...{i:,}/{len(writes):,}", flush=True)

    # Distribution: how many entries per variant (top 10 = likely spurious-dense bins)
    print("\nTop 10 most-populous variants (sanity check for over-merging):")
    top = db.execute(
        """SELECT variant, COUNT(DISTINCT entry_id) AS n
             FROM entry_fuzzy_variants
            GROUP BY variant ORDER BY n DESC LIMIT 10"""
    )
    for r in top:
        print(f"  {r[0]:<24}  {r[1]:>6,} entries")

    # How many distinct variants exist
    count_row = db.execute("SELECT COUNT(DISTINCT variant) FROM entry_fuzzy_variants")
    distinct = list(count_row)[0][0]
    print(f"\nDistinct variants: {distinct:,}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
