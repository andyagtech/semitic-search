"""Report root-template coverage for each Kaikki dump."""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from semitic_search.ingest import ROOT_TEMPLATE_NAMES, iter_records

LANGS: list[tuple[str, str, str]] = [
    ("ar", "Arabic", "arabic.jsonl"),
    ("he", "Hebrew", "hebrew.jsonl"),
    ("syc", "Classical Syriac", "syriac.jsonl"),
    ("am", "Amharic", "amharic.jsonl"),
    ("ti", "Tigrinya", "tigrinya.jsonl"),
    ("gez", "Ge'ez", "geez.jsonl"),
    ("ug", "Ugaritic", "ugaritic.jsonl"),
    ("akk", "Akkadian", "akkadian.jsonl"),
    ("arc", "Aramaic (Imperial)", "aramaic.jsonl"),
    ("aii", "Assyrian Neo-Aramaic", "assyrian_neo_aramaic.jsonl"),
]


def main() -> int:
    data_dir = Path(__file__).resolve().parents[1] / "data" / "raw"
    if not data_dir.exists():
        print(f"ERROR: {data_dir} does not exist. Run the Kaikki download first.", file=sys.stderr)
        return 1

    print(f"{'code':<5} {'language':<22} {'entries':>10} {'with_root':>10} {'coverage':>9}  radical_dist  pos_breakdown(top 4)")
    print("-" * 130)

    for code, name, filename in LANGS:
        path = data_dir / filename
        if not path.exists():
            print(f"{code:<5} {name:<22} (missing: {filename})")
            continue
        total = 0
        with_root = 0
        radical_dist: Counter[int] = Counter()
        pos_total: Counter[str] = Counter()
        pos_with_root: Counter[str] = Counter()
        for rec in iter_records(path, code):
            total += 1
            pos_total[rec.pos] += 1
            if rec.root:
                with_root += 1
                assert rec.root_radicals is not None
                radical_dist[len(rec.root_radicals)] += 1
                pos_with_root[rec.pos] += 1

        pct = (with_root / total * 100) if total else 0.0
        dist_str = ", ".join(f"{k}r={v}" for k, v in sorted(radical_dist.items())) or "—"

        pos_parts: list[str] = []
        for pos_name, pos_count in pos_total.most_common(4):
            root_count = pos_with_root.get(pos_name, 0)
            pos_pct = (root_count / pos_count * 100) if pos_count else 0.0
            pos_parts.append(f"{pos_name or '?'}={pos_pct:.0f}%")
        pos_str = ", ".join(pos_parts)

        print(f"{code:<5} {name:<22} {total:>10,} {with_root:>10,} {pct:>8.1f}%  {dist_str:<20}  {pos_str}")

    print()
    print("Template names searched per language:")
    for code, _, _ in LANGS:
        names = sorted(ROOT_TEMPLATE_NAMES.get(code, frozenset()))
        print(f"  {code}: {', '.join(names) or '(none configured)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
