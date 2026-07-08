"""Prewarm the web app's search cache with common Semitic terms.

Runs the local Python search function against a curated list of queries and
writes each result as a JSON file under `web/data/cache/`. The web app's
`/api/search` route checks this cache first and returns instantly on hit.

Concurrency: OpenRouter allows parallel requests. First request pays the full
~7k-token system-prompt cost; subsequent within the 5-min TTL come back cached
provider-side.

Usage:
    python scripts/build_search_cache.py              # all queries
    python scripts/build_search_cache.py --force      # re-run even if cached
    python scripts/build_search_cache.py --dry-run    # print list, don't call
    python scripts/build_search_cache.py --model X    # override prewarm model
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from semitic_search.search import search

# Cheap, capable flash model — ~50x cheaper than Gemini 3 Pro.
DEFAULT_PREWARM_MODEL = "google/gemini-3.1-flash-lite"

# ────────────────────────────────────────────────────────────────
# Curated queries — every semantic domain we'd want instant.
# Multiple scripts per concept so users typing in Hebrew, Arabic,
# Amharic, Syriac, or Aramaic all hit the cache.
# ────────────────────────────────────────────────────────────────

CURATED: dict[str, list[str]] = {
    "numbers-arabic": [
        "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
        "مائة", "ألف",
    ],
    "numbers-hebrew": [
        "אחד", "שנים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר",
        "מאה", "אלף",
    ],
    "numbers-amharic": [
        "አንድ", "ሁለት", "ሦስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ", "አስር",
        "መቶ",
    ],
    "body-parts-arabic": [
        "رأس", "عين", "أذن", "فم", "لسان", "يد", "قلب", "دم", "رجل", "أنف", "شعر", "سن",
    ],
    "body-parts-hebrew": [
        "ראש", "עין", "אוזן", "פה", "לשון", "יד", "לב", "דם", "רגל", "אף", "שיער", "שן",
    ],
    "body-parts-amharic": [
        "ራስ", "አይን", "ጆሮ", "እጅ", "ልብ", "ደም", "እግር", "አፍንጫ", "ጥርስ",
    ],
    "kinship-arabic": [
        "أب", "أم", "أخ", "أخت", "ابن", "بنت", "زوج", "زوجة", "جد", "جدة",
    ],
    "kinship-hebrew": [
        "אב", "אם", "אח", "אחות", "בן", "בת", "אישה", "בעל", "סב", "סבתא",
    ],
    "kinship-amharic": [
        "አባት", "እናት", "ወንድም", "እህት", "ልጅ", "ሚስት", "ባል",
    ],
    "colors-arabic": [
        "أبيض", "أسود", "أحمر", "أصفر", "أخضر", "أزرق",
    ],
    "colors-hebrew": [
        "לבן", "שחור", "אדום", "צהוב", "ירוק", "כחול",
    ],
    "religion-arabic": [
        "الله", "دين", "صلاة", "كتاب", "نبي", "ملاك", "روح", "قدس",
    ],
    "religion-hebrew": [
        "אלוהים", "תורה", "שבת", "כהן", "מלך", "נביא", "רוח", "קדוש", "ספר",
    ],
    "peace-house-water": [
        # The classic pedagogical set
        "سلام", "بيت", "ماء",     # Arabic
        "שלום", "בית", "מים",      # Hebrew
        "ܫܠܡܐ", "ܒܝܬܐ", "ܡܝܐ",    # Syriac
        "ሰላም",                    # Amharic
    ],
    "common-verbs-arabic": [
        "كتب", "قرأ", "علم", "أكل", "شرب", "ذهب", "جاء", "قال", "سمع", "رأى",
    ],
    "common-verbs-hebrew": [
        "כתב", "קרא", "למד", "אכל", "שתה", "הלך", "בא", "אמר", "שמע", "ראה",
    ],
    "animals": [
        "كلب", "قط", "حمار", "جمل", "طير", "سمك",   # Arabic
        "כלב", "חתול", "חמור", "גמל", "עוף", "דג",    # Hebrew
    ],
    "food": [
        "خبز", "لحم", "حليب", "ماء", "زيت", "خمر",   # Arabic
        "לחם", "בשר", "חלב", "מים", "שמן", "יין",     # Hebrew
    ],
    "sound-law-showcase": [
        # Flagship *ṯ *ś *ḍ *ḫ *ġ etc.
        "ثلاثة",   # Ar 'three' — *ṯ split
        "שלוש",    # He 'three' — *ṯ → š
        "אזן",     # He 'ear' — *ḏ → z
        "أذن",     # Ar 'ear' — *ḏ preserved
        "أرض",     # Ar 'earth' — *ḍ preserved
        "ארץ",     # He 'earth' — *ḍ → ṣ
        "ארעא",    # Aram 'earth' — *ḍ → ʿ (famous)
        "خمسة",    # Ar 'five' — *ḫ preserved
        "חמש",     # He 'five' — *ḫ merged with ḥ
        "غراب",    # Ar 'raven' — *ġ preserved
        "עורב",    # He 'raven' — *ġ merged with ʕ
    ],
    "loan-stratum": [
        # Aramaic loans in Hebrew
        "אבא",     # Aramaic word borrowed into Hebrew (father)
        "אמא",     # Aramaic 'mother' in Hebrew
        "עסק",     # Aramaic 'business, matter' in Hebrew
        # Greek/Persian loans in Aramaic
        "פלטין",   # from Greek palation
        # Persian loans in Arabic
        "بستان",   # Persian 'garden'
        "ديوان",   # Persian 'divan, register'
    ],
    "syriac-classical": [
        "ܡܠܟܐ",     # king
        "ܟܬܒܐ",     # book
        "ܐܠܗܐ",    # God
        "ܥܒܕܐ",    # servant/slave
    ],
    "geez-classical": [
        "ንጉሥ",     # king
        "መጽሐፍ",   # book
        "እግዚአብሔር", # God (long compound)
    ],
    "inflected-samples": [
        # Exercise root extraction
        "הכתבתי",     # Hebrew 'I dictated' (root k-t-b)
        "אכתוב",      # Hebrew 'I will write' (root k-t-b)
        "الكتاب",     # Arabic 'the book' (with definite article)
        "كتابته",     # Arabic 'his book'
        "ንጉሥነት",     # Ge'ez 'kingship'
    ],
}


def normalize(text: str) -> str:
    """Cache key: NFC + casefold + trim. Matches the web API's normalization."""
    return unicodedata.normalize("NFC", text.strip().casefold())


