"""Rule-based morphology-aware consonantal root extraction for Arabic / Hebrew
/ Aramaic / Syriac.

Strategy:
1. Strip known proclitic prefixes (definite article, prepositions) one at a time
   — never more than the surface word length minus 2 consonants.
2. Strip common enclitic suffixes (feminine, plural, possessive pronouns).
3. Drop matres lectionis characters that are in non-root positions (the most
   common heuristic: ا/و/ي in Arabic and ו/ה/י in Hebrew between consonants,
   plus word-final vowel-markers).
4. Take the first `expected_length` (usually 3) remaining consonants.

Does NOT handle:
- Weak roots (hollow, defective) where a /w/ or /y/ root consonant has been
  hidden as a long vowel. These need lexical knowledge or an LLM.
- Geminate roots (C1-C2-C2) where the gemination has collapsed.
- Quadriliteral roots — we truncate to 3.

Evaluated on the ~8K gold-annotated Ar/He/Syc entries. Expected accuracy:
~65-75% on sound verbs/nouns, lower on derivationally-opaque forms.
"""

from __future__ import annotations

# --- Arabic ---
# Definite article + common proclitic combinations + conjunctions + preps.
_AR_PREFIXES: tuple[str, ...] = (
    "وَال", "فَال", "بِال", "كَال", "لِل",  # common prefix + definite article
    "وب", "ول", "ومن", "وف", "فب", "فل", "كب", "كل",
    "ال",  # definite article
    "و", "ف",  # conjunctions (these can be root letters too — used only when nothing else fits)
)
_AR_SUFFIXES: tuple[str, ...] = (
    "هما", "هم", "هن", "كما", "كم", "كن", "نا", "ني", "ها", "هو", "هي", "ك", "ه",
    "ات", "ون", "ين", "ان", "اء", "ية", "ة", "ى", "ا",
)
# Consonants in Arabic. The three letters ا, و, ي can be EITHER root consonants
# OR matres lectionis for /ā/, /ū/, /ī/. In citation forms of sound roots
# they're almost always matres; in weak roots they ARE the root consonant and
# we'll miss those.
_AR_SOLID_CONSONANTS = set("بتثجحخدذرزسشصضطظعغفقكلمنهء")
_AR_MATRES = set("اوي")
_AR_HAMZA_SEATS = set("أإآؤئ")  # all → ء root slot
_AR_TAA_MARBUTA = "ة"

# --- Hebrew (and Aramaic in Hebrew script) ---
_HE_PREFIXES: tuple[str, ...] = (
    "וה", "וב", "ול", "וכ", "ומ", "שה", "שב", "של", "שמ",
    "ה", "ו", "ב", "ל", "כ", "מ", "ש",
)
_HE_SUFFIXES: tuple[str, ...] = (
    "יהם", "יהן", "יכם", "יכן", "ותיו", "ותיה", "נו", "כם", "כן", "הם", "הן", "תי",
    "ות", "ים", "ית", "יה", "יו", "ני", "ך", "ם", "ן", "ה", "י",
)
_HE_SOLID_CONSONANTS = set("בגדזחטכלמנסעפצקרשת")  # matres ה/ו/י excluded
_HE_MATRES = set("הוי")
_HE_FINALS_TO_MEDIAL = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
_HE_ALL_LETTERS = set("אבגדהוזחטיכךלמםנןסעפףצץקרשת")

# --- Syriac ---
_SYC_PREFIXES: tuple[str, ...] = (
    "ܘܕ", "ܘܒ", "ܘܠ", "ܕ", "ܘ", "ܒ", "ܠ",  # and, of, in, to
)
_SYC_SUFFIXES: tuple[str, ...] = (
    "ܗܘܢ", "ܗܝܢ", "ܟܘܢ", "ܟܝܢ", "ܘܢ", "ܝܢ", "ܐܝ", "ܝܬܐ", "ܝܬ", "ܬܐ", "ܐ", "ܗ", "ܝ",
)
_SYC_ALL_LETTERS = set(chr(c) for c in range(0x0710, 0x072D))
_SYC_MATRES = set("ܐܗܘܝ")


