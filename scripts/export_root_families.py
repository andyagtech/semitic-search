"""Export the top polyglot root families to a JSON file the web app can read.

Each family: {
  canonical: "k l b",
  slug: "k-l-b",
  lang_count: 11,
  lemma_count: 25,
  languages: ["ar", "he", "syc", ...],
  lemmas: {
    "ar": [{word, vocalized_form, romanization, pos, gloss, root_source}, ...],
    "he": [...],
    ...
  }
}

Written to web/public/data/root_families.json for server-side + client-side
consumption. Keep the file small — just the top N families.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import re
from collections import Counter

from semitic_search.canonical_root import canonical
from semitic_search.db import connect

# Short English stopwords for keyword extraction. Intentionally small —
# the point is to keep content words like "write", "book", "scripture".
STOPWORDS: set[str] = {
    "a", "an", "the", "of", "and", "or", "to", "for", "from", "in", "on",
    "at", "by", "with", "as", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "having", "do", "does", "did", "done",
    "this", "that", "these", "those", "it", "its", "their", "there", "here",
    "which", "who", "whom", "whose", "what", "when", "where", "why", "how",
    "can", "could", "will", "would", "shall", "should", "may", "might",
    "one", "two", "three", "many", "much", "some", "any", "all", "each",
    "every", "no", "not", "nor", "but", "if", "so", "too", "very",
    "same", "other", "another", "more", "most", "less", "least",
    "also", "such", "like", "kind", "sort", "way", "form", "type",
    "used", "use", "using", "make", "made", "making", "get", "got",
    "take", "taken", "taking", "give", "given", "giving", "go", "went",
    "come", "came", "coming", "see", "seen", "saw", "seeing",
    "related", "forming", "relating", "pertaining", "regarding",
    "singular", "plural", "form", "forms", "masculine", "feminine", "neuter",
    "third", "second", "first", "person", "construct", "absolute", "state",
    "definite", "indefinite", "verbal", "noun", "nominal", "adjective", "adverb",
    "present", "past", "future", "perfect", "imperfect", "participle",
    "active", "passive", "active participle", "passive participle",
    "plural form", "feminine form", "masculine form",
    "alternative", "alternate", "variant", "spelling", "form of",
    "his", "her", "their", "my", "your", "our", "us", "me", "we", "you",
    "he", "she", "they", "them", "him",
    "into", "onto", "out", "up", "down", "off", "over", "under", "again",
    "also", "still", "just", "only", "even", "ever", "never", "now", "then",
    "new", "old", "different", "other",
}


def extract_themes(glosses: list[str], top_k: int = 3) -> list[tuple[str, int]]:
    """Find the most common content words across a list of English glosses.
    Returns [(word, count), ...] capped at top_k, only if count >= 2."""
    counter: Counter[str] = Counter()
    for g in glosses:
        if not g:
            continue
        # Simple tokenize: lowercase + split on non-letters
        for tok in re.findall(r"[a-z]+", g.lower()):
            if len(tok) < 3 or tok in STOPWORDS:
                continue
            counter[tok] += 1
    # Keep only words appearing at least twice
    filtered = [(w, c) for w, c in counter.most_common(top_k * 4) if c >= 2]
    return filtered[:top_k]

LANG_NAME = {
    "ar": "Arabic", "he": "Hebrew", "syc": "Classical Syriac",
    "am": "Amharic", "ti": "Tigrinya", "gez": "Ge'ez",
    "ug": "Ugaritic", "akk": "Akkadian",
    "arc": "Imperial Aramaic", "aii": "Assyrian Neo-Aramaic",
    "sab": "Sabaean", "osa": "Old South Arabian",
    "phn": "Phoenician", "pun": "Punic",
    "tru": "Turoyo", "mid": "Classical Mandaic", "amw": "Western Neo-Aramaic",
}

# Natural presentation order: chronologically earliest / most archaic first,
# then related modern forms grouped after.
LANG_ORDER = ["akk", "ug", "phn", "pun", "sab", "osa", "arc", "syc", "aii",
              "he", "ar", "gez", "am", "ti", "tru", "mid", "amw"]


def slugify(canonical_key: str) -> str:
    # "k l b" -> "k-l-b"; "ʾ k l" -> "ʾ-k-l"
    return canonical_key.replace(" ", "-")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=60)
    parser.add_argument("--min-langs", type=int, default=5)
    parser.add_argument("--max-lemmas-per-lang", type=int, default=8)
    parser.add_argument("--output", default=None, help="Write JSON here (default web/public/data/root_families.json)")
    args = parser.parse_args()

    db = connect(prefer="local")
    rows = db.execute(
        """SELECT e.id, e.lang, e.word, e.vocalized_form, e.romanization, e.pos,
                  COALESCE(NULLIF(e.root, ''), e.root_inferred) AS r,
                  COALESCE(json_extract(e.glosses_json, '$[0]'), '') AS gloss,
                  CASE WHEN e.root IS NOT NULL THEN 'gold'
                       ELSE COALESCE(e.root_inferred_source, 'inferred') END AS src,
                  e.etymology_text AS etym
             FROM entries e
            WHERE COALESCE(NULLIF(e.root, ''), e.root_inferred) IS NOT NULL"""
    )
    rows = list(rows)
    # Pull earliest attestation per entry_id in one sweep.
    att_rows = list(db.execute(
        """SELECT entry_id, source, citation, book_order
             FROM attestations ORDER BY entry_id, book_order ASC"""
    ))
    earliest_att: dict[int, dict] = {}
    for eid, source, citation, order in att_rows:
        if eid not in earliest_att:
            earliest_att[eid] = {"source": source, "citation": citation, "order": order}

    # Pull derivations per entry_id (kind, child_word, child_roman).
    deriv_rows: list = []
    try:
        deriv_rows = list(db.execute(
            "SELECT parent_entry_id, kind, child_word, child_roman FROM derivations"
        ))
    except Exception:
        pass  # Table may not exist yet on older local DBs.
    derivs_by_entry: dict[int, list[dict]] = {}
    for pid, kind, cw, cr in deriv_rows:
        (derivs_by_entry.setdefault(pid, [])).append({
            "kind": kind, "word": cw, "roman": cr,
        })
    db.close()

    families: dict[str, dict] = {}
    for eid, lang, word, voc, rom, pos, r, gloss, src, etym in rows:
        key = canonical(r)
        if key is None:
            continue
        f = families.setdefault(key, {
            "canonical": key,
            "slug": slugify(key),
            "lemmas": defaultdict(list),
            "earliest_attestation": None,
        })
        att = earliest_att.get(eid)
        derivs = derivs_by_entry.get(eid, [])
        # Trim etymology_text to a usable snippet — full Wiktionary etymologies
        # can run multiple paragraphs; first ~300 chars captures the core claim.
        etym_snippet: str | None = None
        if etym:
            trimmed = etym.strip().split("\n")[0]
            etym_snippet = trimmed if len(trimmed) <= 320 else trimmed[:320].rsplit(" ", 1)[0] + "…"
        f["lemmas"][lang].append({
            "word": word,
            "vocalized_form": voc,
            "romanization": rom,
            "pos": pos,
            "gloss": gloss,
            "root": r,
            "source": src,
            "attestation": {"source": att["source"], "citation": att["citation"]} if att else None,
            "derivations": derivs[:8] if derivs else None,
            "etymology": etym_snippet,
        })
        # Update the root-family-level earliest if this lemma has a tighter one.
        if att is not None:
            # Compose a sortable key: source-priority then book_order. Tanakh (600 BCE)
            # is older than Qur'an (610 CE); give tanakh priority 0, quran priority 1.
            # Chronological priority: older source wins. Tanakh (c. 1200–400 BCE)
            # first, Targum Onkelos (c. 2nd c. CE), Mishnah (c. 200 CE), then
            # Qur'an (c. 610 CE). Within a source, book_order breaks ties.
            # Priority ordering (older first): Tanakh → Onkelos/Neofiti/Jerusalem →
            # Jonathan → Mishnah → Mu'allaqat → Qur'an. Targums and Mishnah are
            # both 2nd c. CE but scripture-parallel Targums are ordered before
            # rabbinic Mishnah. The Mu'allaqat (6th c. CE Jahiliyya poetry) are
            # the pre-Islamic Arabic anchor — ordered before the Qur'an.
            src_priority = {
                "tanakh": 0, "onkelos": 1, "neofiti": 1, "jerusalem": 1,
                "jonathan": 2, "mishnah": 3, "mualaqat": 4, "quran": 5,
            }.get(att["source"], 9)
            candidate = (src_priority, att["order"])
            current = f["earliest_attestation"]
            current_pri = {
                "tanakh": 0, "onkelos": 1, "neofiti": 1, "jerusalem": 1,
                "jonathan": 2, "mishnah": 3, "mualaqat": 4, "quran": 5,
            }.get(current["source"] if current else "", 9)
            if current is None or candidate < (current_pri, current["order"]):
                f["earliest_attestation"] = {
                    "source": att["source"], "citation": att["citation"], "order": att["order"],
                }

    # Finalize: cap per-lang lemma count, sort languages, compute totals
    out: list[dict] = []
    for key, fam in families.items():
        lemmas_by_lang: dict[str, list] = {}
        for lang, items in fam["lemmas"].items():
            # Rank within a language: gold first, then shortest surface form first
            items.sort(key=lambda x: (0 if x["source"] == "gold" else 1, len(x["word"]), x["word"]))
            # Dedupe: collapse rows sharing the same (word, vocalized, pos) —
            # keeps the linguistically distinct homographs (different vocalizations)
            # but drops true duplicates from multi-sense Kaikki entries.
            seen: set[tuple[str, str, str]] = set()
            deduped: list[dict] = []
            for x in items:
                key_ = (x["word"], x.get("vocalized_form") or "", x["pos"])
                if key_ in seen:
                    continue
                seen.add(key_)
                deduped.append(x)
            lemmas_by_lang[lang] = deduped[: args.max_lemmas_per_lang]

        if len(lemmas_by_lang) < args.min_langs:
            continue
        # Sort keys by chronological/genealogical order
        ordered = {l: lemmas_by_lang[l] for l in LANG_ORDER if l in lemmas_by_lang}
        # Tack on any remaining (shouldn't happen but defensive)
        for l in lemmas_by_lang:
            if l not in ordered:
                ordered[l] = lemmas_by_lang[l]
        # Compute semantic themes from the combined glosses of all lemmas
        all_glosses: list[str] = []
        for items in ordered.values():
            for x in items:
                if x.get("gloss"):
                    all_glosses.append(x["gloss"])
        themes = extract_themes(all_glosses, top_k=5)

        out.append({
            "canonical": fam["canonical"],
            "slug": fam["slug"],
            "lang_count": len(ordered),
            "lemma_count": sum(len(v) for v in ordered.values()),
            "languages": list(ordered.keys()),
            "language_names": {l: LANG_NAME.get(l, l) for l in ordered.keys()},
            "earliest_attestation": fam.get("earliest_attestation"),
            "themes": [{"word": w, "count": c} for w, c in themes],
            "lemmas": ordered,
        })

    # Rank: langs desc, then lemma count desc
    out.sort(key=lambda f: (-f["lang_count"], -f["lemma_count"]))
    out = out[: args.top]

    output_path = Path(args.output) if args.output else (
        Path(__file__).resolve().parents[1] / "web" / "public" / "data" / "root_families.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    size = output_path.stat().st_size
    print(f"Wrote {len(out)} families ({size:,} bytes) to {output_path}")

    # Also emit a tiny client-accessible slug manifest so the home page can
    # cheaply check whether a given canonical root has a dedicated page.
    manifest_path = output_path.parent / "family_slugs.json"
    slug_summary = [
        {"slug": f["slug"], "canonical": f["canonical"], "lang_count": f["lang_count"], "lemma_count": f["lemma_count"]}
        for f in out
    ]
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(slug_summary, f, ensure_ascii=False)
    print(f"Wrote slug manifest ({manifest_path.stat().st_size:,} bytes) to {manifest_path}")
    if out:
        print("\nTop 10:")
        for fam in out[:10]:
            print(f"  /roots/{fam['slug']}   {fam['lang_count']} langs · {fam['lemma_count']} lemmas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
