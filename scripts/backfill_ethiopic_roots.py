"""Rule-based root backfill for un-annotated Ethio-Semitic entries.

Applies the mechanical Ethiopic decomposer to every Ge'ez / Amharic /
Tigrinya entry whose `root` column is NULL (not annotated by a Wiktionary
editor) and stores the inferred root in a new `root_inferred` column with
a confidence tag. Evaluated on the 28 gold-annotated entries:
  - Ge'ez: 79% exact match
  - Amharic: 63% exact match (morphology-heavy nouns lower)
  - Tigrinya: 100% (sample size 1)

Zero API cost. Deterministic. Safe to re-run.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from semitic_search.db import connect
from semitic_search.ethiopic_root import (
    confidence_for_pos,
    extract_consonants,
    extract_root,
)

SCHEMA_STATEMENTS = [
    "ALTER TABLE entries ADD COLUMN root_inferred TEXT",
    "ALTER TABLE entries ADD COLUMN root_inferred_confidence TEXT",
    "ALTER TABLE entries ADD COLUMN root_inferred_source TEXT",
    "CREATE INDEX IF NOT EXISTS idx_entries_root_inferred ON entries(lang, root_inferred)",
]

LANGS = [("gez", "Ge'ez"), ("am", "Amharic"), ("ti", "Tigrinya")]


def _ensure_columns(db) -> None:
    for stmt in SCHEMA_STATEMENTS:
        try:
            db.execute(stmt)
        except Exception:
            # ALTER fails if column already exists — that's fine.
            pass
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    if not args.dry_run:
        _ensure_columns(db)

    print(f"\n{'lang':<10} {'entries':>10} {'no gold':>10} {'inferred':>10} {'conf dist'}")
    print("-" * 80)

    for code, label in LANGS:
        rows = db.execute(
            """SELECT id, word, pos, root
                 FROM entries
                WHERE lang = ?""",
            (code,),
        )
        total = len(rows)
        no_gold = 0
        inferred = 0
        conf_dist: Counter[str] = Counter()
        updates: list[tuple] = []
        for row in rows:
            entry_id, word, pos, gold = row
            if gold:
                continue
            no_gold += 1
            root = extract_root(word, expected_length=3)
            if root is None:
                continue
            n_consonants = len(extract_consonants(word))
            conf = confidence_for_pos(pos or "", n_consonants)
            conf_dist[conf] += 1
            inferred += 1
            updates.append((root, conf, "ethiopic_mechanical", entry_id))

        if updates and not args.dry_run:
            for batch_start in range(0, len(updates), 500):
                batch = updates[batch_start : batch_start + 500]
                db.executemany(
                    "UPDATE entries SET root_inferred = ?, "
                    "root_inferred_confidence = ?, root_inferred_source = ? WHERE id = ?",
                    batch,
                )
                db.commit()

        dist_str = ", ".join(f"{c}={n}" for c, n in conf_dist.most_common())
        print(f"{label:<10} {total:>10,} {no_gold:>10,} {inferred:>10,} {dist_str}")

    db.close()
    if args.dry_run:
        print("\n(dry run — nothing written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
