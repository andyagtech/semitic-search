"""Map a script-specific root (ك ت ب, כ ת ב, ܟ ܬ ܒ, ከ ተ በ, 𐤊 𐤕 𐤁, …) to a
canonical phonetic key so polyglot roots can be grouped.

The key is a space-separated Semitistic transliteration of each consonant.
Where scripts distinguish phonemes that others merge (Hebrew ש covers *š/*ś/*θ
but Arabic distinguishes ش, س, ث), we map to the most common proto-segment
and tolerate collisions. This is NOT a Proto-Semitic reconstruction — just a
hash function for finding cognate families.
"""

from __future__ import annotations

# --- Arabic ---
_AR: dict[str, str] = {
    "ا": "ʾ", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "g",
    "ح": "ḥ", "خ": "ḫ", "د": "d", "ذ": "ḏ", "ر": "r",
    "ز": "z", "س": "s", "ش": "š", "ص": "ṣ", "ض": "ḍ",
    "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "ġ", "ف": "f",
    "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "و": "w", "ي": "y", "ء": "ʾ",
    "أ": "ʾ", "إ": "ʾ", "آ": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
    "ى": "y", "ة": "h",
}

# --- Hebrew / Aramaic (square script) ---
_HE: dict[str, str] = {
    "א": "ʾ", "ב": "b", "ג": "g", "ד": "d", "ה": "h",
    "ו": "w", "ז": "z", "ח": "ḥ", "ט": "ṭ", "י": "y",
    "כ": "k", "ך": "k", "ל": "l", "מ": "m", "ם": "m",
    "נ": "n", "ן": "n", "ס": "s", "ע": "ʿ", "פ": "f",
    "ף": "f", "צ": "ṣ", "ץ": "ṣ", "ק": "q", "ר": "r",
    "ש": "š", "ת": "t",
    "שׂ": "ś", "שׁ": "š",
}

# --- Syriac ---
_SYC: dict[str, str] = {
    "ܐ": "ʾ", "ܒ": "b", "ܓ": "g", "ܕ": "d", "ܗ": "h",
    "ܘ": "w", "ܙ": "z", "ܚ": "ḥ", "ܛ": "ṭ", "ܝ": "y",
    "ܟ": "k", "ܠ": "l", "ܡ": "m", "ܢ": "n", "ܣ": "s",
    "ܥ": "ʿ", "ܦ": "f", "ܨ": "ṣ", "ܩ": "q", "ܪ": "r",
    "ܫ": "š", "ܬ": "t",
}

# --- Ugaritic (U+10380–1039D) ---
_UG: dict[str, str] = {
    "\U00010380": "ʾ", "\U00010381": "b", "\U00010382": "g",
    "\U00010383": "ḫ", "\U00010384": "d", "\U00010385": "h",
    "\U00010386": "w", "\U00010387": "z", "\U00010388": "ḥ",
    "\U00010389": "ṭ", "\U0001038A": "y", "\U0001038B": "k",
    "\U0001038C": "š", "\U0001038D": "l", "\U0001038E": "m",
    "\U0001038F": "ḏ", "\U00010390": "n", "\U00010391": "ẓ",
    "\U00010392": "s", "\U00010393": "ʿ", "\U00010394": "p",
    "\U00010395": "ṣ", "\U00010396": "q", "\U00010397": "r",
    "\U00010398": "ṯ", "\U00010399": "ġ", "\U0001039A": "t",
    "\U0001039B": "ʾ", "\U0001039C": "ṡ", "\U0001039D": "s",
}

# --- Phoenician (U+10900–10915) ---
_PHN: dict[str, str] = {
    "\U00010900": "ʾ", "\U00010901": "b", "\U00010902": "g",
    "\U00010903": "d", "\U00010904": "h", "\U00010905": "w",
    "\U00010906": "z", "\U00010907": "ḥ", "\U00010908": "ṭ",
    "\U00010909": "y", "\U0001090A": "k", "\U0001090B": "l",
    "\U0001090C": "m", "\U0001090D": "n", "\U0001090E": "s",
    "\U0001090F": "ʿ", "\U00010910": "p", "\U00010911": "ṣ",
    "\U00010912": "q", "\U00010913": "r", "\U00010914": "š",
    "\U00010915": "t",
}

# --- Old South Arabian / Sabaean (U+10A60–10A7C) ---
# The OSA alphabet is organized by speech-community order, not Hebrew-style abc.
_OSA: dict[str, str] = {
    "\U00010A60": "h", "\U00010A61": "l", "\U00010A62": "ḥ",
    "\U00010A63": "m", "\U00010A64": "q", "\U00010A65": "w",
    "\U00010A66": "š", "\U00010A67": "r", "\U00010A68": "b",
    "\U00010A69": "t", "\U00010A6A": "s", "\U00010A6B": "k",
    "\U00010A6C": "n", "\U00010A6D": "ḫ", "\U00010A6E": "ṣ",
    "\U00010A6F": "ś", "\U00010A70": "f", "\U00010A71": "ʾ",
    "\U00010A72": "ʿ", "\U00010A73": "ḍ", "\U00010A74": "g",
    "\U00010A75": "d", "\U00010A76": "ġ", "\U00010A77": "ṭ",
    "\U00010A78": "z", "\U00010A79": "ḏ", "\U00010A7A": "y",
    "\U00010A7B": "ṯ", "\U00010A7C": "ẓ",
}

