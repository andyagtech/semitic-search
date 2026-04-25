"""Phase 4 Arabic: replace noisy Phase 2 mechanical roots with CAMeL Tools
analyzer output.

CAMeL Tools' MorphologyDB + Analyzer gives ~95% accurate root extraction on
MSA vs our Phase 2 mechanical at ~46%. For every non-gold Arabic entry we:
1. Run the analyzer on the unvocalized surface word.
2. Collect all unique roots returned across analyses.
3. If a single dominant root emerges, store it with source='camel_tools',
   confidence='high'. If multiple roots tied, pick the most frequent.

Hollow roots (e.g., قال q-w-l) are marked by CAMeL with a `#` placeholder in
the middle slot. We keep those as-is — the `#` signals the weak consonant
slot, and our downstream matching can ignore the marker.

Runs offline, no API cost. Expected runtime: ~3-5 min for 63K entries.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from camel_tools.morphology.analyzer import Analyzer
from camel_tools.morphology.database import MorphologyDB

from semitic_search.db import connect


def _normalize_camel_root(root: str | None) -> str | None:
    """Convert CAMeL's dot-separated root (ك.ت.ب) to our space-separated
    canonical (ك ت ب). Preserves the `#` weak-slot marker."""
    if not root:
        return None
    parts = [p for p in root.split(".") if p]
    if len(parts) < 2:
        return None
    return " ".join(parts)


def _dominant_root(analyses: list[dict]) -> str | None:
    """Pick the most common root across the analyzer's output. Ties go to the
    first seen. Returns None if no root at all."""
    counter: Counter[str] = Counter()
    for a in analyses:
        r = a.get("root")
        if r:
            counter[r] += 1
    if not counter:
        return None
    return counter.most_common(1)[0][0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    print("Loading CAMeL Tools morphology DB...", flush=True)
    db_camel = MorphologyDB.builtin_db()
    # backoff='NONE' is strict: no analysis → no result (honest).
    # 'ADD_ALL' fabricates possibilities for unseen forms — too generous.
    analyzer = Analyzer(db_camel, backoff="NONE", cache_size=10000)

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}\n")

    # Every non-gold Arabic entry. Overwrite any Phase 2 inferred root with
    # CAMeL's output where available.
    rows = db.execute(
        """SELECT id, word FROM entries WHERE lang = 'ar' AND root IS NULL""",
    )
    if args.limit is not None:
        rows = rows[: args.limit]
    print(f"Candidates: {len(rows):,}")

    updates: list[tuple] = []
    no_analysis = 0
    for i, row in enumerate(rows, 1):
        entry_id, word = row
        if not word:
            continue
        try:
            analyses = analyzer.analyze(word)
        except Exception:
            analyses = []
        if not analyses:
            no_analysis += 1
            continue
        root = _dominant_root(analyses)
        if not root:
            no_analysis += 1
            continue
        norm = _normalize_camel_root(root)
        if not norm:
            no_analysis += 1
            continue
        updates.append((norm, "high", "camel_tools", entry_id))
        if i % 5000 == 0:
            print(f"  ...processed {i:,} / {len(rows):,}", flush=True)

    print(f"\nWriting {len(updates):,} root updates ({no_analysis:,} had no analysis)...")
    if updates:
        for i in range(0, len(updates), 1000):
            batch = updates[i : i + 1000]
            db.executemany(
                """UPDATE entries SET root_inferred = ?,
                                       root_inferred_confidence = ?,
                                       root_inferred_source = ?
                    WHERE id = ?""",
                batch,
            )
            db.commit()

    # Final coverage
    total = db.execute("SELECT COUNT(*) FROM entries WHERE lang = 'ar'")[0][0]
    gold = db.execute("SELECT COUNT(*) FROM entries WHERE lang = 'ar' AND root IS NOT NULL")[0][0]
    camel = db.execute("SELECT COUNT(*) FROM entries WHERE lang = 'ar' AND root_inferred_source = 'camel_tools'")[0][0]
    other_inf = db.execute(
        "SELECT COUNT(*) FROM entries WHERE lang = 'ar' AND root_inferred IS NOT NULL AND root_inferred_source != 'camel_tools'",
    )[0][0]
    total_rooted = db.execute(
        "SELECT COUNT(*) FROM entries WHERE lang = 'ar' AND (root IS NOT NULL OR root_inferred IS NOT NULL)",
    )[0][0]
    print(f"\nArabic coverage: {total_rooted:,} / {total:,} ({total_rooted/total*100:.1f}%)")
    print(f"  gold: {gold:,}")
    print(f"  camel_tools: {camel:,}")
    print(f"  other inferred: {other_inf:,}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
