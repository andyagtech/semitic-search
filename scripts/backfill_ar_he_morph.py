"""Apply the morphology-aware Ar/He/Syc extractor to un-rooted entries, but
ONLY when it hits 3 solid consonants without falling back to matres. That
keeps the error rate inside the inferred-root noise budget.

Evaluated on gold: ar 46% exact, he 32%, syc 54%, aii 38%. On UN-rooted
entries we don't know per-entry accuracy, but the `high`-confidence gate
correlates strongly with correctness (empirically, about 2-3x the rate of
the mixed-confidence output).

Run after Phase 1 (category+form_of backfill). What remains un-rooted after
this script is the target set for Phase 3 (LLM Flash Lite).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.ar_he_morph import extract_root
from semitic_search.db import connect


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    parser.add_argument("--min-conf", choices=("high", "low"), default="high",
                        help="Only write if confidence >= this level")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}\n")
    print(f"{'lang':<5} {'candidates':>11} {'extracted':>10} {'high':>6} {'low':>6} {'skipped':>8}")
    print("-" * 55)

    for lang in ("ar", "he", "syc", "arc", "aii"):
        rows = db.execute(
            "SELECT id, word FROM entries WHERE lang = ? "
            "AND root IS NULL AND root_inferred IS NULL",
            (lang,),
        )
        high = low = skip = 0
        updates: list[tuple] = []
        for row in rows:
            entry_id, word = row
            root, conf = extract_root(word, lang)
            if root is None:
                skip += 1
                continue
            if conf == "high":
                high += 1
            else:
                low += 1
                if args.min_conf == "high":
                    skip += 1
                    continue
            updates.append((root, conf, "ar_he_morph", entry_id))

        if updates:
            for i in range(0, len(updates), 500):
                db.executemany(
                    "UPDATE entries SET root_inferred = ?, "
                    "root_inferred_confidence = ?, root_inferred_source = ? "
                    "WHERE id = ?",
                    updates[i : i + 500],
                )
                db.commit()

        print(f"{lang:<5} {len(rows):>11,} {len(updates):>10,} {high:>6,} {low:>6,} {skip:>8,}")

    print("\n=== Coverage after Phase 2 ===")
    for lang in ("ar", "he", "syc", "arc", "aii"):
        total = db.execute("SELECT COUNT(*) FROM entries WHERE lang = ?", (lang,))[0][0]
        rooted = db.execute(
            "SELECT COUNT(*) FROM entries WHERE lang = ? AND "
            "(root IS NOT NULL OR root_inferred IS NOT NULL)",
            (lang,),
        )[0][0]
        pct = rooted / total * 100 if total else 0
        print(f"  {lang:<5} {total:>7,} entries · {rooted:>6,} rooted · {pct:>5.1f}%")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
