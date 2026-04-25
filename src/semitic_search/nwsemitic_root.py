"""Consonantal-skeleton extractor for Northwest Semitic abjads.

Applies to entries written in Hebrew square script or Syriac script where
the word IS the consonantal skeleton (no syllabary, no vowel pointing in
the stored `word` field). Used for Imperial Aramaic (arc) and as a backstop
for any Hebrew/Aramaic/Syriac entries lacking a gold root template.

The only real subtlety is matres lectionis: ה / ו / י in Hebrew script and
ܐ / ܗ / ܘ / ܝ in Syriac can be either consonants or vowel-markers. For
citation verb forms (the most common Wiktionary headword), they're usually
consonantal — so we keep them.

For quadriliteral and biliteral roots, we return the exact consonant count.
"""

from __future__ import annotations

_HEBREW_LETTERS = set(range(0x05D0, 0x05EB))  # א through ת (including finals)
# Map final forms to their non-final counterpart so the stored root is stable.
_HEBREW_FINAL_TO_MEDIAL: dict[str, str] = {
    "\u05DA": "\u05DB",  # ך → כ
    "\u05DD": "\u05DE",  # ם → מ
    "\u05DF": "\u05E0",  # ן → נ
    "\u05E3": "\u05E4",  # ף → פ
    "\u05E5": "\u05E6",  # ץ → צ
}
_SYRIAC_LETTERS = set(range(0x0710, 0x072D))  # ܐ through ܬ


def extract_hebrew_script_consonants(text: str) -> list[str]:
    out: list[str] = []
    for ch in text:
        cp = ord(ch)
        if cp in _HEBREW_LETTERS:
            out.append(_HEBREW_FINAL_TO_MEDIAL.get(ch, ch))
    return out


def extract_syriac_script_consonants(text: str) -> list[str]:
    return [ch for ch in text if ord(ch) in _SYRIAC_LETTERS]


def extract_root(text: str, *, expected_length: int | None = 3) -> str | None:
    """Return a canonical space-separated root, auto-detecting Hebrew or Syriac."""
    cs = extract_hebrew_script_consonants(text)
    if not cs:
        cs = extract_syriac_script_consonants(text)
    if not cs:
        return None
    if expected_length is not None:
        if len(cs) < 2:
            return None
        if len(cs) >= expected_length:
            cs = cs[:expected_length]
    return " ".join(cs)
