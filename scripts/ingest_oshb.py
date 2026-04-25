"""Ingest Open Scriptures Hebrew Bible (OSHB) morphology into an
`attestations` table.

Source: data/raw/oshb/*.xml — 39 OSIS-format files covering the full Tanakh,
each word tagged with Strong's number (the `lemma` attribute) and surface
form with niqqud/te'amim.

For each Hebrew word in OSHB we:
  1. Strip niqqud + te'amim to get a consonantal form.
  2. Join against our entries table on the consonantal form of word/
     vocalized_form (same stripping logic).
  3. Record one attestation row per matched entry, keyed by the earliest
     (book, chapter, verse) the word appears.

The result: every Hebrew lemma in our DB that appears in the Tanakh gets
a "first attested in Gen.1.1" reference. Aggregating up the root level lets
/roots/[slug] show the earliest Tanakh attestation for Biblical Hebrew.
"""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

OSHB_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "oshb"
NS = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}

# OSIS book abbreviations → canonical order index. Used for sorting to find
# the EARLIEST attestation across a word's multiple occurrences.
BOOK_ORDER = [
    "Gen", "Exod", "Lev", "Num", "Deut",
    "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
    "1Chr", "2Chr", "Ezra", "Neh", "Esth",
    "Job", "Ps", "Prov", "Eccl", "Song",
    "Isa", "Jer", "Lam", "Ezek", "Dan",
    "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic",
    "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
]
BOOK_ORDER_INDEX = {b: i for i, b in enumerate(BOOK_ORDER)}

# Niqqud (U+05B0–U+05BD, U+05BF, U+05C1–U+05C2, U+05C4–U+05C5, U+05C7)
# and te'amim / cantillation marks (U+0591–U+05AF). Stripping these gives
# the consonantal skeleton.
NIQQUD_RE = re.compile(r"[֑-ְ֯-ֽֿׁ-ׂׄ-ׇׅ]")


def strip_pointing(s: str) -> str:
    """Remove niqqud/te'amim + morpheme-boundary slashes that OSHB uses."""
    if not s:
        return ""
    s = NIQQUD_RE.sub("", s)
    # OSHB uses '/' to delimit morphemes inside a word. We want the base
    # consonantal string, so drop these.
    s = s.replace("/", "")
    # Maqqef (־) also joins words sometimes.
    s = s.replace("־", "")
    return s


def parse_book(xml_path: Path, book: str):
    """Yield (book, chapter, verse, word_position, consonantal, lemmas) tuples."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    for verse in root.iter(f"{{{NS['osis']}}}verse"):
        osis_id = verse.get("osisID", "")
        if not osis_id:
            continue
        parts = osis_id.split(".")
        if len(parts) != 3:
            continue
        _book, chapter, verse_num = parts
        for idx, w in enumerate(verse.iter(f"{{{NS['osis']}}}w")):
            text = (w.text or "").strip()
            consonantal = strip_pointing(text)
            if not consonantal:
                continue
            lemma_attr = w.get("lemma", "")
            yield (book, int(chapter), int(verse_num), idx, consonantal, lemma_attr)


def main() -> int:
    if not OSHB_DIR.is_dir():
        print(f"Missing {OSHB_DIR}; run the download step first.")
        return 1

    db = connect(prefer="local")
    print(f"Target: {db.backend}")

    # Schema
    for stmt in [
        """CREATE TABLE IF NOT EXISTS attestations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             entry_id INTEGER NOT NULL,
             source TEXT NOT NULL,     -- 'tanakh' | 'quran' | ...
             citation TEXT NOT NULL,   -- e.g. 'Gen.1.1' or 'Q.2:30'
             book_order INTEGER NOT NULL,  -- for sorting within a source
             UNIQUE(entry_id, source, citation)
           )""",
        "CREATE INDEX IF NOT EXISTS idx_attestations_entry ON attestations(entry_id)",
        "CREATE INDEX IF NOT EXISTS idx_attestations_source ON attestations(source)",
    ]:
        try:
            db.execute(stmt)
        except Exception as e:
            if "already exists" not in str(e).lower():
                raise
    db.commit()

    # Build a lookup: consonantal Hebrew word → list of entry_ids.
    print("Building consonantal-form index for Hebrew entries...", flush=True)
    word_to_ids: dict[str, list[int]] = {}
    for row in db.execute(
        """SELECT id, word, vocalized_form FROM entries WHERE lang = 'he'"""
    ):
        eid, word, voc = row
        for form in (word, voc):
            if not form:
                continue
            key = strip_pointing(form)
            if key:
                word_to_ids.setdefault(key, []).append(eid)
    print(f"  Indexed {len(word_to_ids):,} distinct consonantal forms.", flush=True)

    # Walk OSHB and accumulate earliest attestation per entry_id.
    print("Parsing OSHB XML files...", flush=True)
    earliest: dict[int, tuple[int, str, str]] = {}  # entry_id -> (book_order, citation, verse_word)
    total_words = 0
    total_matches = 0

    for xml_path in sorted(OSHB_DIR.glob("*.xml")):
        book = xml_path.stem
        book_idx = BOOK_ORDER_INDEX.get(book, 999)
        book_words = 0
        book_matches = 0
        for b, ch, v, wi, consonantal, lemma in parse_book(xml_path, book):
            total_words += 1
            book_words += 1
            matches = word_to_ids.get(consonantal)
            if not matches:
                continue
            citation = f"{b}.{ch}.{v}"
            total_matches += 1
            book_matches += 1
            for eid in matches:
                prev = earliest.get(eid)
                if prev is None or book_idx < prev[0]:
                    earliest[eid] = (book_idx, citation, consonantal)
        print(f"  {book:<8} {book_words:>6,} words  {book_matches:>5,} matches", flush=True)

    print(f"\nTotal: {total_words:,} OSHB words; {total_matches:,} matched into {len(earliest):,} distinct entries.")

    # Persist. One attestation per (entry_id, earliest_citation).
    rows = [(eid, "tanakh", citation, book_idx) for eid, (book_idx, citation, _) in earliest.items()]
    print(f"Writing {len(rows):,} attestation rows...", flush=True)
    for i in range(0, len(rows), 2000):
        db.executemany(
            "INSERT OR REPLACE INTO attestations (entry_id, source, citation, book_order) VALUES (?, ?, ?, ?)",
            rows[i:i + 2000],
        )
        db.commit()

    # Sanity print: earliest Hebrew roots in the Tanakh.
    print("\nSample roots with earliest Tanakh attestation:")
    for row in db.execute("""
        SELECT COALESCE(NULLIF(e.root,''), e.root_inferred) AS r,
               a.citation, e.word, json_extract(e.glosses_json,'$[0]') AS g
          FROM entries e JOIN attestations a ON a.entry_id = e.id
         WHERE a.source = 'tanakh' AND r IS NOT NULL
         ORDER BY a.book_order, length(r), r LIMIT 10
    """):
        print(f"  {row[0]:<20}  {row[1]:<12}  {row[2]:<14}  — {(row[3] or '')[:40]}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
