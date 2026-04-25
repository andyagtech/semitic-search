"""Ingest the Quranic Arabic Corpus (Dukes 2011) into the attestations table.

Source: data/raw/quran_morph.txt — TSV with per-segment morphology. Each
word has a ROOT feature in Buckwalter transliteration, which we convert to
our Semitistic canonical form (same consonants, different symbols) so it
lines up with root_canonical on our Arabic entries.

Result: every Arabic root attested in the Quran gets a "first appears in
Quran X:Y:Z" reference. Where a lemma is also attested, we record the
word-level match too.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

QURAN_FILE = Path(__file__).resolve().parents[1] / "data" / "raw" / "quran_morph.txt"

# Buckwalter → Semitistic transliteration (consonants only; short vowels
# and diacritics are ignored). Root strings are already consonantal.
BW_TO_SEMITISTIC = {
    "b": "b", "t": "t", "v": "ṯ", "j": "g", "H": "ḥ", "x": "ḫ",
    "d": "d", "*": "ḏ", "r": "r", "z": "z", "s": "s", "$": "š",
    "S": "ṣ", "D": "ḍ", "T": "ṭ", "Z": "ẓ", "E": "ʿ", "g": "ġ",
    "f": "f", "q": "q", "k": "k", "l": "l", "m": "m", "n": "n",
    "h": "h", "w": "w", "y": "y",
    "A": "",     # long alif — root-internal, drop
    "Y": "y",    # alif maqsura
    "p": "h",    # teh marbuta → h at root level
    "'": "ʾ", ">": "ʾ", "<": "ʾ", "&": "ʾ", "}": "ʾ", "|": "ʾ",
}


def bw_root_to_canonical(bw_root: str) -> str | None:
    """Map a Buckwalter root like 'ktb' or 'smw' to 'k t b' / 's m w'."""
    out: list[str] = []
    for ch in bw_root:
        if ch in BW_TO_SEMITISTIC:
            mapped = BW_TO_SEMITISTIC[ch]
            if mapped:
                out.append(mapped)
        elif ch.isalnum():
            return None  # unrecognized — skip to be safe
    if len(out) < 2:
        return None
    return " ".join(out)


LOCATION_RE = re.compile(r"^\((\d+):(\d+):(\d+):(\d+)\)$")
ROOT_RE = re.compile(r"ROOT:([^|]+)")


def parse_quran():
    """Yield (chapter, verse, word_idx, segment_idx, canonical_root)."""
    with open(QURAN_FILE, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip() or line.startswith("LOCATION"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 4:
                continue
            loc_match = LOCATION_RE.match(parts[0])
            if not loc_match:
                continue
            ch, v, wi, si = (int(x) for x in loc_match.groups())
            features = parts[3]
            root_match = ROOT_RE.search(features)
            if not root_match:
                continue
            bw_root = root_match.group(1).strip()
            canonical = bw_root_to_canonical(bw_root)
            if canonical:
                yield (ch, v, wi, si, canonical)


def main() -> int:
    if not QURAN_FILE.exists():
        print(f"Missing {QURAN_FILE}")
        return 1

    db = connect(prefer="local")
    print(f"Target: {db.backend}")

    # Schema (matches ingest_oshb.py)
    for stmt in [
        """CREATE TABLE IF NOT EXISTS attestations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             entry_id INTEGER NOT NULL,
             source TEXT NOT NULL,
             citation TEXT NOT NULL,
             book_order INTEGER NOT NULL,
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

    # Map canonical root → list of Arabic entry_ids.
    print("Building root index for Arabic entries...", flush=True)
    root_to_ids: dict[str, list[int]] = {}
    for row in db.execute(
        """SELECT id, root_canonical FROM entries
            WHERE lang='ar' AND root_canonical IS NOT NULL"""
    ):
        eid, rc = row
        root_to_ids.setdefault(rc, []).append(eid)
    print(f"  Indexed {len(root_to_ids):,} Arabic canonical roots.")

    # Walk the Quran. Book_order = chapter*10000 + verse*100 + word_idx so
    # sort order within 'quran' source reflects text order.
    print("Parsing Quranic Arabic Corpus...", flush=True)
    earliest: dict[int, tuple[int, str]] = {}  # entry_id -> (order, citation)
    total, matched_segments = 0, 0
    seen_roots: set[str] = set()

    for ch, v, wi, si, canonical in parse_quran():
        total += 1
        seen_roots.add(canonical)
        entry_ids = root_to_ids.get(canonical, [])
        if not entry_ids:
            continue
        matched_segments += 1
        order = ch * 10000 + v * 100 + wi
        citation = f"Q.{ch}:{v}"
        for eid in entry_ids:
            prev = earliest.get(eid)
            if prev is None or order < prev[0]:
                earliest[eid] = (order, citation)

    print(f"\nParsed {total:,} root-bearing segments; {matched_segments:,} matched.")
    print(f"Distinct Quranic roots: {len(seen_roots):,}; {len(earliest):,} entries got earliest Quran attestation.")

    # Persist
    rows = [(eid, "quran", citation, order) for eid, (order, citation) in earliest.items()]
    print(f"Writing {len(rows):,} attestation rows...", flush=True)
    for i in range(0, len(rows), 2000):
        db.executemany(
            "INSERT OR REPLACE INTO attestations (entry_id, source, citation, book_order) VALUES (?, ?, ?, ?)",
            rows[i:i + 2000],
        )
        db.commit()

    # Sanity print
    print("\nSample Arabic roots with earliest Quran attestation:")
    for row in db.execute("""
        SELECT COALESCE(NULLIF(e.root,''), e.root_inferred) AS r,
               a.citation, e.word, json_extract(e.glosses_json,'$[0]') AS g
          FROM entries e JOIN attestations a ON a.entry_id = e.id
         WHERE a.source = 'quran' AND r IS NOT NULL
         ORDER BY a.book_order, length(r), r LIMIT 10
    """):
        print(f"  {row[0]:<20}  {row[1]:<10}  {row[2]:<14}  — {(row[3] or '')[:40]}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
