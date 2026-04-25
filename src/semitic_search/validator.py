"""Cross-check a SemiticSearchResult with Gemini 3 Pro via OpenRouter.

A different model with a different training distribution gives genuine signal;
disagreements are real flags, not rubber stamps. We route via OpenRouter to
share auth with other non-Anthropic models and avoid per-provider free-tier
quota landmines.
"""

from __future__ import annotations

import json
import os
from typing import Literal, Optional

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from .models import SemiticSearchResult

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# Validator uses a DIFFERENT lab than the primary on purpose — different
# training distribution = real second opinion. Override via env var if the
# primary is ever swapped.
VALIDATOR_MODEL = os.environ.get("SEMITIC_SEARCH_VALIDATOR_MODEL", "openai/gpt-5.2")
FALLBACK_MODEL = "anthropic/claude-opus-4.5"

Verdict = Literal["agree", "disagree", "unsure"]


class CognateVerdict(BaseModel):
    cognate_index: int = Field(description="0-based index into the primary result's cognates list.")
    language: str
    surface_form: str
    verdict: Verdict
    reason: str = Field(description="One-sentence justification.")


class MissedCognate(BaseModel):
    language: str
    surface_form: str
    surface_root: str
    gloss: str
    reason: str = Field(description="Why the primary should have included this.")


class ValidationResult(BaseModel):
    overall_agreement: Literal["high", "mixed", "low"]
    root_extraction_verdict: Verdict
    root_extraction_notes: Optional[str] = None
    cognate_verdicts: list[CognateVerdict] = Field(default_factory=list)
    missed_cognates: list[MissedCognate] = Field(default_factory=list)
    overall_notes: str


VALIDATOR_SYSTEM_PROMPT = """You are an independent second-opinion reviewer for a \
Semitic-linguistics analysis tool. You will receive a structured analysis of a \
Semitic word (its extracted root and a list of proposed cross-language cognates). \
Your job is NOT to rubber-stamp — CHALLENGE it where warranted.

For each cognate in the primary's list, render a verdict: 'agree', 'disagree', \
or 'unsure'. Be strict. Reasons to DISAGREE include: wrong root extraction; \
false-friend consonantal similarity without a true Proto-Semitic share; \
semantic shift too large without evidence; invoking an irregular correspondence \
when a regular one does not license the match; wrong language/script.

Also list cognates the primary MISSED — well-attested forms in Arabic, Hebrew, \
Syriac, Amharic, Tigrinya, Ge'ez, Akkadian, Ugaritic, or Old South Arabian that \
should have been in the list.

Apply standard Proto-Semitic correspondences rigorously. Output JSON matching \
this schema exactly — no extra fields, no markdown fences:

{
  "overall_agreement": "high" | "mixed" | "low",
  "root_extraction_verdict": "agree" | "disagree" | "unsure",
  "root_extraction_notes": "short string or null",
  "cognate_verdicts": [
    {
      "cognate_index": int (0-based index into primary.cognates),
      "language": "language code",
      "surface_form": "form",
      "verdict": "agree" | "disagree" | "unsure",
      "reason": "one sentence"
    }
  ],
  "missed_cognates": [
    {
      "language": "code",
      "surface_form": "form",
      "surface_root": "root",
      "gloss": "gloss",
      "reason": "one sentence"
    }
  ],
  "overall_notes": "one paragraph"
}

Keep reasons concise — one sentence each. No fluff."""


def _load_client() -> OpenAI:
    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Cannot run Gemini validator via OpenRouter. "
            "Set it in .env or skip --validate."
        )
    return OpenAI(api_key=key, base_url=OPENROUTER_BASE_URL)


def _call(client: OpenAI, model: str, primary_json: str) -> str:
    resp = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": VALIDATOR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Review the following Semitic Search analysis. Return only "
                    "the JSON per the schema in the system prompt.\n\n"
                    f"PRIMARY ANALYSIS:\n{primary_json}"
                ),
            },
        ],
        extra_headers={
            "HTTP-Referer": "https://github.com/andy/semitic-search",
            "X-Title": "Semitic Search validator",
        },
    )
    content = resp.choices[0].message.content or ""
    return content.strip()


def validate(result: SemiticSearchResult) -> ValidationResult:
    client = _load_client()
    primary_json = json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2)

    raw: str = ""
    last_error: Exception | None = None
    for model in (VALIDATOR_MODEL, FALLBACK_MODEL):
        try:
            raw = _call(client, model, primary_json)
            break
        except Exception as e:
            last_error = e
            continue
    else:
        raise RuntimeError(f"All validator models failed. Last error: {last_error}")

    try:
        return ValidationResult.model_validate_json(raw)
    except ValidationError as e:
        raise RuntimeError(
            f"Gemini returned JSON that does not match ValidationResult schema: {e}\n"
            f"Raw: {raw[:600]}"
        ) from e
