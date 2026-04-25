"""Proto-Semitic-reflex-aware fuzzy matching for cognate discovery.

The strict `canonical_root.canonical()` hash groups roots whose consonants
are written with phonetically-identical symbols across scripts. It finds
~42% of editor-curated cognate claims because the other ~58% involve cases
where different languages preserved different reflexes of the same
Proto-Semitic consonant:

  PS *ḍ → Ar ض (ḍ) / Heb צ (ṣ) / Syc ܥ (ʿ) / Akk ṣ
  PS *ṯ → Ar ث (ṯ) / Heb ש (š) / Syc ܬ (t) / Akk š
  PS *ḏ → Ar ذ (ḏ) / Heb ז (z) / Syc ܕ (d) / Akk z
  PS *ẓ → Ar ظ (ẓ) / Heb צ (ṣ) / Syc ܛ (ṭ)
  PS *ḫ → Ar خ (ḫ) / Heb/Syc ḥ
  PS *ġ → Ar غ (ġ) / Heb/Syc ʿ

The fuzzy matcher maps each surface phoneme to the SET of Proto-Semitic
sources it could plausibly represent, then decides two roots are potential
cognates iff every aligned position has at least one shared PS source.

Kept conservative: only well-attested reflex mergers. Identity phonemes
(b, k, l, m, n, f, q, r, g, h, ʾ) only match themselves. We include the
w/y alternation that's standard for hollow verbs.
"""

from __future__ import annotations

# Each surface phoneme (as produced by canonical_root.canonical()) maps to
# the set of PS source "labels" it could reflect. Identity mappings use
# the uppercased letter; reflex-ambiguous phonemes list all their PS sources.
_REFLEX: dict[str, frozenset[str]] = {
    # Sibilants / interdentals
    "š": frozenset({"Š", "Ś", "Ṯ"}),   # Heb ש, Akk š cover *š and *ṯ; can also be *ś
    "s": frozenset({"S", "Ś"}),         # some Ar س is *ś; Heb ס is *s (or *ś)
    "ś": frozenset({"Ś"}),              # preserved only in OSA / reconstructed
    "ṯ": frozenset({"Ṯ"}),              # Ar ث
    "t": frozenset({"T", "Ṯ"}),         # Syc ܬ covers *t and *ṯ
    "d": frozenset({"D", "Ḏ"}),         # Syc ܕ covers *d and *ḏ
    "ḏ": frozenset({"Ḏ"}),              # Ar ذ
    "z": frozenset({"Z", "Ḏ"}),         # Heb ז covers *z and *ḏ
    # Emphatics
    "ṣ": frozenset({"Ṣ", "Ḍ", "Ẓ"}),    # Heb צ collapses *ṣ, *ḍ, *ẓ; Akk ṣ similar
    "ḍ": frozenset({"Ḍ"}),              # Ar ض
    "ẓ": frozenset({"Ẓ"}),              # Ar ظ
    "ṭ": frozenset({"Ṭ", "Ẓ"}),         # Syc ܛ covers *ṭ and *ẓ
    # Pharyngeals / velars
    "ḥ": frozenset({"Ḥ", "Ḫ"}),         # Heb ח and Syc ܚ merge *ḥ and *ḫ
    "ḫ": frozenset({"Ḫ"}),              # Ar خ
    "ʿ": frozenset({"ʿ", "Ġ", "Ḍ"}),    # Heb/Syc ʿ covers *ʿ, *ġ; Aramaic *ḍ > ʿ
    "ġ": frozenset({"Ġ"}),              # Ar غ
    # Weak: hollow verbs alternate w/y freely
    "w": frozenset({"W", "Y"}),
    "y": frozenset({"W", "Y"}),
    # Identity
    "b": frozenset({"B"}), "p": frozenset({"P", "F"}),  # Arabic lacks p; p/f surface-equivalent
    "f": frozenset({"P", "F"}),
    "k": frozenset({"K"}), "q": frozenset({"Q"}),
    "g": frozenset({"G"}),
    "l": frozenset({"L"}), "m": frozenset({"M"}), "n": frozenset({"N"}),
    "r": frozenset({"R"}),
    "h": frozenset({"H"}), "ʾ": frozenset({"ʾ"}),
    # Ge'ez-only phonemes — pass through as identity
    "č": frozenset({"Č"}), "č̣": frozenset({"Č̣"}),
    "j": frozenset({"J"}), "ž": frozenset({"Ž"}),
    "ñ": frozenset({"Ñ"}), "v": frozenset({"V"}),
    "ṡ": frozenset({"Ś"}),  # Ugaritic ṡ = *ś
}


def proto_sets(canonical_key: str) -> list[frozenset[str]]:
    """Return per-position sets of possible PS source labels."""
    sets: list[frozenset[str]] = []
    for p in canonical_key.split():
        sets.append(_REFLEX.get(p, frozenset({p.upper()})))
    return sets


def fuzzy_match(key_a: str, key_b: str) -> bool:
    """True iff the two canonical keys could plausibly share a Proto-Semitic
    ancestor — i.e., every aligned position has at least one shared PS source.
    Length mismatch always returns False.
    """
    a = proto_sets(key_a)
    b = proto_sets(key_b)
    if len(a) != len(b):
        return False
    return all(x & y for x, y in zip(a, b))


def fuzzy_variants(canonical_key: str, cap: int = 64) -> list[str]:
    """Return all canonical variants (cartesian product of per-position PS
    source labels) up to `cap`. For indexing: write one row per variant and
    look up by equality. Returns deduplicated, sorted.
    """
    sets = proto_sets(canonical_key)
    variants: list[list[str]] = [[]]
    for s in sets:
        new: list[list[str]] = []
        for v in variants:
            for label in s:
                new.append(v + [label])
                if len(new) > cap * 4:
                    break
        variants = new
    seen: set[str] = set()
    out: list[str] = []
    for v in variants:
        key = " ".join(v)
        if key not in seen:
            seen.add(key)
            out.append(key)
    out.sort()
    return out[:cap]
