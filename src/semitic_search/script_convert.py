"""Bidirectional converter between Hebrew and Syriac scripts.

The Aramaic language family spans ~2,500 years and uses either script
depending on community: Eastern Aramaic (Syriac Christian, Mandaean) is
written in Syriac script; Western Aramaic (Biblical, Targumic, Jewish
Palestinian) is written in Hebrew square script; Imperial Aramaic (arc)
Kaikki entries come to us in Hebrew script.

For UI display we let the user pick their preferred script. Both scripts
are pure consonantal abjads with a one-to-one letter mapping — 22 letters
in Hebrew, 22 consonants in Syriac. Vowel points don't map; this converter
only handles base consonants.

Pure data. No dependencies.
"""

from __future__ import annotations

# Hebrew → Syriac (base consonants, including Hebrew final forms)
HEBREW_TO_SYRIAC: dict[str, str] = {
    "\u05d0": "\u0710",  # א → ܐ aleph
    "\u05d1": "\u0712",  # ב → ܒ beth
    "\u05d2": "\u0713",  # ג → ܓ gimel
    "\u05d3": "\u0715",  # ד → ܕ dalath
    "\u05d4": "\u0717",  # ה → ܗ he
    "\u05d5": "\u0718",  # ו → ܘ waw
    "\u05d6": "\u0719",  # ז → ܙ zain
    "\u05d7": "\u071a",  # ח → ܚ heth
    "\u05d8": "\u071b",  # ט → ܛ teth
    "\u05d9": "\u071d",  # י → ܝ yudh
    "\u05da": "\u071f",  # ך (final kaph) → ܟ
    "\u05db": "\u071f",  # כ → ܟ kaph
    "\u05dc": "\u0720",  # ל → ܠ lamadh
    "\u05dd": "\u0721",  # ם (final mem) → ܡ
    "\u05de": "\u0721",  # מ → ܡ mim
    "\u05df": "\u0722",  # ן (final nun) → ܢ
    "\u05e0": "\u0722",  # נ → ܢ nun
    "\u05e1": "\u0723",  # ס → ܣ semkath
    "\u05e2": "\u0725",  # ע → ܥ ʿe
    "\u05e3": "\u0726",  # ף (final pe) → ܦ
    "\u05e4": "\u0726",  # פ → ܦ pe
    "\u05e5": "\u0728",  # ץ (final tsadhi) → ܨ
    "\u05e6": "\u0728",  # צ → ܨ tsadhi
    "\u05e7": "\u0729",  # ק → ܩ qaph
    "\u05e8": "\u072a",  # ר → ܪ rish
    "\u05e9": "\u072b",  # ש → ܫ shin
    "\u05ea": "\u072c",  # ת → ܬ taw
}

# Syriac → Hebrew (reverse map — straightforward since no many-to-one in the
# forward direction at the base-consonant level, except the finals which we
# collapse onto the non-final Hebrew form when going back).
SYRIAC_TO_HEBREW: dict[str, str] = {
    "\u0710": "\u05d0",  # ܐ → א
    "\u0712": "\u05d1",  # ܒ → ב
    "\u0713": "\u05d2",  # ܓ → ג
    "\u0714": "\u05d2",  # ܔ → ג (hamza-like gimel variant, collapse)
    "\u0715": "\u05d3",  # ܕ → ד
    "\u0716": "\u05d3",  # ܖ → ד (dotless dalath, collapse)
    "\u0717": "\u05d4",  # ܗ → ה
    "\u0718": "\u05d5",  # ܘ → ו
    "\u0719": "\u05d6",  # ܙ → ז
    "\u071a": "\u05d7",  # ܚ → ח
    "\u071b": "\u05d8",  # ܛ → ט
    "\u071c": "\u05d8",  # ܜ → ט
    "\u071d": "\u05d9",  # ܝ → י
    "\u071e": "\u05d9",  # ܞ → י
    "\u071f": "\u05db",  # ܟ → כ
    "\u0720": "\u05dc",  # ܠ → ל
    "\u0721": "\u05de",  # ܡ → מ
    "\u0722": "\u05e0",  # ܢ → נ
    "\u0723": "\u05e1",  # ܣ → ס
    "\u0724": "\u05e1",  # ܤ → ס (final semkath)
    "\u0725": "\u05e2",  # ܥ → ע
    "\u0726": "\u05e4",  # ܦ → פ
    "\u0727": "\u05e4",  # ܧ → פ (reversed pe)
    "\u0728": "\u05e6",  # ܨ → צ
    "\u0729": "\u05e7",  # ܩ → ק
    "\u072a": "\u05e8",  # ܪ → ר
    "\u072b": "\u05e9",  # ܫ → ש
    "\u072c": "\u05ea",  # ܬ → ת
    "\u072d": "\u05d1",  # ܭ → ב (Persian beth, collapse)
    "\u072e": "\u05d2",  # ܮ → ג
    "\u072f": "\u05d3",  # ܯ → ד
}


def hebrew_to_syriac(text: str) -> str:
    return "".join(HEBREW_TO_SYRIAC.get(ch, ch) for ch in text)


def syriac_to_hebrew(text: str) -> str:
    return "".join(SYRIAC_TO_HEBREW.get(ch, ch) for ch in text)


def detect_hebrew_or_syriac(text: str) -> str | None:
    """Return 'hebrew' / 'syriac' / None based on the first strong letter."""
    for ch in text:
        cp = ord(ch)
        if 0x0590 <= cp <= 0x05ff:
            return "hebrew"
        if 0x0700 <= cp <= 0x074f:
            return "syriac"
    return None
