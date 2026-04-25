"""Derive empirical reflex probabilities from editor cognate claims.

For each (source_lang, claimed_lang) pair the 174 editor claims give us an
aligned pair of roots — e.g. Ar ḏ-h-b ↔ Syc d-h-b. Comparing each position
tells us how Arabic ḏ actually maps to Syriac in attested cognates.

We count these co-occurrences across all claims and emit
`data/reflex_weights.json` — a triple-nested table
`lang1 -> phoneme1 -> {lang2 -> {phoneme2: probability}}`. A downstream
reconstruction engine can use these instead of the hand-coded reflex sets.

The current 174 claims are thin — this is a seed; real coverage needs
more pairs. But even noisy empirical weights are better than uniform
hand-assigned sets for tie-breaking in the reconstructor.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.canonical_root import canonical
from semitic_search.db import connect


def main() -> int:
    db = connect(prefer="local")
    claims = list(db.execute(
        """SELECT source_lang, source_word, source_etym_num,
                  claimed_lang, claimed_root FROM cognate_claims
            WHERE claimed_lang != 'ine-pro'"""
    ))

    # co_counts[(l1, l2, p1)][p2] = count
    co_counts: defaultdict = defaultdict(lambda: defaultdict(int))
    total_by_lang_phoneme: defaultdict = defaultdict(int)
    used = 0
    skipped_misalign = 0

    for src_lang, src_word, src_etym, clm_lang, clm_root in claims:
        # Find the source word's actual root in our DB.
        row = list(db.execute(
            """SELECT COALESCE(NULLIF(root,''), root_inferred) AS r
                 FROM entries WHERE lang=? AND word=?
                  AND (? IS NULL OR etymology_number IS ? OR etymology_number = ?)
                LIMIT 1""",
            (src_lang, src_word, src_etym, src_etym, src_etym),
        ))
        if not row:
            continue
        src_root = row[0][0]
        if not src_root:
            continue

        src_c = canonical(src_root)
        clm_c = canonical(clm_root)
        if not src_c or not clm_c:
            continue
        src_p = src_c.split()
        clm_p = clm_c.split()
        if len(src_p) != len(clm_p):
            skipped_misalign += 1
            continue

        for p1, p2 in zip(src_p, clm_p):
            co_counts[(src_lang, clm_lang, p1)][p2] += 1
            total_by_lang_phoneme[(src_lang, clm_lang, p1)] += 1
        used += 1

    # Normalize to probabilities.
    weights: dict = {}
    for (l1, l2, p1), dist in co_counts.items():
        total = total_by_lang_phoneme[(l1, l2, p1)]
        probs = {p2: c / total for p2, c in dist.items()}
        weights.setdefault(l1, {}).setdefault(p1, {})[l2] = dict(
            sorted(probs.items(), key=lambda kv: -kv[1])
        )

    output_path = Path(__file__).resolve().parents[1] / "data" / "reflex_weights.json"
    output_path.write_text(json.dumps(weights, indent=2, ensure_ascii=False))

    print(f"Processed {used} usable claims; skipped {skipped_misalign} for length mismatch.")
    print(f"Wrote {output_path}")
    print()
    print("Top Arabic-→-Hebrew reflex transitions (reading: when Arabic phoneme X, Hebrew usually Y):")
    rows = []
    for p1, dests in weights.get("ar", {}).items():
        he_dist = dests.get("he", {})
        if he_dist:
            top = max(he_dist.items(), key=lambda kv: kv[1])
            rows.append((p1, top[0], top[1], sum(he_dist.values()) * 100))
    rows.sort(key=lambda r: -r[2])
    for p1, p2, prob, _ in rows[:15]:
        marker = "  ←identity" if p1 == p2 else "  ←reflex"
        print(f"  ar:{p1} → he:{p2}  ({prob:.0%}){marker}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