def _cache_path(cache_dir: Path, query: str) -> Path:
    return cache_dir / f"{normalize(query)}.json"


def _prewarm_one(query: str, cache_dir: Path, force: bool) -> tuple[str, str]:
    path = _cache_path(cache_dir, query)
    if path.exists() and not force:
        return (query, "skip")
    try:
        result, usage = search(query)
    except Exception as e:
        return (query, f"error: {e}")
    payload = {
        "query": query,
        "normalized": normalize(query),
        "model": usage.model,
        "usage": {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cache_read_tokens": usage.cache_read_tokens,
        },
        "result": result.model_dump(mode="json"),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    return (query, "ok")


def main() -> int:
    parser = argparse.ArgumentParser(description="Prewarm the Semitic Search web cache.")
    parser.add_argument("--force", action="store_true", help="Re-run even if cached.")
    parser.add_argument("--dry-run", action="store_true", help="Print list, don't call.")
    parser.add_argument("--concurrency", type=int, default=6,
                        help="Parallel workers (default: 6).")
    parser.add_argument("--group", action="append", help="Only run these groups (repeatable).")
    parser.add_argument(
        "--model", default=DEFAULT_PREWARM_MODEL,
        help=f"OpenRouter model id (default: {DEFAULT_PREWARM_MODEL}).",
    )
    args = parser.parse_args()

    # search() reads TURKIC_/SEMITIC_ vars — the Semitic Search project uses
    # SEMITIC_SEARCH_PRIMARY_MODEL.
    os.environ["SEMITIC_SEARCH_PRIMARY_MODEL"] = args.model
    print(f"Model: {args.model}")

    project_root = Path(__file__).resolve().parents[1]
    cache_dir = project_root / "web" / "data" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    all_queries: list[str] = []
    seen: set[str] = set()
    for group, queries in CURATED.items():
        if args.group and group not in args.group:
            continue
        for q in queries:
            n = normalize(q)
            if n in seen:
                continue
            seen.add(n)
            all_queries.append(q)

    print(f"Curated: {len(all_queries)} unique queries, cache dir: {cache_dir}")
    if args.dry_run:
        for q in all_queries:
            print(f"  {q}  →  {_cache_path(cache_dir, q).name}")
        return 0

    ok = skip = err = 0
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futs = {pool.submit(_prewarm_one, q, cache_dir, args.force): q for q in all_queries}
        for fut in as_completed(futs):
            q, status = fut.result()
            if status == "ok":
                ok += 1
                print(f"  [ok  ]  {q}")
            elif status == "skip":
                skip += 1
                print(f"  [skip]  {q}")
            else:
                err += 1
                print(f"  [ERR ]  {q}: {status}", file=sys.stderr)

    print(f"\nDone. ok={ok}  skip={skip}  err={err}")
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
