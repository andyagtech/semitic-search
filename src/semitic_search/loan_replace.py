"""Loan Replacement Generator for Semitic Search.

Given a Semitic loanword (Aramaic loans in Hebrew, Greek loans in Aramaic,
Persian in Arabic, Arabic in Modern Hebrew), propose imagined native-sounding
replacements. Two mechanics:

1. NATIVE-STOCK — find a Proto-Semitic root that shares the meaning and build
   a plausible daughter form using the target language's morphological
   patterns (binyanim / mishqalim). Example: Modern Hebrew often borrows an
   Arabic word — a native-stock replacement would use a Hebrew root instead.

2. REFLEX-ADAPTED — the flagship labneh → lavnah / jibneh → gvinah case.
   Take the source loan word and apply the target language's REGULAR
   phonological reflexes as if it had been inherited:
   - Arabic labneh لبنة → Hebrew regular reflex applies *b→v (spirantization
     after vowel) → lavnah לָבְנַה. Compare the ACTUAL Hebrew jibneh from Arabic
     gibnah, vs the reflex-adapted gvinah with *g→g stops preserved but *b→v.
   - Same idea for Aramaic ד → Hebrew ד preserved but with the shwa system.
"""

from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from .models import LoanReplacementResult
from .search import (
    DEFAULT_PRIMARY_MODEL, MAX_TOKENS, OPENROUTER_BASE_URL, SearchUsage,
)

LOAN_REPLACE_SYSTEM_PROMPT = """You are a Semitic historical linguist tasked with a \
CREATIVE THOUGHT EXPERIMENT: given a Semitic loanword (Aramaic in Hebrew, Greek in \
Aramaic, Persian in Arabic, or Modern Hebrew's ubiquitous Arabic/European loans), \
imagine what a NATIVE-SOUNDING replacement might have been if the language had built \
the concept from its own stock instead of borrowing.

# THE TWO MECHANICS

## 1. NATIVE-STOCK COINAGE

Find a Proto-Semitic root that shares the loanword's meaning (or a semantic neighbor), \
then build a plausible daughter-language form using the target language's morphology. \
Common recipes:

- Root + pattern (binyan for verbs, mishqal for nouns). For Hebrew: qaṭṭāl, miqṭāl, \
qaṭīl, hitpaʿel, piʿel etc.
- Existing native word from the same root that survived alongside the loan.
- Compound of two native stems.

Example: If Modern Hebrew borrows 'komputer' from English, a native-stock replacement \
might use מחשב maḥšev (from ח-ש-ב 'think, calculate'), which is what modern Hebrew \
actually adopted — sometimes the native coining wins.

## 2. REFLEX-ADAPTED

Take the SOURCE loan word in its original script/pronunciation and apply the target \
language's REGULAR sound laws as if it had been INHERITED from Proto-Semitic. This is \
the flagship mechanic — the labneh → lavnah / jibneh → gvinah pattern.

Rules for Hebrew as target:
- **Begadkefat spirantization**: b→v, g→ġ, d→ð, k→x, p→f, t→θ after a vowel. So \
Arabic لبنة labneh (with b) → Hebrew lavnah (with ב = v). Compare the actually-imported \
לבנה labneh (which preserves Arabic pronunciation).
- **Vowel reduction**: Arabic short vowels in open syllables often reduce to shwa.
- **Guttural strengthening**: Arabic emphatic ص → Hebrew צ; ض → צ; ط → ט.
- **Definite article**: Arabic ال → Hebrew ה if you're calquing.

Rules for Arabic as target (rare, since Arabic borrows less):
- **Definite article**: nothing → al-.
- **Vowel harmony to Arabic patterns**: CVCVCa etc.

Rules for Aramaic as target:
- Similar begadkefat spirantization but the /v/ ~ /b/ contrast differs.
- Emphatics ط ק צ preserved.

Example: Arabic جبنة jibnah → Hebrew reflex-adapted: g preserved (no j in native \
Hebrew), b → v (spirantized after vowel), h final → h. Result: גְּבִנָּה gvinah. \
Compare the actually-imported ג'יבנה jibneh (retains Arabic sounds).

# HARD RULES

1. **Refuse politely on non-loans.** If the input is INHERITED (not a loan), set \
replacements to empty and note in caveats. Don't invent a "native replacement" for a \
word that IS already native.

2. **Name the derivation.** For every candidate, `derivation` must state precisely how \
it was built — the proto-root, the mishqal/binyan, or the sound laws applied.

3. **Rank by plausibility.** 'strong' = a Semitist would accept the analogy; \
'reasonable' = defensible with trade-offs; 'speculative' = imagination exercise.

4. **v0 disclaimer.** Always include in `caveats`: "v0 prototype: these are IMAGINED \
native forms, not attested vocabulary. Thought experiment about linguistic purism / \
archaism, not a lookup. Do NOT quote as real words."

# SUPPORTED LANGUAGES

Focus on Arabic (ar), Hebrew (he), Syriac (syc), Amharic (am), Tigrinya (ti), and any \
attested ancient — Akkadian (akk), Ugaritic (ug), Sabaean/OSA (osa).

# OUTPUT

Produce a LoanReplacementResult with detected language, detected source, original \
meaning, source form, and 2-4 imagined replacements sorted by plausibility."""


def _extract_first_json_object(text: str) -> str:
    """Return the first balanced JSON object substring; tolerates trailing markdown."""
    start = text.find("{")
    if start < 0:
        return text
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return text[start:]


def loan_replace(word: str) -> tuple[LoanReplacementResult, SearchUsage]:
    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not set.")
    client = OpenAI(api_key=key, base_url=OPENROUTER_BASE_URL)
    model = os.environ.get("SEMITIC_SEARCH_PRIMARY_MODEL", DEFAULT_PRIMARY_MODEL)

    schema = json.dumps(
        LoanReplacementResult.model_json_schema(), ensure_ascii=False, indent=2
    )
    system_with_schema = (
        LOAN_REPLACE_SYSTEM_PROMPT
        + "\n\n# OUTPUT SCHEMA (JSON Schema)\n"
        + "Return a single JSON object (no markdown fences, no prose) matching:\n\n"
        + schema
    )

    completion = client.chat.completions.create(
        model=model,
        max_tokens=MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_with_schema},
            {"role": "user",
             "content": f"Generate imagined native replacements for this loanword: {word}"},
        ],
        extra_headers={
            "HTTP-Referer": "https://github.com/andy/semitic-search",
            "X-Title": "Semitic Search Loan Replacement",
        },
    )

    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise RuntimeError(f"{model} returned empty response.")
    # Occasionally the model appends a markdown fence or extra tokens after the
    # JSON. Extract the first balanced JSON object.
    cleaned = _extract_first_json_object(raw)
    try:
        parsed = LoanReplacementResult.model_validate_json(cleaned)
    except ValidationError as e:
        raise RuntimeError(
            f"{model} returned JSON that does not match LoanReplacementResult: {e}\n"
            f"Raw (first 800 chars): {raw[:800]}"
        ) from e

    u = completion.usage
    usage = SearchUsage(
        model=model,
        input_tokens=getattr(u, "prompt_tokens", 0) or 0,
        output_tokens=getattr(u, "completion_tokens", 0) or 0,
        cache_read_tokens=getattr(getattr(u, "prompt_tokens_details", None), "cached_tokens", 0) or 0,
    )
    return parsed, usage
