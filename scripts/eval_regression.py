"""Regression harness for the canonical + fuzzy cognate index.

Bundles:
  1. Recall on 174 editor-curated cognate claims (wraps eval_cognate_claims).
  2. Precision probes — hand-curated root pairs that must NOT fuzzy-match.
  3. Reconstruction-engine spot tests — famous cognate sets must infer the
     expected Proto-Semitic root.

Exits non-zero if any metric regresses below its floor. Floors are set to
current v3 baseline with a small safety margin so the harness catches
regressions without flapping on normal scorer noise.

Run: `uv run python scripts/eval_regression.py`
     `uv run python scripts/eval_regression.py --json report.json`
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.canonical_root import canonical
from semitic_search.db import connect
from semitic_search.fuzzy_canonical import fuzzy_match
from semitic_search.reconstruct import reconstruct


# --- Thresholds (set from v3 baseline; bump up after data improvements) ----

FLOORS = {
    "recall_strict": 0.40,   # current 0.42
    "recall_fuzzy":  0.60,   # current 0.64
    "precision":     0.95,   # <5% fuzzy false positives acceptable
    "reconstruction_pass": 1.0,  # all spot tests must pass
}


# --- 1. Recall on editor cognate claims -------------------------------------

def eval_recall(db) -> dict:
    claims = [c for c in db.execute(
        """SELECT id, source_lang, source_word, source_etym_num,
                  claimed_lang, claimed_root FROM cognate_claims"""
    ) if c[4] != "ine-pro"]

    strict, fuzzy = 0, 0
    for _cid, src_lang, src_word, src_etym, _clm_lang, clm_root in claims:
        row = db.execute(
            """SELECT COALESCE(NULLIF(root,''), root_inferred) AS r
                 FROM entries WHERE lang=? AND word=?
                  AND (? IS NULL OR etymology_number IS ? OR etymology_number = ?)
                LIMIT 1""",
            (src_lang, src_word, src_etym, src_etym, src_etym),
        )
        src_root = row[0][0] if row else None
        if not src_root:
            continue
        src_c = canonical(src_root)
        clm_c = canonical(clm_root)
        if not src_c or not clm_c:
            continue
        if src_c == clm_c:
            strict += 1
            fuzzy += 1
        elif fuzzy_match(src_c, clm_c):
            fuzzy += 1

    return {
        "total": len(claims),
        "strict": strict,
        "fuzzy":  fuzzy,
        "recall_strict": strict / max(len(claims), 1),
        "recall_fuzzy":  fuzzy  / max(len(claims), 1),
    }


# --- 2. Precision probes (must NOT match) -----------------------------------

# Hand-curated pairs of CANONICAL keys that are not cognate. If the fuzzy
# matcher claims they are, precision has dropped. Extend this list as you
# discover false-positive classes in the wild.
NEGATIVE_PAIRS: list[tuple[str, str, str]] = [
    # (a, b, reason)
    ("k t b", "q t b",  "k ≠ q; classic minimal pair"),
    ("k t b", "g t b",  "k ≠ g"),
    ("k t b", "k t l",  "b ≠ l, different root (write vs kill)"),
    ("m l k", "n l k",  "m ≠ n"),
    ("m l k", "m l ḥ",  "k ≠ ḥ"),
    ("ḥ b b", "b b b",  "different initial"),
    ("q t l", "k t l",  "q ≠ k"),
    ("s l m", "s l n",  "m ≠ n"),
    ("r ʾ s", "r ʿ s",  "ʾ ≠ ʿ (glottal vs pharyngeal)"),
    ("b y t", "k y t",  "b ≠ k"),
    ("ḍ r b", "ġ r b",  "ḍ ≠ ġ"),  # ʿ/ġ share via fuzzy; ḍ does not
    ("q r b", "g r b",  "q ≠ g"),
    ("ʾ k l", "ʿ k l",  "ʾ ≠ ʿ"),
    # (f/p IS a legitimate merger: Heb פתח ↔ Ar فتح 'open' from PS *p)
]


def eval_precision() -> dict:
    details = []
    false_positives = 0
    for a, b, reason in NEGATIVE_PAIRS:
        hit = fuzzy_match(a, b)
        if hit:
            false_positives += 1
            details.append({"a": a, "b": b, "reason": reason, "matched": True})
        else:
            details.append({"a": a, "b": b, "reason": reason, "matched": False})
    total = len(NEGATIVE_PAIRS)
    return {
        "negative_pairs": total,
        "false_positives": false_positives,
        "precision": 1.0 - false_positives / max(total, 1),
        "details": details,
    }


# --- 3. Reconstruction spot tests -------------------------------------------

RECONSTRUCTION_CASES: list[tuple[str, list[tuple[str, str]], str, float]] = [
    # (label, cognates, expected_ps_root, min_confidence)
    ("gold",   [("ar", "ذ ه ب"), ("he", "ז ה ב"), ("syc", "ܕ ܗ ܒ")],
     "Ḏ H B", 0.9),
    ("three",  [("ar", "ث ل ث"), ("he", "ש ל ש"), ("syc", "ܬ ܠ ܬ"), ("akk", "š l š")],
     "Ṯ L Ṯ", 0.7),
    ("dog",    [("ar", "ك ل ب"), ("he", "כ ל ב"), ("syc", "ܟ ܠ ܒ"), ("akk", "k l b")],
     "K L B", 0.9),
    ("earth",  [("ar", "ء ر ض"), ("he", "א ר ץ"), ("syc", "ܐ ܪ ܥ")],
     "ʾ R Ḍ", 0.9),
]


def eval_reconstruction() -> dict:
    passed, total = 0, len(RECONSTRUCTION_CASES)
    details = []
    for label, cognates, expected, min_conf in RECONSTRUCTION_CASES:
        r = reconstruct(cognates)
        ok = r.ps_root == expected and r.overall_confidence >= min_conf
        if ok:
            passed += 1
        details.append({
            "label": label, "expected": expected, "got": r.ps_root,
            "confidence": r.overall_confidence, "passed": ok,
        })
    return {
        "reconstruction_cases": total,
        "reconstruction_passed": passed,
        "reconstruction_pass": passed / max(total, 1),
        "details": details,
    }


# --- Orchestrator -----------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", help="Write full report to this JSON path.")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    db = connect(prefer="local")
    try:
        recall = eval_recall(db)
    finally:
        db.close()

    precision = eval_precision()
    reconstruction = eval_reconstruction()

    report = {
        "recall": recall,
        "precision": precision,
        "reconstruction": reconstruction,
        "floors": FLOORS,
    }

    # Determine pass/fail
    failures: list[str] = []
    if recall["recall_strict"] < FLOORS["recall_strict"]:
        failures.append(f"recall_strict {recall['recall_strict']:.2%} < floor {FLOORS['recall_strict']:.2%}")
    if recall["recall_fuzzy"] < FLOORS["recall_fuzzy"]:
        failures.append(f"recall_fuzzy {recall['recall_fuzzy']:.2%} < floor {FLOORS['recall_fuzzy']:.2%}")
    if precision["precision"] < FLOORS["precision"]:
        failures.append(f"precision {precision['precision']:.2%} < floor {FLOORS['precision']:.2%}")
    if reconstruction["reconstruction_pass"] < FLOORS["reconstruction_pass"]:
        failures.append(f"reconstruction {reconstruction['reconstruction_pass']:.2%} < floor {FLOORS['reconstruction_pass']:.2%}")

    if not args.quiet:
        print(f"\n--- Regression harness report ---")
        print(f"Recall (strict):   {recall['recall_strict']:.2%}  ({recall['strict']}/{recall['total']})   floor {FLOORS['recall_strict']:.2%}")
        print(f"Recall (fuzzy):    {recall['recall_fuzzy']:.2%}  ({recall['fuzzy']}/{recall['total']})   floor {FLOORS['recall_fuzzy']:.2%}")
        print(f"Precision (neg):   {precision['precision']:.2%}  ({precision['negative_pairs'] - precision['false_positives']}/{precision['negative_pairs']})   floor {FLOORS['precision']:.2%}")
        print(f"Reconstruction:    {reconstruction['reconstruction_pass']:.0%}  ({reconstruction['reconstruction_passed']}/{reconstruction['reconstruction_cases']})   floor {FLOORS['reconstruction_pass']:.0%}")
        if precision["false_positives"]:
            print(f"\nFalse positives in precision probes:")
            for d in precision["details"]:
                if d["matched"]:
                    print(f"  {d['a']} ↔ {d['b']}  — {d['reason']}")
        if failures:
            print(f"\n❌ REGRESSION — {len(failures)} failure(s):")
            for f in failures:
                print(f"  {f}")
        else:
            print(f"\n✓ All thresholds pass.")

    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2))
        print(f"\nWrote {args.json}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
