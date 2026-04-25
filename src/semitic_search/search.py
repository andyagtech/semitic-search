"""Primary search path for Semitic Search v0.

Routes through OpenRouter using the OpenAI-compatible API. Default model is
Gemini 3 Pro; configurable via SEMITIC_SEARCH_PRIMARY_MODEL. Using OpenRouter
means one key unlocks multiple labs' models — we keep Anthropic in the dep list
for when direct credits become available, but today we route via OpenRouter to
avoid provider-specific free-tier/billing surprises.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from .models import SemiticSearchResult
from .prompt import SYSTEM_PROMPT

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_PRIMARY_MODEL = "google/gemini-3.1-pro-preview"
MAX_TOKENS = 16000


@dataclass(slots=True, frozen=True)
class SearchUsage:
    model: str
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0


def _load_client() -> OpenAI:
    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Copy .env.example to .env and paste your key."
        )
    return OpenAI(api_key=key, base_url=OPENROUTER_BASE_URL)


def _schema_fragment() -> str:
    """Render a compact description of the output schema for the system prompt."""
    schema = SemiticSearchResult.model_json_schema()
    return json.dumps(schema, ensure_ascii=False, indent=2)


def search(word: str) -> tuple[SemiticSearchResult, SearchUsage]:
    """Run a Semitic Search query. Returns (parsed result, usage stats)."""
    client = _load_client()
    model = os.environ.get("SEMITIC_SEARCH_PRIMARY_MODEL", DEFAULT_PRIMARY_MODEL)

    system_with_schema = (
        SYSTEM_PROMPT
        + "\n\n# OUTPUT SCHEMA (JSON Schema)\n"
        + "Return a single JSON object (no markdown fences, no prose) matching:\n\n"
        + _schema_fragment()
    )

    completion = client.chat.completions.create(
        model=model,
        max_tokens=MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_with_schema},
            {"role": "user", "content": f"Analyze this word: {word}"},
        ],
        extra_headers={
            "HTTP-Referer": "https://github.com/andy/semitic-search",
            "X-Title": "Semitic Search",
        },
    )

    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise RuntimeError(
            f"{model} returned an empty response. finish_reason="
            f"{completion.choices[0].finish_reason}"
        )

    try:
        parsed = SemiticSearchResult.model_validate_json(raw)
    except ValidationError as e:
        raise RuntimeError(
            f"{model} returned JSON that does not match SemiticSearchResult: {e}\n"
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
