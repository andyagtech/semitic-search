"""Romanization → native script converters for search input.

Most users don't have Arabic/Hebrew/Syriac/Ethiopic keyboards installed. Letting
them type in a well-known romanization (Buckwalter for Arabic, SBL-style for
Hebrew) and converting on the fly is the fastest UX fix.

v0 scope:
- Buckwalter ↔ Arabic (bidirectional, lossless for unvocalized text)
- SBL-ish romanization → Hebrew (digraphs aware: 'sh' → שׁ, 'ts' → צ, etc.)
- Ethio-Semitic and Syriac: lean on the LLM for now; romanizations there are
  less standardized and the ask has sharply diminishing returns.

All converters are pure functions. No lookups, no network. Web UI will port
these to JS for instant feedback on the keyboard-selector view.
"""

from __future__ import annotations

import unicodedata

# ── Buckwalter ─────────────────────────────────────────────────────────────
# The de facto ASCII transliteration for Arabic in NLP. Each Arabic character
# maps to exactly one ASCII character, making it round-trip safe. Reference:
# https://en.wikipedia.org/wiki/Buckwalter_transliteration

BUCKWALTER_TO_ARABIC: dict[str, str] = {
    "'": "\u0621",  # ء hamza
    "|": "\u0622",  # آ alef with madda
    ">": "\u0623",  # أ alef with hamza above
    "&": "\u0624",  # ؤ waw with hamza
    "<": "\u0625",  # إ alef with hamza below
    "}": "\u0626",  # ئ yaa with hamza
    "A": "\u0627",  # ا alef
    "b": "\u0628",
    "p": "\u0629",  # ة taa marbuta
    "t": "\u062A",
    "v": "\u062B",  # ث thaa
    "j": "\u062C",  # ج jeem
    "H": "\u062D",  # ح
    "x": "\u062E",  # خ
    "d": "\u062F",
    "*": "\u0630",  # ذ thal
    "r": "\u0631",
    "z": "\u0632",
    "s": "\u0633",
    "$": "\u0634",  # ش sheen
    "S": "\u0635",  # ص
    "D": "\u0636",  # ض
    "T": "\u0637",  # ط
    "Z": "\u0638",  # ظ
    "E": "\u0639",  # ع ayn
    "g": "\u063A",  # غ ghayn
    "_": "\u0640",  # ـ tatweel (elongation)
    "f": "\u0641",
    "q": "\u0642",
    "k": "\u0643",
    "l": "\u0644",
    "m": "\u0645",
    "n": "\u0646",
    "h": "\u0647",
    "w": "\u0648",
    "Y": "\u0649",  # ى alef maqsura
    "y": "\u064A",
    "F": "\u064B",  # ً fathatan
    "N": "\u064C",  # ٌ dammatan
    "K": "\u064D",  # ٍ kasratan
    "a": "\u064E",  # َ fatha
    "u": "\u064F",  # ُ damma
    "i": "\u0650",  # ِ kasra
    "~": "\u0651",  # ّ shadda
    "o": "\u0652",  # ْ sukun
}

ARABIC_TO_BUCKWALTER: dict[str, str] = {v: k for k, v in BUCKWALTER_TO_ARABIC.items()}


def buckwalter_to_arabic(text: str) -> str:
    """Convert Buckwalter ASCII → Arabic. Unknown characters pass through unchanged."""
    return "".join(BUCKWALTER_TO_ARABIC.get(ch, ch) for ch in text)


def arabic_to_buckwalter(text: str) -> str:
    """Convert Arabic → Buckwalter ASCII. Non-Arabic characters pass through."""
    text = unicodedata.normalize("NFC", text)
    return "".join(ARABIC_TO_BUCKWALTER.get(ch, ch) for ch in text)


# ── SBL-ish Hebrew ─────────────────────────────────────────────────────────
# Loose SBL academic transliteration for Hebrew consonants. Digraphs come first
# (greedy-match on multi-char sequences). Final forms (כ→ך, מ→ם, נ→ן, פ→ף, צ→ץ)
# are applied as a post-processing step based on word position.

