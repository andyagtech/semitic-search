"""Evaluate cross-script cognate coverage against the 174 editor-curated claims.

Each `cognate_claims` row asserts: `source_word` in `source_lang` has a
cognate whose root is `claimed_root` in `claimed_lang`. We ask three
questions per claim:

  1. Do we know the source_word's own root? (extractor recall)
  2. Does canonical(source_root) == canonical(claimed_root)? (canonicalizer)
  3. Does any entry in claimed_lang at that canonical appear in our index?
     (the thing /api/cognates would surface to a user)

Reports a pass/fail breakdown and the failures so we can triage.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.canonical_root import canonical
from semitic_search.db import connect
from semitic_search.fuzzy_canonical import fuzzy_match


def main() -> int:
    db = connect(prefer="local")

    claims = db.execute(
        """SELECT id, source_lang, source_word, source_etym_num,
                  claimed_lang, claimed_root
             FROM cognate_claims"""
    )
    claims = list(claims)

    # Skip Proto-IE claims — out of scope for a Semitic canonical index.
    claims = [c for c in claims if c[4] != "ine-pro"]
    print(f"Evaluating {len(claims)} Semitic-to-Semitic claims (of 174 total)\n")

    # Per-claim resolution. We resolve source_word -> gold root -> canonical.
    found_source_root = 0
    canonical_matches = 0
    fuzzy_canonical_matches = 0
    index_surfaces_cognate = 0

    failures_no_source_root: list[str] = []
    failures_canonical_mismatch: list[str] = []
    failures_fuzzy_mismatch: list[str] = []
    failures_no_lemma_in_claimed_lang: list[str] = []

    by_pair: Counter[tuple[str, str]] = Counter()
    pair_hits: Counter[tuple[str, str]] = Counter()
    pair_fuzzy_hits: Counter[tuple[str, str]] = Counter()

    for cid, src_lang, src_word, src_etym, clm_lang, clm_root in claims:
        by_pair[(src_lang, clm_lang)] += 1

        # Q1: do we have a root for the source_word?
        row = db.execute(
            """SELECT COALESCE(NULLIF(root, ''), root_inferred) AS r
                 FROM entries
                WHERE lang = ? AND word = ?
                  AND (? IS NULL OR etymology_number IS ? OR etymology_number = ?)
                LIMIT 1""",
            (src_lang, src_word, src_etym, src_etym, src_etym),
        )
        src_root = row[0][0] if row else None
        if not src_root:
            failures_no_source_root.append(f"#{cid} {src_lang}:{src_word}")
            continue
        found_source_root += 1

        # Q2: canonical match?
        src_canon = canonical(src_root)
        clm_canon = canonical(clm_root)
        if not src_canon or not clm_canon:
            failures_canonical_mismatch.append(
                f"#{cid} {src_lang}:{src_word} ({src_root} -> {src_canon}) "
                f"vs {clm_lang}:{clm_root} -> {clm_canon}"
            )
            continue
        strict_match = src_canon == clm_canon
        fuzzy = strict_match or fuzzy_match(src_canon, clm_canon)
        if strict_match:
            canonical_matches += 1
        if fuzzy:
            fuzzy_canonical_matches += 1
            pair_fuzzy_hits[(src_lang, clm_lang)] += 1
        if not strict_match:
            if fuzzy:
                failures_canonical_mismatch.append(
                    f"#{cid} {src_lang}:{src_word} ({src_root} -> {src_canon}) "
                    f"vs {clm_lang}:{clm_root} -> {clm_canon}  [fuzzy✓]"
                )
            else:
                failures_fuzzy_mismatch.append(
                    f"#{cid} {src_lang}:{src_word} ({src_root} -> {src_canon}) "
                    f"vs {clm_lang}:{clm_root} -> {clm_canon}"
                )
            continue

        # Q3: any entry in claimed_lang at this canonical?
        row = db.execute(
            "SELECT COUNT(*) FROM entries WHERE lang = ? AND root_canonical = ?",
            (clm_lang, src_canon),
        )
        hits = row[0][0] if row else 0
        if hits == 0:
            failures_no_lemma_in_claimed_lang.append(
                f"#{cid} {src_lang}:{src_word} -> {clm_lang}:{clm_root} ({src_canon}) — 0 lemmas in index"
            )
            continue
        index_surfaces_cognate += 1
        pair_hits[(src_lang, clm_lang)] += 1

    total = len(claims)
    print(f"Q1 — source_word has a root:              {found_source_root:3}/{total}  ({found_source_root/total:.0%})")
    print(f"Q2a — strict canonical match:             {canonical_matches:3}/{total}  ({canonical_matches/total:.0%})")
    print(f"Q2b — fuzzy (PS-reflex-aware) match:      {fuzzy_canonical_matches:3}/{total}  ({fuzzy_canonical_matches/total:.0%})")
    print(f"Q3 — index surfaces a lemma (strict):     {index_surfaces_cognate:3}/{total}  ({index_surfaces_cognate/total:.0%})")
    print()

    print("Per-lang-pair coverage (strict → fuzzy):")
    for pair, total_pair in sorted(by_pair.items(), key=lambda x: -x[1]):
        hit = pair_hits.get(pair, 0)
        fhit = pair_fuzzy_hits.get(pair, 0)
        print(f"  {pair[0]:>4} -> {pair[1]:<5} {hit:3}/{total_pair:<3} ({hit/total_pair:.0%}) → fuzzy {fhit:3}/{total_pair:<3} ({fhit/total_pair:.0%})")

    def _show(label: str, items: list[str], limit: int = 10) -> None:
        if not items:
            return
        print(f"\n{label} ({len(items)}):")
        for x in items[:limit]:
            print(f"  {x}")
        if len(items) > limit:
            print(f"  ...and {len(items) - limit} more")

    _show("No root known for source word", failures_no_source_root)
    _show("Strict-fail but fuzzy-recovered", failures_canonical_mismatch)
    _show("Strict AND fuzzy fail", failures_fuzzy_mismatch)
    _show("No lemma in claimed_lang at canonical", failures_no_lemma_in_claimed_lang)

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
