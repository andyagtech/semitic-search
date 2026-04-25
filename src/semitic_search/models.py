from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

ConfidenceTier = Literal["high", "medium", "low", "speculative", "unknown"]

LanguageCode = Literal["ar", "he", "syc", "am", "ti", "akk", "ug", "osa"]

RootType = Literal[
    "sound",
    "hamzated",
    "initial-weak",
    "hollow",
    "final-weak",
    "geminate",
    "biliteral",
    "quadriliteral",
    "unknown",
]


class ProtoCandidate(BaseModel):
    proto_phoneme: str = Field(
        description=(
            "Reconstructed Proto-Semitic consonant in standard Semitistic transcription "
            "(e.g., *θ, *ś, *š, *ṯ̣, *ʕ, *ḥ, *ʔ)."
        )
    )
    weight: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "Relative plausibility for this slot, 0.0 to 1.0. "
            "Weights across candidates for one slot should sum to approximately 1.0."
        ),
    )


class RootSlot(BaseModel):
    position: int = Field(ge=1, le=4, description="Slot index, starting at 1.")
    surface_consonant: str = Field(
        description="Consonant as it appears in the source-language form."
    )
    proto_candidates: list[ProtoCandidate] = Field(
        description=(
            "Possible Proto-Semitic phonemes for this slot, with weights. "
            "When the daughter language's orthography reflects a merger "
            "(e.g., Hebrew ש covers *š/*ś/*θ; Ge'ez ሰ covers *s/*š/*ś), "
            "emit multiple candidates rather than picking one."
        )
    )


class Cognate(BaseModel):
    language: LanguageCode
    language_name: str = Field(
        description="Human-readable language name (e.g., 'Hebrew', 'Geʿez', 'Syriac')."
    )
    surface_form: str = Field(
        description="Cognate word in its native script, with appropriate diacritics/pointing."
    )
    surface_root: str = Field(
        description="Cognate's root in native script, hyphen-separated (e.g., 'ك-ت-ب', 'כ-ת-ב')."
    )
    gloss: str = Field(description="Concise English gloss of the cognate's meaning.")
    confidence: ConfidenceTier
    correspondence_path: Optional[str] = Field(
        default=None,
        description=(
            "One-line justification naming the sound correspondences (e.g., "
            "'Ar ث ↔ He שׁ ↔ Aram ת — regular *θ reflex'). "
            "Required for high/medium/low; omit for speculative/unknown."
        ),
    )
    wiktionary_hint: Optional[str] = Field(
        default=None,
        description=(
            "Best-guess Wiktionary page title for this lemma "
            "(typically the surface form without pointing). Used to construct the citation link."
        ),
    )
    notes: Optional[str] = Field(
        default=None,
        description=(
            "Caveats: semantic shift, loanword suspicion, irregular reflex, attestation rarity, etc."
        ),
    )


class SemiticSearchResult(BaseModel):
    input_word: str
    detected_language: LanguageCode
    detected_language_name: str
    normalized_form: str = Field(
        description="Input after NFC normalization and diacritic/pointing stripping."
    )

    extracted_root: Optional[str] = Field(
        default=None,
        description=(
            "Surface-level root in the input's native script, hyphen-separated. "
            "Null if the root cannot be determined with any confidence."
        ),
    )
    root_type: Optional[RootType] = None
    root_confidence: ConfidenceTier

    proto_slots: Optional[list[RootSlot]] = Field(
        default=None,
        description=(
            "Per-slot weighted distribution over Proto-Semitic consonants. "
            "Null when root cannot be extracted."
        ),
    )

    cognates: list[Cognate] = Field(
        default_factory=list,
        description=(
            "Cross-language cognates, sorted by confidence (high first). "
            "Empty list if none found with any plausibility."
        ),
    )

    caveats: list[str] = Field(
        default_factory=list,
        description=(
            "Assumptions, limitations, and disclaimers the user should read before trusting "
            "these results. Always include a v0-prototype disclaimer."
        ),
    )
