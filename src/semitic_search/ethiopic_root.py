"""Mechanical root-consonant extraction from the Ethiopic syllabary.

The Ge'ez script (used by Ge'ez, Amharic, Tigrinya, Tigre, and others) is a
syllabary. Each codepoint encodes a consonant+vowel pair — in the main block
each consonant occupies 8 consecutive codepoints (one per vowel form plus
some gaps). Root extraction is therefore a pure codepoint → consonant lookup,
no model needed.

This module:
  - decomposes any Ethiopic word into its consonantal skeleton
  - keeps the geminate marker, weak-consonant alternations, etc. where the
    script preserves them
  - returns a canonical space-separated root string compatible with the rest
    of the pipeline

Not handled here: morphological stripping of verbal prefixes / nominal
suffixes. For Ge'ez citation forms this is rarely needed (C1äC2äC3ä perfect
is the dictionary form). For Amharic nouns/verbs, we may want a second pass
that strips the infinitive prefix መ- or plural -ዎች etc. — left for a follow-up.
"""

from __future__ import annotations

# Each row: (first codepoint of the 8-cell block, first-form Ethiopic char).
# Wiktionary editors encode Ethiopic roots using the first-form (-ä) character
# for each consonant (e.g., ለ-በ-ሰ, not l-b-s), so we mirror that convention
# to compare cleanly against ground truth. Labialized w-variants collapse
# onto their base consonant.
_ETH_ROWS: list[tuple[int, str]] = [
    (0x1200, "ሀ"),   # h
    (0x1208, "ለ"),   # l
    (0x1210, "ሐ"),   # ḥ
    (0x1218, "መ"),   # m
    (0x1220, "ሠ"),   # ś
    (0x1228, "ረ"),   # r
    (0x1230, "ሰ"),   # s
    (0x1238, "ሸ"),   # š (Amharic)
    (0x1240, "ቀ"),   # q
    (0x1248, "ቀ"),   # qʷ → collapse
    (0x1250, "ቐ"),   # q̱ (Tigrinya variant)
    (0x1258, "ቐ"),   # q̱ʷ
    (0x1260, "በ"),   # b
    (0x1268, "ቨ"),   # v (borrowed)
    (0x1270, "ተ"),   # t
    (0x1278, "ቸ"),   # č (Amharic)
    (0x1280, "ኀ"),   # ḫ
    (0x1288, "ኀ"),   # ḫʷ
    (0x1290, "ነ"),   # n
    (0x1298, "ኘ"),   # ñ (Amharic)
    (0x12A0, "አ"),   # ʾ
    (0x12A8, "ከ"),   # k
    (0x12B0, "ከ"),   # kʷ
    (0x12B8, "ኸ"),   # x (Amharic)
    (0x12C0, "ኸ"),   # xʷ
    (0x12C8, "ወ"),   # w
    (0x12D0, "ዐ"),   # ʿ
    (0x12D8, "ዘ"),   # z
    (0x12E0, "ዠ"),   # ž (Amharic)
    (0x12E8, "የ"),   # y
    (0x12F0, "ደ"),   # d
    (0x12F8, "ዸ"),   # ḍ (Amharic)
    (0x1300, "ጀ"),   # j (Amharic)
    (0x1308, "ገ"),   # g
    (0x1310, "ገ"),   # gʷ
    (0x1320, "ጠ"),   # ṭ
    (0x1328, "ጨ"),   # č̣ (emphatic)
    (0x1330, "ጰ"),   # ṗ
    (0x1338, "ጸ"),   # ṣ
    (0x1340, "ፀ"),   # ḍ-variant
    (0x1348, "ፈ"),   # f
    (0x1350, "ፐ"),   # p
]

# Expand rows into a direct codepoint → consonant lookup for the common block.
_ETH_CP_TO_CONSONANT: dict[int, str] = {}
for _start, _cons in _ETH_ROWS:
    for _i in range(8):
        _ETH_CP_TO_CONSONANT[_start + _i] = _cons

# Marks, punctuation, numerals — ignore during extraction.
_ETH_IGNORE = set(range(0x1360, 0x1380))  # Ethiopic punctuation + numerals


def canonical_char(ch: str) -> str:
    """Return the first-form equivalent of any Ethiopic syllable character.

    Wiktionary editors are inconsistent about which vowel form they use when
    spelling out a root: verbs usually get 1st-form (ä), nouns often get
    6th-form (ə). Canonicalizing both sides to 1st-form lets us compare cleanly.
    Non-Ethiopic characters pass through unchanged.
    """
    cp = ord(ch)
    if 0x1200 <= cp <= 0x137A:
        row_start = (cp - 0x1200) // 8 * 8 + 0x1200
        mapped = _ETH_CP_TO_CONSONANT.get(row_start)
        if mapped is not None:
            return mapped
    return ch