_HE_DIGRAPHS: list[tuple[str, str]] = [
    ("sh", "\u05E9\u05C1"),  # שׁ shin with dot
    ("SH", "\u05E9\u05C1"),
    ("Sh", "\u05E9\u05C1"),
    ("š", "\u05E9\u05C1"),
    ("ś", "\u05E9\u05C2"),  # שׂ sin with dot
    ("S", "\u05E9\u05C2"),
    ("ts", "\u05E6"),  # צ tsade (medial)
    ("tz", "\u05E6"),
    ("ṣ", "\u05E6"),
    ("ch", "\u05D7"),  # ח het
    ("ḥ", "\u05D7"),
    ("kh", "\u05DB"),  # כ kaf (non-dagesh)
    ("ṭ", "\u05D8"),  # ט tet
    ("ʿ", "\u05E2"),  # ע ayin
]

_HE_SINGLES: dict[str, str] = {
    "'": "\u05D0",  # א aleph
    "b": "\u05D1",
    "v": "\u05D1",
    "g": "\u05D2",
    "d": "\u05D3",
    "h": "\u05D4",
    "w": "\u05D5",  # explicit waw only — NOT 'u'/'o'
    "z": "\u05D6",
    "x": "\u05D7",
    "T": "\u05D8",
    "y": "\u05D9",  # explicit yod only — NOT 'i'/'e'
    "k": "\u05DB",
    "l": "\u05DC",
    "m": "\u05DE",
    "n": "\u05E0",
    "s": "\u05E1",
    "`": "\u05E2",
    "p": "\u05E4",
    "f": "\u05E4",
    "c": "\u05E6",
    "q": "\u05E7",
    "r": "\u05E8",
    "t": "\u05EA",
}

# Latin vowels are intentionally dropped so 'melek' → 'mlk' → מלך (consonantal
# skeleton). Users wanting explicit matres lectionis should type 'w' for waw
# and 'y' for yod.
_HE_DROPPED_CHARS: frozenset[str] = frozenset("aeiouAEIOU")

_HE_FINALS: dict[str, str] = {
    "\u05DB": "\u05DA",  # כ → ך kaf
    "\u05DE": "\u05DD",  # מ → ם mem
    "\u05E0": "\u05DF",  # נ → ן nun
    "\u05E4": "\u05E3",  # פ → ף peh
    "\u05E6": "\u05E5",  # צ → ץ tsade
}


def _apply_hebrew_finals(text: str) -> str:
    """Replace medial forms with final forms at word boundaries."""
    if not text:
        return text
    out = list(text)
    for i, ch in enumerate(out):
        is_last_in_word = (i == len(out) - 1) or out[i + 1].isspace()
        if is_last_in_word and ch in _HE_FINALS:
            out[i] = _HE_FINALS[ch]
    return "".join(out)


def romanized_to_hebrew(text: str) -> str:
    """Convert a loose SBL-ish romanization → Hebrew consonants.

    Digraphs like 'sh', 'ts', 'kh' are recognized. Final forms applied
    automatically. No niqqud produced — v0 focuses on consonantal skeleton
    (which is what the root-search path needs anyway).
    """
    i = 0
    out: list[str] = []
    while i < len(text):
        matched = False
        for src, dst in _HE_DIGRAPHS:
            if text.startswith(src, i):
                out.append(dst)
                i += len(src)
                matched = True
                break
        if matched:
            continue
        ch = text[i]
        i += 1
        if ch in _HE_DROPPED_CHARS:
            continue
        out.append(_HE_SINGLES.get(ch, ch))
    return _apply_hebrew_finals("".join(out))


# ── Public dispatch ────────────────────────────────────────────────────────

SUPPORTED_SCHEMES = {"buckwalter", "sbl-he", "phonetic-he"}


def to_native(text: str, *, scheme: str) -> str:
    """Dispatch romanization → native script by scheme name."""
    s = scheme.lower()
    if s == "buckwalter":
        return buckwalter_to_arabic(text)
    if s in ("sbl-he", "phonetic-he"):
        return romanized_to_hebrew(text)
    raise ValueError(f"Unknown romanization scheme: {scheme}. Supported: {sorted(SUPPORTED_SCHEMES)}")


def looks_like_latin(text: str) -> bool:
    """Quick heuristic: does this string look like it was typed on a Latin keyboard?"""
    has_any_letter = False
    for ch in text:
        if ch.isspace() or ch in "-_.'`~<>":
            continue
        if ch.isalpha():
            has_any_letter = True
            # Any non-ASCII letter disqualifies as pure-Latin input
            if ord(ch) > 127:
                return False
    return has_any_letter
