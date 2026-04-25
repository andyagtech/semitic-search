"""Rule-based root extraction for consonantal-alphabet scripts.

Ugaritic, Phoenician, and Ancient South Arabian all use scripts where
each codepoint IS a single consonant — no vowels, no syllabaries. Extracting
a root is therefore just: read the consonants, strip word dividers.

This module exposes one `extract_root(word, script)` function that dispatches
by script and returns a canonical space-separated root string. Useful for
back-filling Ugaritic / Phoenician / Sabaean entries from Kaikki or scraped
Wiktionary dumps.
"""

from __future__ import annotations

# Ugaritic: U+10380–1039D (30 letters, ʾ through ṣ), U+1039F word divider.
_UG_MIN = 0x10380
_UG_MAX = 0x1039D
_UG_WORD_DIVIDER = 0x1039F

# Phoenician: U+10900–10915 (22 letters), U+10916–10919 numerals, U+1091F word separator
_PHN_MIN = 0x10900
_PHN_MAX = 0x10915
_PHN_WORD_SEP = 0x1091F

# Old South Arabian / Sabaean / Hadramautic: U+10A60–10A7C (27 letters), U+10A7D/E numerals, U+10A7F word separator
_OSA_MIN = 0x10A60
_OSA_MAX = 0x10A7C
_OSA_WORD_SEP = 0x10A7F

# Mandaic: U+0840–0854 (20 consonants), U+0855–085F marks + punctuation
_MANDAIC_MIN = 0x0840
_MANDAIC_MAX = 0x0854
_MANDAIC_MARKS: set[int] = set(range(0x0855, 0x085C))


def _extract(text: str, lo: int, hi: int, dividers: set[int]) -> list[str]:
    out: list[str] = []
    for ch in text:
        cp = ord(ch)
        if cp in dividers:
            continue
        if lo <= cp <= hi:
            out.append(ch)
    return out


def extract_ugaritic(text: str) -> list[str]:
    return _extract(text, _UG_MIN, _UG_MAX, {_UG_WORD_DIVIDER})


def extract_phoenician(text: str) -> list[str]:
    return _extract(text, _PHN_MIN, _PHN_MAX, {_PHN_WORD_SEP})


def extract_osa(text: str) -> list[str]:
    return _extract(text, _OSA_MIN, _OSA_MAX, {_OSA_WORD_SEP})


def extract_mandaic(text: str) -> list[str]:
    return _extract(text, _MANDAIC_MIN, _MANDAIC_MAX, _MANDAIC_MARKS)


SCRIPT_EXTRACTORS = {
    "ug": extract_ugaritic,
    "phn": extract_phoenician,
    "sab": extract_osa,
    "osa": extract_osa,
    "xsa": extract_osa,  # Hadramautic / generic OSA
    "pun": extract_phoenician,  # Punic uses Phoenician script for its Punic-script entries
    "mid": extract_mandaic,  # Classical Mandaic
}


def extract_root(text: str, lang: str, *, expected_length: int | None = 3) -> str | None:
    """Extract a consonantal root from a Ugaritic / Phoenician / Sabaean word.

    Returns the first `expected_length` consonants as a canonical space-
    separated string. Returns None if the word doesn't contain enough
    consonants in the target script.
    """
    extractor = SCRIPT_EXTRACTORS.get(lang)
    if extractor is None:
        return None
    cs = extractor(text)
    if not cs:
        return None
    if expected_length is not None:
        if len(cs) < expected_length:
            # biliteral or truncated — return what we have, up to 2
            if len(cs) == 2:
                return " ".join(cs)
            return None
        cs = cs[:expected_length]
    return " ".join(cs)
