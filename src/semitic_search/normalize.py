"""Script normalization helpers shared by ingest + search paths."""

from __future__ import annotations

import unicodedata

ARABIC_DIACRITICS = frozenset(
    chr(c) for c in (
        # Tanwin
        0x064B, 0x064C, 0x064D,
        # Fatha, damma, kasra
        0x064E, 0x064F, 0x0650,
        # Shadda, sukun
        0x0651, 0x0652,
        # Dagger alif, small fatha, alef wasla variants
        0x0670, 0x0656, 0x0657, 0x0658,
    )
)

HEBREW_NIQQUD = frozenset(chr(c) for c in range(0x05B0, 0x05C8))  # niqqud + cantillation
HEBREW_CANTILLATION = frozenset(chr(c) for c in range(0x0591, 0x05AF))

SYRIAC_DIACRITICS = frozenset(chr(c) for c in range(0x0730, 0x074B))  # Syriac points

ETHIOPIC_COMBINING = frozenset()  # Ge'ez syllabary is precomposed; no separate combining diacritics in common use


def strip_diacritics(text: str, script_hint: str | None = None) -> str:
    """Strip script-specific diacritics/pointing. NFC-normalize first."""
    text = unicodedata.normalize("NFC", text)
    out = []
    for ch in text:
        if ch in ARABIC_DIACRITICS:
            continue
        if ch in HEBREW_NIQQUD or ch in HEBREW_CANTILLATION:
            continue
        if ch in SYRIAC_DIACRITICS:
            continue
        out.append(ch)
    return "".join(out)


def detect_script(text: str) -> str:
    """Return a coarse script label for the first strong letter: arabic, hebrew, syriac, ethiopic, latin, other."""
    for ch in text:
        cp = ord(ch)
        if 0x0600 <= cp <= 0x06FF or 0x0750 <= cp <= 0x077F or 0xFB50 <= cp <= 0xFDFF or 0xFE70 <= cp <= 0xFEFF:
            return "arabic"
        if 0x0590 <= cp <= 0x05FF or 0xFB1D <= cp <= 0xFB4F:
            return "hebrew"
        if 0x0700 <= cp <= 0x074F:
            return "syriac"
        if 0x1200 <= cp <= 0x137F or 0x1380 <= cp <= 0x139F or 0x2D80 <= cp <= 0x2DDF:
            return "ethiopic"
        if ch.isalpha():
            return "latin"
    return "other"
