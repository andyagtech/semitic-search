"""LLM root-extraction pilot. Small-sample cost+accuracy test before scaling.

Picks ~10 Ethio-Semitic entries (mixing known hard-cases + low-confidence
rule-based outputs), asks Gemini 2.5 Flash Lite via OpenRouter for the root,
prints predictions side-by-side with the rule-based prediction and (where
available) gold. Counts total tokens consumed and estimates cost.

Explicitly a pilot — it only runs on LIMIT entries. Not a full backfill.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect
from semitic_search.ethiopic_root import canonicalize_root, extract_root

MODEL = "google/gemini-2.5-flash-lite"  # cheapest Gemini with instruction tuning
# OpenRouter pricing as of 2026-04-19: ~$0.10/M input, ~$0.40/M output.
INPUT_RATE = 0.10 / 1_000_000
OUTPUT_RATE = 0.40 / 1_000_000

SYSTEM_PROMPT = """You are a specialist in Ethio-Semitic historical linguistics. \
Given a word in Ge'ez, Amharic, or Tigrinya and its gloss, return the triliteral \
(or quadriliteral) root that underlies it.

Output ONLY a single line JSON object:
{"root": "C1 C2 C3", "confidence": "high|medium|low", "notes": "optional one sentence"}

Where C1..Cn are Ethiopic first-form characters (ለ not ል; ነ not ን). Use only \
consonants attested in the word's surface form or its historical ancestor. \
When the word is derivationally complex (ma- prefix, -ča/-ša suffix, hollow \
middle-w/y), restore the underlying root consonants — do not copy surface \
consonants blindly. If you truly cannot identify a root, return \
{"root": null, "confidence": "unknown", "notes": "why"}.

Examples:
Input: "ነበረ" (Amharic verb, gloss: "to live, to sit, to dwell")
Output: {"root": "ነ በ ረ", "confidence": "high"}

Input: "ወምበር" (Amharic noun, gloss: "chair, seat")
Output: {"root": "ነ በ ረ", "confidence": "medium", "notes": "deverbal from n-b-r 'sit'"}

Input: "ማረሻ" (Amharic noun, gloss: "plow")
Output: {"root": "አ ረ ሰ", "confidence": "high", "notes": "ma- instrumental prefix + root ʾ-r-s 'plow'"}
"""


def call_gemini(client: OpenAI, word: str, lang: str, pos: str, gloss: str) -> tuple[dict | None, int, int]:
    user = f'Input: "{word}" ({lang} {pos or "word"}, gloss: "{gloss or "—"}")'
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=200,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        extra_headers={
            "HTTP-Referer": "https://semitic-search.andy-barr.com",
            "X-Title": "Semitic Search LLM pilot",
        },
    )
    raw = resp.choices[0].message.content or ""
    usage_in = resp.usage.prompt_tokens if resp.usage else 0
    usage_out = resp.usage.completion_tokens if resp.usage else 0
    try:
        return json.loads(raw), usage_in, usage_out
    except json.JSONDecodeError:
        return None, usage_in, usage_out


def main() -> int:
    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        print("OPENROUTER_API_KEY missing", file=sys.stderr)
        return 1
    client = OpenAI(api_key=key, base_url="https://openrouter.ai/api/v1")

    db = connect(prefer="local")

    # Three known hard-cases (gold available) + seven low-confidence inferreds
    # from Amharic, where mechanical extraction might've made wrong prefix strips.
    hard = db.execute(
        """SELECT word, pos, COALESCE(json_extract(glosses_json, '$[0]'), '') AS gloss, root
             FROM entries
            WHERE lang = 'am' AND root IN ('ነ በ ረ', 'አ ረ ሰ', 'ከ ፈ ተ')
            LIMIT 3"""
    )
    sample = db.execute(
        """SELECT word, pos, COALESCE(json_extract(glosses_json, '$[0]'), '') AS gloss,
                  NULL AS root
             FROM entries
            WHERE lang = 'am' AND root IS NULL
              AND root_inferred_confidence = 'low'
              AND json_extract(glosses_json, '$[0]') IS NOT NULL
            ORDER BY id
            LIMIT 7"""
    )

    rows = [(*r, "am", "known-hard") for r in hard] + [(*r, "am", "low-conf") for r in sample]

    total_in = 0
    total_out = 0
    hits = 0
    matches_rule = 0
    print(f"{'kind':<12} {'word':<15} {'pos':<8} {'rule-based':<18} {'LLM':<18} {'gold':<18}")
    print("-" * 110)
    for word, pos, gloss, gold, lang, kind in rows:
        # Rule-based pred
        rb = extract_root(word, expected_length=3) or "(none)"
        # LLM
        result, in_tok, out_tok = call_gemini(client, word, "Amharic" if lang == "am" else lang, pos or "", gloss or "")
        total_in += in_tok
        total_out += out_tok
        llm = "(parse-fail)"
        if result and result.get("root"):
            llm = canonicalize_root(result["root"])
        gold_c = canonicalize_root(gold) if gold else ""
        rb_c = canonicalize_root(rb) if rb != "(none)" else "(none)"

        if gold_c:
            if llm == gold_c:
                hits += 1
        if llm == rb_c:
            matches_rule += 1

        gold_display = gold_c or "—"
        print(f"{kind:<12} {word:<15} {pos:<8} {rb_c:<18} {llm:<18} {gold_display:<18}")

    cost = total_in * INPUT_RATE + total_out * OUTPUT_RATE
    print()
    print(f"Total tokens: in={total_in:,}  out={total_out:,}")
    print(f"Estimated cost: ${cost:.6f}")
    print(f"LLM hits on 3 known-gold cases: {hits}/3")
    print(f"LLM matches rule-based: {matches_rule}/{len(rows)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
