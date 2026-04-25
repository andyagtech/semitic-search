"""LLM Flash Lite backfill for Arabic / Hebrew / Syriac / Aramaic entries
that Phase 1 (categories + form_of) and Phase 2 (mechanical morphology)
couldn't handle.

These are the residual: proper names, loanwords, phrases, weird particles,
and words where even matres-fallback produced <2 consonants. Small set
(~1-2K per language), cheap (~$0.10 total).
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

MODEL = "google/gemini-2.5-flash-lite"
INPUT_RATE = 0.10 / 1_000_000
OUTPUT_RATE = 0.40 / 1_000_000
PARALLELISM = 10

SYSTEM_PROMPT = """You are a specialist in comparative Semitic historical \
linguistics. Given a word in one of Arabic, Hebrew, Classical Syriac, \
Imperial Aramaic, or Assyrian Neo-Aramaic, together with its gloss, return \
the triliteral (or quadriliteral/biliteral) consonantal root.

Output ONLY a single-line JSON object:
{"root": "C1 C2 C3", "confidence": "high|medium|low", "notes": "optional one sentence"}

Use native-script root characters separated by single spaces (Arabic \
consonants for Arabic words, Hebrew for Hebrew/Imperial Aramaic, Syriac for \
Classical Syriac/Assyrian Neo-Aramaic). Restore underlying weak consonants \
(و/ي/ʔ) when a hollow or defective verb hides them. If the word is a \
loanword, proper name, compound, or has no identifiable Semitic root, \
return {"root": null, "confidence": "unknown", "notes": "why"}.

Keep responses under 150 tokens."""


def call_one(client: OpenAI, lang: str, word: str, pos: str, gloss: str) -> tuple[dict | None, int, int]:
    lang_name = {
        "ar": "Arabic", "he": "Hebrew", "syc": "Classical Syriac",
        "arc": "Imperial Aramaic", "aii": "Assyrian Neo-Aramaic",
    }.get(lang, lang)
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
    parser.add_argument("--langs", default="ar,he,syc,arc,aii")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        print("OPENROUTER_API_KEY missing", file=sys.stderr)
        return 1
    client = OpenAI(api_key=key, base_url="https://openrouter.ai/api/v1")

    db = connect(prefer=args.target)
    total_in = total_out = 0
    grand_updates = grand_nulls = 0

    for lang in args.langs.split(","):
        lang = lang.strip()
        if not lang:
            continue
        rows = db.execute(
            """SELECT id, word, pos,
                      COALESCE(json_extract(glosses_json, '$[0]'), '') AS gloss
                 FROM entries
                WHERE lang = ?
                  AND root IS NULL
                  AND root_inferred IS NULL
                  AND pos NOT IN ('name', 'character', 'num', 'phrase', 'punct')
                ORDER BY id""",
            (lang,),
        )
        if args.limit is not None:
            rows = rows[: args.limit]
        if not rows:
            continue
        print(f"\n=== {lang}: {len(rows)} candidates ===")

        updates: list[tuple] = []
        nulled = 0
        t0 = time.monotonic()
        with ThreadPoolExecutor(max_workers=PARALLELISM) as pool:
            futures = {}
            for row in rows:
                entry_id, word, pos, gloss = row
                futures[pool.submit(call_one, client, lang, word, pos, gloss)] = row
            for i, fut in enumerate(as_completed(futures), 1):
                entry_id, word, pos, gloss = futures[fut]
                parsed, u_in, u_out = fut.result()
                total_in += u_in
                total_out += u_out
                if not parsed or parsed.get("error") or parsed.get("root") is None:
                    nulled += 1
                    continue
                root = str(parsed["root"]).strip()
                if not root or len(root.split()) < 2:
                    nulled += 1
                    continue
                conf = parsed.get("confidence") or "medium"
                updates.append((root, conf, "llm_flash_lite", entry_id))
                if i % 100 == 0:
                    elapsed = time.monotonic() - t0
                    print(f"  ...{i}/{len(rows)} ({elapsed:.0f}s)", flush=True)

        if updates:
            for i in range(0, len(updates), 300):
                db.executemany(
                    "UPDATE entries SET root_inferred = ?, "
                    "root_inferred_confidence = ?, root_inferred_source = ? WHERE id = ?",
                    updates[i : i + 300],
                )
                db.commit()
        print(f"  done: {len(updates)} written, {nulled} LLM-nulled, {time.monotonic() - t0:.0f}s")
        grand_updates += len(updates)
        grand_nulls += nulled

    cost = total_in * INPUT_RATE + total_out * OUTPUT_RATE
    print(f"\nTotal: {grand_updates} rows updated, {grand_nulls} nulled")
    print(f"Tokens: in={total_in:,}  out={total_out:,}  cost=${cost:.4f}")

    print("\n=== Final coverage ===")
    for lang in ("ar", "he", "syc", "arc", "aii"):
        total = db.execute("SELECT COUNT(*) FROM entries WHERE lang = ?", (lang,))[0][0]
        if total == 0:
            continue
        rooted = db.execute(
            "SELECT COUNT(*) FROM entries WHERE lang = ? AND "
            "(root IS NOT NULL OR root_inferred IS NOT NULL)",
            (lang,),
        )[0][0]
        print(f"  {lang:<5} {total:>7,}  rooted {rooted:>6,}  ({rooted/total*100:.1f}%)")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
