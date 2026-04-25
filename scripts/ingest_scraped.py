"""Ingest the Wiktionary-scraped Sabaean / OSA / Phoenician / Punic JSONL
into the same `entries` table used by the Kaikki ingest.

These languages have no Kaikki dumps. We scraped Category:X_lemmas with
scripts/scrape_wiktionary_semitic.py. Each entry has just {word, pos,
first_gloss}. We run the mechanical consonantal extractor over the word
to derive a root (purely script-based, no LLM), and store with
`root_inferred_source = 'consonantal_mechanical'`.

Skip single-letter entries (these are abjad letter descriptions, not
lemmas proper).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from semitic_search.consonantal_root import extract_root as extract_consonantal_root
from semitic_search.nwsemitic_root import extract_root as extract_nwsemitic_root

# For Turoyo (Syriac script) + Western NA (mixed Hebrew/Syriac) we use the
# nwsemitic abjad extractor; for Mandaic we have a dedicated extractor in
# consonantal_root under the 'mid' key.
NWSEMITIC_LANGS = {"tru", "amw"}

LANG_SECTION_TO_CODE: dict[str, str] = {
    "Sabaean": "sab",
    "Old South Arabian": "osa",
    "Phoenician": "phn",
    "Punic": "pun",
    "Turoyo": "tru",
    "Classical Mandaic": "mid",
    "Western Neo-Aramaic": "amw",
}

SCHEMA_STATEMENTS = [
    "ALTER TABLE entries ADD COLUMN root_inferred TEXT",
    "ALTER TABLE entries ADD COLUMN root_inferred_confidence TEXT",
    "ALTER TABLE entries ADD COLUMN root_inferred_source TEXT",
]

INSERT_SQL = """
INSERT OR IGNORE INTO entries
    (lang, word, etymology_number, pos, root, vocalized_form, romanization,
     glosses_json, etymology_text, wiktionary_title,
     root_inferred, root_inferred_confidence, root_inferred_source)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


def _ensure_columns(db) -> None:
    for stmt in SCHEMA_STATEMENTS:
        try:
            db.execute(stmt)
        except Exception:
            pass
    db.commit()


def main() -> int:
    from semitic_search.db import connect

    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    raw_dir = Path(__file__).resolve().parents[1] / "data" / "raw"
    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    _ensure_columns(db)

    print(f"\n{'lang':<5} {'file':<20} {'ingested':>10} {'with root':>12}")
    print("-" * 60)

    for section, code in LANG_SECTION_TO_CODE.items():
        filename = f"scraped_{code}.jsonl"
        path = raw_dir / filename
        if not path.exists():
            print(f"{code:<5} (missing: {filename})")
            continue

        # Fresh-start for this lang
        db.execute("DELETE FROM entries WHERE lang = ?", (code,))
        db.commit()

        rows: list[tuple] = []
        n_ingested = 0
        n_with_root = 0
        with path.open() as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except json.JSONDecodeError:
                    continue
                word = e.get("word")
                if not word:
                    continue
                # Single-char abjad entries → skip
                if len([ch for ch in word if ord(ch) > 0x10000]) < 2 and len(word) < 2:
                    continue

                pos = e.get("pos") or ""
                first_gloss = e.get("first_gloss") or ""
                glosses = [first_gloss] if first_gloss else []

                if code in NWSEMITIC_LANGS:
                    root = extract_nwsemitic_root(word, expected_length=3)
                    inferred_src = "nwsemitic_mechanical" if root else None
                else:
                    root = extract_consonantal_root(word, code, expected_length=3)
                    inferred_src = "consonantal_mechanical" if root else None
                inferred_conf = "high" if root and len(root.split()) == 3 else ("low" if root else None)

                rows.append((
                    code,
                    word,
                    None,  # etymology_number
                    pos,
                    None,  # root (gold) — we don't have it for scraped data
                    None,  # vocalized_form
                    None,  # romanization
                    json.dumps(glosses, ensure_ascii=False),
                    None,  # etymology_text
                    word,  # wiktionary_title
                    root,  # root_inferred
                    inferred_conf,
                    inferred_src,
                ))
                n_ingested += 1
                if root:
                    n_with_root += 1

                if len(rows) >= 200:
                    db.executemany(INSERT_SQL, rows)
                    db.commit()
                    rows.clear()
        if rows:
            db.executemany(INSERT_SQL, rows)
            db.commit()

        print(f"{code:<5} {filename:<20} {n_ingested:>10,} {n_with_root:>12,}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
