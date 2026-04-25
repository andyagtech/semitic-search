"""Evaluate the rule-based Ethiopic root extractor against Wiktionary ground
truth.

For every Ge'ez / Amharic / Tigrinya entry that has a gold root (extracted
from Wiktionary templates by our ingest pipeline), compare our mechanical
extraction's output. Report exact-match accuracy, the common failure modes,
and a confidence breakdown.

This is the sanity check gate BEFORE running the extractor over the entire
corpus. No API calls, no LLMs, no cost.
"""

from __future__ import annotations

import sqlite3
import sys
from collections import Counter
from pathlib import Path

from semitic_search.ethiopic_root import (
    canonicalize_root,
    confidence_for_pos,
    extract_consonants,
    extract_root,
    roots_match_with_gutturals,
)


def norm_root(s: str) -> str:
    """Canonicalize an Ethiopic root: map every char to its first-form
    equivalent + collapse separators. Makes 1st/6th-form encodings comparable.
    """
    return canonicalize_root(s)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    db_path = root / "data" / "processed" / "semitic.sqlite3"
    if not db_path.exists():
        print(f"ERROR: {db_path} missing — run scripts/build_index.py first.", file=sys.stderr)
        return 1

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    for lang, label in [("gez", "Ge'ez"), ("am", "Amharic"), ("ti", "Tigrinya")]:
        rows = cur.execute(
            "SELECT word, pos, root FROM entries WHERE lang = ? AND root IS NOT NULL",
            (lang,),
        ).fetchall()

        if not rows:
            print(f"\n=== {label}: no gold roots ===")
            continue

        print(f"\n=== {label}: {len(rows)} gold-annotated entries ===")
        hits = 0  # exact match via extract_root (with prefix strip + length)
        gut_hits = 0  # match after allowing guttural swaps
        misses: list[tuple[str, str, str, str]] = []
        conf_counts: Counter[str] = Counter()
        for word, pos, gold in rows:
            pred = extract_root(word, expected_length=3)
            if pred is None:
                misses.append((word, pos or "?", gold, "(no consonants)"))
                continue
            gold_c = norm_root(gold)
            pred_c = norm_root(pred)
            if pred_c == gold_c:
                hits += 1
                n_consonants = len(extract_consonants(word))
                conf_counts[confidence_for_pos(pos, n_consonants)] += 1
            elif roots_match_with_gutturals(pred, gold):
                gut_hits += 1
            else:
                misses.append((word, pos or "?", gold, pred))

        total = len(rows)
        print(f"  exact match:       {hits:>4}/{total}  ({hits/total*100:.1f}%)")
        print(f"  +guttural swap:    {gut_hits:>4}/{total}  (+{gut_hits/total*100:.1f}%)")
        overall = hits + gut_hits
        print(f"  total recoverable: {overall:>4}/{total}  ({overall/total*100:.1f}%)")
        if conf_counts:
            print("  confidence (exact-match rows only):")
            for c, n in conf_counts.most_common():
                print(f"    {c}: {n}")
        if misses:
            print("  sample misses (up to 8):")
            for word, pos, gold, pred in misses[:8]:
                print(f"    {word!r:<14} pos={pos:<8} gold={gold!r:<15} pred={pred!r}")

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
