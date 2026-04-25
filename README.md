# Semitic Search

A linguistics tool for identifying Semitic (normally triliteral) roots and
finding cognate/related terms across Semitic languages.

## Supported languages

**v1:** Arabic, Hebrew, Syriac, Amharic, Tigrinya
**Future:** Old South Arabian, Ugaritic, Akkadian

## What it does

1. Take a word in any supported Semitic language.
2. Identify its underlying (usually triliteral) root.
3. Surface cognate and related terms in the other Semitic languages.
4. Rank results by confidence — high-confidence matches first, then
   progressively fuzzier matches, so you can see both certain cognates and
   speculative ones.

Matches are fuzzy by design: correspondences across Semitic languages are
regular but not exact, and are shaped by phoneme mergers, weak-consonant
alternations, and irregular roots. The tool models that uncertainty
directly in its ranking.

## Citations and sources

Where possible, results link back to Wiktionary and cite the underlying
lexica (Kaikki.org dumps, SEDRA, etc.). Pronunciation audio via Forvo is
planned for a later version.

## Roadmap

- **v0** — LLM-only prototype: hardcoded correspondence table, no index.
  Locks in UX and output format.
- **v1** — Wiktionary-indexed: ingest Kaikki dumps for all five languages,
  add per-language morphological analyzers (CAMeL Tools for Arabic,
  HornMorpho for Ethio-Semitic, SEDRA for Syriac).
- **v2** — Fuzzy matching via Sound-Class Alignment (SCA / LingPy) and
  gloss-based semantic reranking. Confidence tiers in the UI.
- **v3** — Corpus attestation (Sefaria, OpenITI), Forvo pronunciations,
  hand-curated Akkadian / Ugaritic / Old South Arabian seed data.

## Setup

```
cp .env.example .env
# paste your API keys into .env
```

The real `.env` is gitignored. Never commit keys.
