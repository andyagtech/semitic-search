"""Rule-based root backfill for Ugaritic + Latin-transliterated Akkadian.

Ugaritic: the cuneiform alphabet is purely consonantal — just apply the
mechanical extractor.

Akkadian: Wiktionary entries are split between cuneiform logograms (not
usable) and Latin transliterations (kalbu, šaṭāru, …). For the Latin forms
we strip vowels + diacritics and take the first 3 consonants. This is
crude but captures the root in ~70%+ of canonical lemma forms.

No LLM calls. Safe to re-run — UPDATE semantics.
"""

from __future__ import annotations

import argparse
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.consonantal_root import extract_root as extract_consonantal_root
from semitic_search.db import connect

AKK_VOWELS = set("aeiouāēīōūăĕĭŏŭ")


def _strip_latin_diacritics(s: str) -> str:
    """NFD → drop combining marks. Keeps the base letter (e.g. ā → a, š → s)."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def akkadian_root(word: str) -> tuple[str | None, str]:
    """Heuristic Akkadian root from a Latin-transliterated headword.

    Strips macrons/underdots, drops vowels, takes the first 3 remaining chars.
    Returns (root, confidence). `low` for anything < 3 consonants, `high`
    for exactly 3 clean consonants.
    """
    if not word or not word[0].isalpha():
        return None, ""
    # Akkadian headwords are all Latin-range except for the occasional šṭḫ etc.
    # (which we keep via the base letter after NFD).
    cs: list[str] = []
    for ch in word.lower():
        if ch == " " or ch == "-":
            continue
        base = _strip_latin_diacritics(ch)
        if len(base) != 1 or not base.isalpha():
            continue
        if base in AKK_VOWELS:
            continue
        cs.append(base)
    if len(cs) < 2:
        return None, ""
    if len(cs) == 2:
        return " ".join(cs), "low"
    if len(cs) >= 3:
        return " ".join(cs[:3]), ("high" if len(cs) == 3 else "medium")
    return None, ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}\n")

    # --- Ugaritic ---
    ug_rows = db.execute(
        "SELECT id, word, pos FROM entries WHERE lang = 'ug' AND root IS NULL AND root_inferred IS NULL",
    )
    ug_updates: list[tuple] = []
    for row in ug_rows:
        entry_id, word, pos = row
        root = extract_consonantal_root(word, "ug", expected_length=3)
        if root is None:
            continue
        conf = "high" if len(root.split()) == 3 else "low"
        ug_updates.append((root, conf, "consonantal_mechanical", entry_id))

    if ug_updates:
        for i in range(0, len(ug_updates), 500):
            db.executemany(
                "UPDATE entries SET root_inferred = ?, root_inferred_confidence = ?, "
                "root_inferred_source = ? WHERE id = ?",
                ug_updates[i : i + 500],
            )
            db.commit()
    print(f"Ugaritic: {len(ug_updates)} roots inferred from {len(ug_rows)} candidates")

    # --- Akkadian (Latin transliteration only) ---
    akk_rows = db.execute(
        "SELECT id, word, pos FROM entries WHERE lang = 'akk' AND root IS NULL AND root_inferred IS NULL",
    )
    akk_updates: list[tuple] = []
    akk_skipped_cuneiform = 0
    for row in akk_rows:
        entry_id, word, pos = row
        if not word:
            continue
        # Skip cuneiform — first codepoint in the Cuneiform block is U+12000
        if ord(word[0]) >= 0x12000:
            akk_skipped_cuneiform += 1
            continue
        root, conf = akkadian_root(word)
        if root is None:
            continue
        akk_updates.append((root, conf, "akk_vowel_strip", entry_id))

    if akk_updates:
        for i in range(0, len(akk_updates), 500):
            db.executemany(
                "UPDATE entries SET root_inferred = ?, root_inferred_confidence = ?, "
                "root_inferred_source = ? WHERE id = ?",
                akk_updates[i : i + 500],
            )
            db.commit()
    print(
        f"Akkadian: {len(akk_updates)} roots inferred from {len(akk_rows)} candidates "
        f"({akk_skipped_cuneiform} cuneiform entries skipped)"
    )

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