# --- Ethiopic (map each Fidel first-form char to consonant) ---
_GEZ_ROWS: list[tuple[int, str]] = [
    (0x1200, "h"), (0x1208, "l"), (0x1210, "ḥ"), (0x1218, "m"),
    (0x1220, "ś"), (0x1228, "r"), (0x1230, "s"), (0x1238, "š"),
    (0x1240, "q"), (0x1248, "q"), (0x1250, "q"), (0x1258, "q"),
    (0x1260, "b"), (0x1268, "v"), (0x1270, "t"), (0x1278, "č"),
    (0x1280, "ḫ"), (0x1288, "ḫ"), (0x1290, "n"), (0x1298, "ñ"),
    (0x12A0, "ʾ"), (0x12A8, "k"), (0x12B0, "k"), (0x12B8, "h"),
    (0x12C0, "h"), (0x12C8, "w"), (0x12D0, "ʿ"), (0x12D8, "z"),
    (0x12E0, "ž"), (0x12E8, "y"), (0x12F0, "d"), (0x12F8, "ḍ"),
    (0x1300, "j"), (0x1308, "g"), (0x1310, "g"), (0x1320, "ṭ"),
    (0x1328, "č̣"), (0x1330, "p"), (0x1338, "ṣ"), (0x1340, "ṣ"),
    (0x1348, "f"), (0x1350, "p"),
]
_GEZ: dict[int, str] = {}
for _s, _c in _GEZ_ROWS:
    for _i in range(8):
        _GEZ[_s + _i] = _c

# --- Latin transliteration (Akkadian + any romanized) ---
_LATIN: dict[str, str] = {
    # base letters map to themselves (lowercased); diacritics get stripped below
    **{c: c for c in "bdfghjklmnpqrstvwyz"},
    # emphatics etc. already canonical in our Latin transcription
}


# --- Mandaic (U+0840–0854) ---
_MANDAIC: dict[str, str] = {
    "\u0840": "h", "\u0841": "b", "\u0842": "g", "\u0843": "d",
    "\u0844": "h", "\u0845": "w", "\u0846": "z", "\u0847": "ṭ",
    "\u0848": "ṭ", "\u0849": "k", "\u084A": "l", "\u084B": "m",
    "\u084C": "n", "\u084D": "s", "\u084E": "ʿ", "\u084F": "p",
    "\u0850": "ṣ", "\u0851": "q", "\u0852": "r", "\u0853": "š",
    "\u0854": "t",
}


def _char_to_phoneme(ch: str) -> str | None:
    cp = ord(ch)
    # CAMeL Tools' weak-root placeholder. Anything matching via resolve_hollow_roots
    # should already be a real consonant, but leave this as a safety net so roots
    # with '#' don't group with entirely unrelated 2-consonant shapes.
    if ch == "#":
        return "w"  # hollow roots default to waw in transliteration
    # IPA-style glottal/pharyngeal that the LLM backfill occasionally emits.
    # Fold to our Semitistic transliteration so they group with roots that
    # used the standard ʾ / ʿ. Apostrophe is a common LLM output for hamza.
    if ch in ("ʔ", "'", "’"):
        return "ʾ"
    if ch == "ʕ":
        return "ʿ"
    # Imperial Aramaic block (U+10840–10855) — consonantal abjad.
    if 0x10840 <= cp <= 0x10855:
        IMP_ARAMAIC = [
            "ʾ", "b", "g", "d", "h", "w", "z", "ḥ", "ṭ", "y",
            "k", "l", "m", "n", "s", "ʿ", "p", "ṣ", "q", "r",
            "š", "t",
        ]
        idx = cp - 0x10840
        if idx < len(IMP_ARAMAIC):
            return IMP_ARAMAIC[idx]
    if ch in _AR:
        return _AR[ch]
    if ch in _HE:
        return _HE[ch]
    if ch in _SYC:
        return _SYC[ch]
    if ch in _UG:
        return _UG[ch]
    if ch in _PHN:
        return _PHN[ch]
    if ch in _OSA:
        return _OSA[ch]
    if ch in _MANDAIC:
        return _MANDAIC[ch]
    if cp in _GEZ:
        return _GEZ[cp]
    # Latin: strip NFD combining marks, keep only base letter
    import unicodedata
    normalized = "".join(c for c in unicodedata.normalize("NFD", ch.lower()) if not unicodedata.combining(c))
    if normalized and normalized.isalpha() and len(normalized) == 1 and normalized in _LATIN:
        return normalized
    if ch in "ʾʿ":
        return ch
    return None


def canonical(root: str) -> str | None:
    """Return the canonical phonetic key for a root. Space-separated, lowercased.

    Returns None if any consonant can't be mapped. The caller can choose
    whether to fall back to matching on the surface string.
    """
    tokens = root.replace("-", " ").split()
    phonemes: list[str] = []
    for token in tokens:
        for ch in token:
            p = _char_to_phoneme(ch)
            if p is None:
                continue
            phonemes.append(p)
    if len(phonemes) < 2:
        return None
    return " ".join(phonemes)
