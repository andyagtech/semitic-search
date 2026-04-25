"""Scrape Wiktionary for Semitic languages with no Kaikki dump.

Sabaean, Phoenician, Punic, and Old South Arabian are not in Kaikki's
per-language dumps (verified 2026-04-19). But Wiktionary still has them as
Category:X_lemmas pages with real entries, which we can pull via the
MediaWiki API and store directly in our index.

For each target lang:
  1. Enumerate all lemmas via `list=categorymembers` (paginate with cmcontinue).
  2. Fetch each lemma's page wikitext via `action=parse&prop=wikitext` or
     just take the title + a stub gloss from the category member data.
  3. Run our rule-based consonantal-root extractor and store.

One JSONL written per lang to data/raw/scraped_<lang>.jsonl so the ingest
pipeline can treat them the same way as Kaikki dumps.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Iterator

import urllib.parse
import urllib.request

# Wiktionary category → our lang code. Both Sabaean and Old South Arabian
# lemmas are in the Old-South-Arabian script (U+10A60–U+10A7F) and our
# extractor treats them identically.
TARGETS: list[tuple[str, str, str]] = [
    ("sab", "Sabaean", "Sabaean"),
    ("osa", "Old South Arabian", "Old South Arabian"),
    ("phn", "Phoenician", "Phoenician"),
    ("pun", "Punic", "Punic"),
    ("tru", "Turoyo", "Turoyo"),
    ("mid", "Classical Mandaic", "Classical Mandaic"),
    ("amw", "Western Neo-Aramaic", "Western Neo-Aramaic"),
]

API = "https://en.wiktionary.org/w/api.php"
USER_AGENT = "semitic-search/0.1 (https://semitic-search.andy-barr.com; andy@example.com)"


def _api_get(params: dict) -> dict:
    qs = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(f"{API}?{qs}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def list_lemmas(category: str) -> Iterator[str]:
    """Paginated enumeration of all lemma titles in a Wiktionary category."""
    cmcontinue: str | None = None
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}_lemmas",
            "cmlimit": "500",
            "cmtype": "page",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue
        data = _api_get(params)
        for m in data.get("query", {}).get("categorymembers", []):
            title = m.get("title")
            if title:
                yield title
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            return
        cmcontinue = cont
        time.sleep(0.2)  # be polite


def fetch_entry(title: str, lang_section: str) -> dict | None:
    """Fetch a single lemma's entry and extract the section for this language.

    We use `action=parse&prop=wikitext` and grep the section header. For v1
    we only extract: title + section text + any etymology / pos / gloss
    templates we can find with cheap regexes. No full wikitext parsing.
    """
    data = _api_get({
        "action": "parse",
        "page": title,
        "prop": "wikitext",
    })
    wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
    if not wikitext:
        return None

    # Extract the target language section (`==Language==`)
    import re
    pattern = re.compile(
        rf"^==\s*{re.escape(lang_section)}\s*==\s*\n(.*?)(?=^==[^=]|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(wikitext)
    if not m:
        return None
    section = m.group(1)

    # Pull the first gloss from a `# ...` line
    gloss = None
    for line in section.splitlines():
        if line.startswith("# ") and not line.startswith("#:"):
            g = line[2:].strip()
            # Strip wiki-link brackets [[...]] but keep display text
            g = re.sub(r"\[\[([^\[\]|]+)\|([^\[\]]+)\]\]", r"\2", g)
            g = re.sub(r"\[\[([^\[\]]+)\]\]", r"\1", g)
            g = re.sub(r"\{\{[^}]+\}\}", "", g).strip()
            if g:
                gloss = g
                break

    # Crude POS detection from section headers
    pos_match = re.search(r"^===\s*(Noun|Verb|Adjective|Preposition|Pronoun|Proper noun|Numeral)\s*===", section, re.MULTILINE)
    pos = (pos_match.group(1).lower() if pos_match else "")

    return {"word": title, "lang_section": lang_section, "pos": pos, "first_gloss": gloss}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-only", action="store_true", help="Just count lemmas, don't fetch pages")
    parser.add_argument("--max-per-lang", type=int, default=10_000)
    args = parser.parse_args()

    out_dir = Path(__file__).resolve().parents[1] / "data" / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"{'code':<5} {'category':<22} {'lemmas':>8}  {'path'}")
    print("-" * 70)

    for code, category, lang_section in TARGETS:
        titles = list(list_lemmas(category))
        total = len(titles)
        out_path = out_dir / f"scraped_{code}.jsonl"
        print(f"{code:<5} {category:<22} {total:>8}  {out_path.name}", flush=True)

        if args.list_only or total == 0:
            continue

        # Fetch at most max_per_lang pages. For small OSA/PHN that's all of them.
        to_fetch = titles[: args.max_per_lang]
        with out_path.open("w", encoding="utf-8") as f:
            for i, title in enumerate(to_fetch, 1):
                entry = fetch_entry(title, lang_section)
                if entry is None:
                    continue
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                if i % 50 == 0:
                    print(f"  {code}: {i}/{len(to_fetch)}", flush=True)
                time.sleep(0.3)  # rate limit to be polite

    return 0


if __name__ == "__main__":
    sys.exit(main())
