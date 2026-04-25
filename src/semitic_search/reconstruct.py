"""Proto-Semitic reconstruction from surface cognates.

Given a set of cognate roots across N Semitic languages, infer the most
likely Proto-Semitic ancestor by intersecting each surface phoneme's set of
possible PS sources position-by-position.

Algorithm per slot:
  1. For each cognate, map its surface phoneme at this slot to the set of
     PS labels it could reflect (from the reflex table in fuzzy_canonical).
  2. Count, per candidate PS label, how many of the cognates could reflect
     it. Best candidate = highest count; confidence = count / N.
  3. Break ties by preferring a "more marked" label — i.e., one with fewer
     sibling reflexes (more distinctive across the family), since observing
     a specific phoneme gives more evidence than a merged one.

Output per slot: {ps_label, confidence, supporters: [lang...], candidates: [...]}.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from semitic_search.canonical_root import canonical
from semitic_search.fuzzy_canonical import _REFLEX


# A "specificity" score per PS label: smaller reflex-set size → more marked.
# Computed as the number of surface phonemes that CAN reflect this label.
def _specificity() -> dict[str, int]:
    counts: dict[str, int] = {}
    for sources in _REFLEX.values():
        for s in sources:
            counts[s] = counts.get(s, 0) + 1
    return counts


_SPECIFICITY: dict[str, int] = _specificity()


@dataclass
class SlotReconstruction:
    position: int            # 1-indexed
    ps_label: str            # e.g. "Ḏ" (upper-case PS label)
    confidence: float        # 0..1, fraction of cognates that support this label
    supporters: list[str]    # languages whose surface phoneme reflects ps_label
    dissenters: list[str]    # languages whose surface phoneme does NOT reflect ps_label
    alternatives: list[tuple[str, float]]  # other candidates (label, conf) sorted desc


@dataclass
class Reconstruction:
    ps_root: str                      # space-separated PS labels
    overall_confidence: float         # product of per-slot confidences
    slots: list[SlotReconstruction]
    warnings: list[str]


def _phonemes_of(root_or_canonical: str) -> list[str]:
    """Accept either a raw script root (ك ت ب) or a pre-canonicalized key (k t b)."""
    c = canonical(root_or_canonical)
    if c is None:
        return []
    return c.split()


def reconstruct(cognates: list[tuple[str, str]]) -> Reconstruction:
    """Infer PS root from surface cognates.

    Args:
        cognates: list of (lang_code, root_as_script_or_canonical) pairs.
                  e.g. [("ar", "ذ ه ب"), ("he", "ז ה ב")].

    Returns:
        Reconstruction with ps_root, per-slot confidence, and any warnings.
    """
    warnings: list[str] = []
    # Canonicalize each input root and drop failures with a warning.
    resolved: list[tuple[str, list[str]]] = []
    for lang, root in cognates:
        phonemes = _phonemes_of(root)
        if not phonemes:
            warnings.append(f"Could not canonicalize {lang!r} root {root!r}; skipped.")
            continue
        resolved.append((lang, phonemes))

    if len(resolved) < 2:
        return Reconstruction(
            ps_root="",
            overall_confidence=0.0,
            slots=[],
            warnings=warnings + ["Need at least 2 cognates to reconstruct."],
        )

    # Length mismatch — roots with different consonant counts can't be aligned
    # without morphological parsing; flag and truncate to the shortest.
    lengths = {len(p) for _, p in resolved}
    if len(lengths) > 1:
        warnings.append(
            f"Root length mismatch ({sorted(lengths)}); aligning to shortest {min(lengths)}."
        )
    min_len = min(lengths)

    slots: list[SlotReconstruction] = []
    for pos in range(min_len):
        # Candidate PS labels = union of all per-lang reflex sets at this slot.
        candidates: dict[str, list[str]] = {}  # ps_label -> supporters
        for lang, phonemes in resolved:
            surface = phonemes[pos]
            sources = _REFLEX.get(surface, frozenset({surface.upper()}))
            for s in sources:
                candidates.setdefault(s, []).append(lang)

        if not candidates:
            slots.append(SlotReconstruction(
                position=pos + 1, ps_label="?", confidence=0.0,
                supporters=[], dissenters=[l for l, _ in resolved],
                alternatives=[],
            ))
            continue

        # Rank: highest supporter count first; break ties with specificity (fewer
        # siblings = more marked phoneme, stronger evidence).
        ranked = sorted(
            candidates.items(),
            key=lambda kv: (-len(kv[1]), _SPECIFICITY.get(kv[0], 99)),
        )
        best_label, best_supporters = ranked[0]
        n = len(resolved)
        conf = len(best_supporters) / n
        dissenters = [l for l, _ in resolved if l not in best_supporters]

        alternatives = [(lbl, len(sups) / n) for lbl, sups in ranked[1:6]]

        slots.append(SlotReconstruction(
            position=pos + 1,
            ps_label=best_label,
            confidence=conf,
            supporters=best_supporters,
            dissenters=dissenters,
            alternatives=alternatives,
        ))

    ps_root = " ".join(s.ps_label for s in slots)
    # Overall = geometric mean (product^(1/n)); penalises any weak slot.
    if slots:
        prod = 1.0
        for s in slots:
            prod *= max(s.confidence, 0.001)
        overall = prod ** (1 / len(slots))
    else:
        overall = 0.0

    return Reconstruction(
        ps_root=ps_root, overall_confidence=overall, slots=slots, warnings=warnings
    )


def reconstruct_from_canonicals(cognates: Iterable[tuple[str, str]]) -> Reconstruction:
    """Convenience: inputs are already-canonicalized keys like ('ar', 'k t b')."""
    return reconstruct([(lang, c) for lang, c in cognates])