def canonicalize_root(root_str: str) -> str:
    """Map a potentially mixed-form Ethiopic root string onto canonical
    first-form chars, whitespace-normalized.
    """
    parts: list[str] = []
    for token in root_str.replace("-", " ").split():
        parts.append("".join(canonical_char(ch) for ch in token))
    return " ".join(p for p in parts if p)


def extract_consonants(text: str) -> list[str]:
    """Decompose an Ethiopic word into a list of consonant transcriptions.

    Non-Ethiopic characters and punctuation/numerals are skipped. Order is
    preserved. Returns an empty list if the input contains no Ethiopic.
    """
    out: list[str] = []
    for ch in text:
        cp = ord(ch)
        if cp in _ETH_IGNORE:
            continue
        cons = _ETH_CP_TO_CONSONANT.get(cp)
        if cons is not None:
            out.append(cons)
    return out


# Consonants that are frequently a morphological prefix rather than part of
# the root. Keyed by the first-form char (our canonical).
_STRIPPABLE_PREFIX_FIRSTFORM: frozenset[str] = frozenset({
    "ተ",  # tä- passive / reflexive (very common in Amharic/Ge'ez)
    "መ",  # mä- infinitive / deverbal noun (Amharic noun formation)
    "እ",  # ʾə- demonstrative / article
    "ት",  # tə- deverbal noun prefix
    "የ",  # yä- relativizer / 3sg imperfect
    "ይ",  # yə- 3sg imperfect (variant)
    "አ",  # ʾä- causative (Amharic)
})

# In Amharic the historical gutturals ʾ, ʿ, ḥ, ḫ have largely merged. When a
# canonical extracted consonant doesn't match the gold, try these swaps.
_GUTTURAL_EQUIV: dict[str, frozenset[str]] = {
    "አ": frozenset({"ዐ", "ሀ", "ሐ", "ኀ"}),
    "ዐ": frozenset({"አ", "ሀ", "ሐ", "ኀ"}),
    "ሀ": frozenset({"ሐ", "ኀ", "አ", "ዐ"}),
    "ሐ": frozenset({"ሀ", "ኀ", "አ", "ዐ"}),
    "ኀ": frozenset({"ሀ", "ሐ", "አ", "ዐ"}),
}


def extract_root(
    text: str,
    *,
    expected_length: int | None = 3,
    strip_prefix: bool = True,
) -> str | None:
    """Return a canonical space-separated consonantal root for an Ethiopic word.

    Applies two heuristics after raw decomposition:
    1. If the skeleton is longer than expected_length AND starts with a
       known morphological prefix consonant, strip the prefix.
    2. If still longer than expected_length, truncate to the first N.
    Returns None when the word has fewer consonants than expected.
    """
    cs = extract_consonants(text)
    if not cs:
        return None

    if strip_prefix and expected_length is not None:
        # Strip up to 2 known prefix consonants if it brings us to the right
        # length. Never strip if it would shorten us below expected_length.
        stripped = 0
        while (
            stripped < 2
            and len(cs) - stripped > expected_length
            and cs[stripped] in _STRIPPABLE_PREFIX_FIRSTFORM
        ):
            stripped += 1
        cs = cs[stripped:]

    if expected_length is not None:
        if len(cs) < expected_length:
            return None
        cs = cs[:expected_length]

    return " ".join(cs)


def roots_match_with_gutturals(pred: str, gold: str) -> bool:
    """Equal after first-form canonicalization, allowing guttural swaps on
    any slot. Used to measure how much of the residual miss-rate is just the
    ʾ/ʿ/ḥ/ḫ merger in Amharic.
    """
    p = canonicalize_root(pred).split()
    g = canonicalize_root(gold).split()
    if len(p) != len(g):
        return False
    for a, b in zip(p, g):
        if a == b:
            continue
        if b in _GUTTURAL_EQUIV.get(a, frozenset()):
            continue
        return False
    return True


# Confidence heuristic: verbs in the perfect C1äC2äC3ä citation form are
# almost always pure triliteral; nouns can have prefixes/suffixes that inflate
# the consonant count. Use POS as a prior.
def confidence_for_pos(pos: str, n_consonants: int) -> str:
    if n_consonants == 3 and pos == "verb":
        return "high"
    if n_consonants == 3:
        return "medium"
    if n_consonants == 4 and pos == "verb":
        return "medium"  # quadriliteral verb
    if n_consonants in (2,):
        return "low"  # biliteral or stripped-too-aggressively
    return "low"
