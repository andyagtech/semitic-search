"""Find roots attested across the most Semitic languages.

Group all rooted entries (gold + inferred) by their canonical phonetic key,
then rank by count of distinct languages. Print the top-N polyglot roots
with a sample lemma per language, ready for feature-page generation.

Zero cost. Reads local SQLite.
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.canonical_root import canonical
from semitic_search.db import connect


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=50)
    parser.add_argument("--min-langs", type=int, default=4)
    args = parser.parse_args()

    db = connect(prefer="local")
    # One row per (lang, root or root_inferred) where either is set.
    rows = db.execute(
        """SELECT lang, word,
                  COALESCE(NULLIF(root, ''), root_inferred) AS r,
                  pos,
                  COALESCE(json_extract(glosses_json, '$[0]'), '') AS gloss,
                  CASE WHEN root IS NOT NULL THEN 'gold' ELSE 'inferred' END AS tier
             FROM entries
            WHERE COALESCE(NULLIF(root, ''), root_inferred) IS NOT NULL"""
    )

    # key = canonical phonetic root, value = {lang -> list of lemmas}
    families: dict[str, dict[str, list[tuple[str, str, str, str, str]]]] = defaultdict(lambda: defaultdict(list))
    skipped = 0
    for lang, word, r, pos, gloss, tier in rows:
        key = canonical(r)
        if key is None:
            skipped += 1
            continue
        families[key][lang].append((word, r, pos, gloss, tier))

    # Rank by langs represented, then total lemmas
    ranked = sorted(
        families.items(),
        key=lambda kv: (len(kv[1]), sum(len(v) for v in kv[1].values())),
        reverse=True,
    )

    db.close()
    printed = 0
    print(f"{'canonical':<22} {'#langs':>6} {'#lemmas':>8}  languages")
    print("-" * 120)
    for key, by_lang in ranked:
        if len(by_lang) < args.min_langs:
            continue
        total = sum(len(v) for v in by_lang.values())
        langs = ",".join(sorted(by_lang.keys()))
        print(f"{key:<22} {len(by_lang):>6} {total:>8}  {langs}")
        printed += 1
        if printed >= args.top:
            break

    print(f"\n(processed {len(rows):,} entries, skipped {skipped} with unmappable consonants)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
