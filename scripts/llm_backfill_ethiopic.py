"""LLM-based root backfill for un-rooted Ethio-Semitic entries.

Targets:
- Amharic / Tigrinya / Ge'ez entries where `root` IS NULL (no Wiktionary
  editor annotation) AND either `root_inferred` IS NULL or its confidence is
  `low` — i.e., cases where the mechanical Ethiopic extractor either failed
  entirely or produced a suspect result.

Excludes proper names (`pos = 'name'`) because the LLM pilot showed
hallucinated roots for loanwords and placenames.

Uses Gemini 2.5 Flash Lite via OpenRouter. The pilot hit 3/3 on known-hard
cases (e.g., recovering n-b-r from ወምበር "chair") at ~$0.00005 per entry.
Projected full-backfill cost: ~$1 for all candidates.

Writes results with `root_inferred_source = 'llm_flash_lite'`, preserving
the mechanical result under `root_inferred_previous` for audit.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect
from semitic_search.ethiopic_root import canonicalize_root

MODEL = "google/gemini-2.5-flash-lite"
INPUT_RATE = 0.10 / 1_000_000
OUTPUT_RATE = 0.40 / 1_000_000
PARALLELISM = 10

SYSTEM_PROMPT = """You are a specialist in Ethio-Semitic historical linguistics. \
Given a word in Ge'ez, Amharic, or Tigrinya and its gloss, return the triliteral \
(or quadriliteral) root that underlies it.

Output ONLY a single line JSON object:
{"root": "C1 C2 C3", "confidence": "high|medium|low", "notes": "optional one sentence"}

Where C1..Cn are Ethiopic FIRST-form characters (ለ not ል; ነ not ን). Use only \
consonants attested in the word's surface form OR its historical ancestor. \
When the word is derivationally complex (ma- prefix, -ča/-ša suffix, hollow \
middle-w/y), restore the underlying root consonants rather than copying the \
surface. If the word is a loanword, proper name, or has no identifiable \
Semitic root, return {"root": null, "confidence": "unknown", "notes": "why"}.

Keep responses under 150 tokens. Do not include any text outside the JSON."""


SCHEMA_STATEMENTS = [
    "ALTER TABLE entries ADD COLUMN root_inferred_previous TEXT",
]


def _ensure_columns(db) -> None:
    for stmt in SCHEMA_STATEMENTS:
        try:
            db.execute(stmt)
        except Exception:
            pass
    db.commit()


def call_one(client: OpenAI, lang: str, word: str, pos: str, gloss: str) -> tuple[dict | None, int, int]:
    lang_name = {"am": "Amharic", "ti": "Tigrinya", "gez": "Ge'ez"}.get(lang, lang)
    user = f'Input: "{word}" ({lang_name} {pos or "word"}, gloss: "{gloss or "—"}")'
    try:
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
                "X-Title": "Semitic Search LLM backfill",
            },
            timeout=30,
        )
    except Exception as e:
        return {"error": str(e)}, 0, 0
    raw = resp.choices[0].message.content or ""
    usage_in = resp.usage.prompt_tokens if resp.usage else 0
    usage_out = resp.usage.completion_tokens if resp.usage else 0
    try:
        return json.loads(raw), usage_in, usage_out
    except json.JSONDecodeError:
        return None, usage_in, usage_out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    parser.add_argument("--limit", type=int, default=None, help="Hard cap on candidates per language")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        print("OPENROUTER_API_KEY missing", file=sys.stderr)
        return 1
    client = OpenAI(api_key=key, base_url="https://openrouter.ai/api/v1")

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    if not args.dry_run:
        _ensure_columns(db)

    total_in = 0
    total_out = 0
    grand_updated = 0
    grand_nulled = 0

    for lang in ("am", "ti", "gez"):
        # Candidates: no gold, AND (no mechanical root OR low confidence).
        # Excludes proper names, characters, and numerals where roots are usually
        # absent or misleading.
        rows = db.execute(
            """SELECT id, word, pos,
                      COALESCE(json_extract(glosses_json, '$[0]'), '') AS gloss,
                      root_inferred
                 FROM entries
                WHERE lang = ?
                  AND root IS NULL
                  AND (root_inferred IS NULL OR root_inferred_confidence = 'low')
                  AND pos NOT IN ('name', 'character', 'num', 'phrase')
                  AND json_extract(glosses_json, '$[0]') IS NOT NULL
                ORDER BY id""",
            (lang,),
        )
        if args.limit is not None:
            rows = rows[: args.limit]
        if not rows:
            continue
        print(f"\n=== {lang}: {len(rows)} candidates ===")

        results: list[tuple] = []
        null_count = 0
        t0 = time.monotonic()
        with ThreadPoolExecutor(max_workers=PARALLELISM) as pool:
            futures = {}
            for row in rows:
                entry_id, word, pos, gloss, _prev = row
                futures[pool.submit(call_one, client, lang, word, pos, gloss)] = row
            for i, fut in enumerate(as_completed(futures), 1):
                entry_id, word, pos, gloss, prev = futures[fut]
                parsed, u_in, u_out = fut.result()
                total_in += u_in
                total_out += u_out
                if not parsed or parsed.get("error") or parsed.get("root") is None:
                    null_count += 1
                    continue
                root = canonicalize_root(str(parsed["root"]))
                if not root or len(root.split()) < 2:
                    null_count += 1
                    continue
                conf = parsed.get("confidence") or "medium"
                results.append((root, conf, "llm_flash_lite", prev, entry_id))
                if i % 50 == 0:
                    elapsed = time.monotonic() - t0
                    print(f"  ...{i}/{len(rows)}  ({elapsed:.0f}s elapsed)", flush=True)

        if results and not args.dry_run:
            for i in range(0, len(results), 200):
                db.executemany(
                    """UPDATE entries
                          SET root_inferred = ?,
                              root_inferred_confidence = ?,
                              root_inferred_source = ?,
                              root_inferred_previous = ?
                        WHERE id = ?""",
                    results[i : i + 200],
                )
                db.commit()

        cost = total_in * INPUT_RATE + total_out * OUTPUT_RATE
        print(f"  updated: {len(results)}  returned null/error: {null_count}  "
              f"elapsed {time.monotonic() - t0:.0f}s  running cost: ${cost:.4f}")
        grand_updated += len(results)
        grand_nulled += null_count

    cost = total_in * INPUT_RATE + total_out * OUTPUT_RATE
    print(f"\nTotal: updated {grand_updated} rows, nulled {grand_nulled}")
    print(f"Total tokens: in={total_in:,}  out={total_out:,}  est cost ${cost:.4f}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