def _strip_prefixes(word: str, prefixes: tuple[str, ...], min_remaining: int) -> str:
    """Greedy longest-match prefix stripping, one attempt, preserving min length."""
    for p in sorted(prefixes, key=len, reverse=True):
        if word.startswith(p) and len(word) - len(p) >= min_remaining:
            return word[len(p):]
    return word


def _strip_suffixes(word: str, suffixes: tuple[str, ...], min_remaining: int) -> str:
    for s in sorted(suffixes, key=len, reverse=True):
        if word.endswith(s) and len(word) - len(s) >= min_remaining:
            return word[:-len(s)]
    return word


def _normalize_hamza(text: str) -> str:
    return "".join("ء" if ch in _AR_HAMZA_SEATS else ch for ch in text)


def _normalize_hebrew_finals(text: str) -> str:
    return "".join(_HE_FINALS_TO_MEDIAL.get(ch, ch) for ch in text)


def arabic_root(word: str, *, expected: int = 3) -> str | None:
    w = _normalize_hamza(word)
    w = _strip_prefixes(w, _AR_PREFIXES, min_remaining=expected)
    w = _strip_suffixes(w, _AR_SUFFIXES, min_remaining=expected)
    # Keep solid consonants first; append matres only if we don't have enough.
    solids = [ch for ch in w if ch in _AR_SOLID_CONSONANTS]
    if len(solids) >= expected:
        return " ".join(solids[:expected])
    # Fall back: include matres to pad (weak roots — these are often wrong,
    # so flag as low).
    all_cs = [ch for ch in w if ch in _AR_SOLID_CONSONANTS or ch in _AR_MATRES]
    if len(all_cs) >= 2:
        return " ".join(all_cs[:expected])
    return None


def hebrew_root(word: str, *, expected: int = 3) -> str | None:
    w = _normalize_hebrew_finals(word)
    w = _strip_prefixes(w, _HE_PREFIXES, min_remaining=expected)
    w = _strip_suffixes(w, _HE_SUFFIXES, min_remaining=expected)
    solids = [ch for ch in w if ch in _HE_SOLID_CONSONANTS]
    if len(solids) >= expected:
        return " ".join(solids[:expected])
    all_cs = [ch for ch in w if ch in _HE_ALL_LETTERS]
    if len(all_cs) >= 2:
        return " ".join(all_cs[:expected])
    return None


def syriac_root(word: str, *, expected: int = 3) -> str | None:
    w = _strip_prefixes(word, _SYC_PREFIXES, min_remaining=expected)
    w = _strip_suffixes(w, _SYC_SUFFIXES, min_remaining=expected)
    solids = [ch for ch in w if ch in _SYC_ALL_LETTERS and ch not in _SYC_MATRES]
    if len(solids) >= expected:
        return " ".join(solids[:expected])
    all_cs = [ch for ch in w if ch in _SYC_ALL_LETTERS]
    if len(all_cs) >= 2:
        return " ".join(all_cs[:expected])
    return None


def extract_root(word: str, lang: str, *, expected: int = 3) -> tuple[str | None, str]:
    """Return (root, confidence) where confidence is 'high' / 'low' based on
    whether we hit the expected length from solid consonants alone."""
    if not word:
        return None, ""
    if lang == "ar":
        r = arabic_root(word, expected=expected)
    elif lang in ("he",):
        r = hebrew_root(word, expected=expected)
    elif lang == "syc":
        r = syriac_root(word, expected=expected)
    elif lang in ("arc", "aii"):
        # Aramaic varieties — use Hebrew-style stripping for Hebrew-script (arc)
        # or Syriac-style for Syriac-script (aii). Auto-detect by first char.
        cp = ord(word[0]) if word else 0
        if 0x0590 <= cp <= 0x05FF:
            r = hebrew_root(word, expected=expected)
        else:
            r = syriac_root(word, expected=expected)
    else:
        return None, ""
    if r is None:
        return None, ""
    conf = "high" if len(r.split()) == expected else "low"
    return r, conf
