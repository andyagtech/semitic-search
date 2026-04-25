"""Evaluate the Arabic/Hebrew/Syriac morphology-aware extractor against the
gold root annotations we have.

Held-out accuracy informs whether it's safe to apply to un-rooted entries,
and tells us per-language where the rule set needs work.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.ar_he_morph import extract_root
from semitic_search.db import connect


def norm(s: str) -> str:
    return " ".join(s.replace("-", " ").split())


def main() -> int:
    db = connect(prefer="local")
    print(f"{'lang':<5} {'gold':>6} {'exact':>6} {'partial':>7} {'miss':>5}  {'sample misses'}")
    print("-" * 120)
    for lang in ("ar", "he", "syc", "arc", "aii"):
        rows = db.execute(
            "SELECT word, pos, root FROM entries WHERE lang = ? AND root IS NOT NULL LIMIT 2000",
            (lang,),
        )
        exact = partial = miss = 0
        misses: list[tuple[str, str, str, str]] = []
        for word, pos, gold in rows:
            pred, _ = extract_root(word, lang)
            if pred is None:
                miss += 1
                continue
            g = norm(gold)
            p = norm(pred)
            if p == g:
                exact += 1
            else:
                # partial: predicted contains gold's consonants in order
                g_cs = g.split()
                p_cs = p.split()
                if len(g_cs) >= 2 and len(p_cs) >= 2 and g_cs[:2] == p_cs[:2]:
                    partial += 1
                else:
                    miss += 1
                    misses.append((word, pos, gold, pred))
        total = len(rows)
        mis_sample = ", ".join(f"{w!r}→{p!r} (gold {g!r})" for w, _, g, p in misses[:3])
        print(f"{lang:<5} {total:>6} {exact:>6} {partial:>7} {miss:>5}  {mis_sample[:90]}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
