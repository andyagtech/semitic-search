"""Parse Wiktionary/Kaikki `derived` and `related` lists per entry into a
dedicated `derivations` table. Each row is a (parent_entry_id → child_word)
edge with a kind tag.

Many entries in our DB came from Kaikki dumps; this script re-parses those
original JSONL files (data/raw/*.jsonl), matches the parent to our existing
entries by (lang, word, etymology_number), and records one row per derived
or related lemma. Child lemmas are stored as surface strings — at render
time the UI joins back to entries.word / vocalized_form to find the
corresponding /roots/... destination.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"

# Kaikki dumps we originally ingested. Skip scraped_* files since those
# don't have derived/related sections.
SOURCES: list[tuple[str, str]] = [
    ("ar",  "arabic.jsonl"),
    ("he",  "hebrew.jsonl"),
    ("syc", "syriac.jsonl"),
    ("arc", "aramaic.jsonl"),
    ("aii", "assyrian_neo_aramaic.jsonl"),
    ("am",  "amharic.jsonl"),
    ("ti",  "tigrinya.jsonl"),
    ("gez", "geez.jsonl"),
    ("akk", "akkadian.jsonl"),
    ("ug",  "ugaritic.jsonl"),
]


def main() -> int:
    db = connect(prefer="local")
    print(f"Target: {db.backend}")

    for stmt in [
        """CREATE TABLE IF NOT EXISTS derivations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             parent_entry_id INTEGER NOT NULL,
             kind TEXT NOT NULL,
             child_word TEXT NOT NULL,
             child_roman TEXT,
             child_gloss TEXT,
             UNIQUE(parent_entry_id, kind, child_word)
           )""",
        "CREATE INDEX IF NOT EXISTS idx_derivations_parent ON derivations(parent_entry_id)",
        "CREATE INDEX IF NOT EXISTS idx_derivations_child ON derivations(child_word)",
    ]:
        try:
            db.execute(stmt)
        except Exception as e:
            if "already exists" not in str(e).lower():
                raise
    db.commit()

    # Build a lookup: (lang, word, etymology_number) → entry_id.
    # etymology_number is often None; we match by (lang, word) first and
    # fall back to the first entry_id for that pair if multiple exist.
    print("Building (lang, word) → entry_id index...", flush=True)
    entry_by_lw: dict[tuple[str, str], list[int]] = {}
    for row in db.execute("SELECT id, lang, word FROM entries"):
        eid, lang, word = row
        entry_by_lw.setdefault((lang, word), []).append(eid)
    print(f"  Indexed {sum(len(v) for v in entry_by_lw.values()):,} entries.")

    total_edges = 0
    edges_by_lang: dict[str, int] = {}
    writes: list[tuple[int, str, str, str | None, str | None]] = []

    for lang, fname in SOURCES:
        fp = RAW / fname
        if not fp.exists():
            print(f"  skip {lang}: {fname} not found")
            continue
        n_edges = 0
        with fp.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                word = d.get("word")
                if not word:
                    continue
                parents = entry_by_lw.get((lang, word))
                if not parents:
                    continue
                # Take the first entry_id — when etymology_number distinguishes
                # homographs we'd need to match on that too, but derived/related
                # are usually shared or under the primary entry anyway.
                pid = parents[0]

                for kind in ("derived", "related"):
                    items = d.get(kind)
                    if not isinstance(items, list):
                        continue
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        cw = item.get("word") or ""
                        if not cw:
                            continue
                        roman = item.get("roman")
                        # Kaikki sometimes has a "tags" or a sense gloss buried
                        # in _dis1 etc. — for now we skip glosses, render just
                        # the word + romanization.
                        writes.append((pid, kind, cw, roman, None))
                        n_edges += 1
        edges_by_lang[lang] = n_edges
        total_edges += n_edges
        print(f"  {lang}: {n_edges:,} derivation edges from {fname}")

    # Bulk insert
    print(f"\nWriting {len(writes):,} edges (dedup via UNIQUE constraint)...", flush=True)
    for i in range(0, len(writes), 2000):
        db.executemany(
            "INSERT OR IGNORE INTO derivations (parent_entry_id, kind, child_word, child_roman, child_gloss) VALUES (?, ?, ?, ?, ?)",
            writes[i:i + 2000],
        )
        db.commit()

    # Stats
    stats = list(db.execute("SELECT kind, COUNT(*) FROM derivations GROUP BY kind"))
    print("\nPersisted edges by kind:")
    for k, n in stats:
        print(f"  {k:<10}  {n:,}")

    # Sample
    print("\nSample derivations:")
    for row in db.execute("""
        SELECT e.lang, e.word, d.kind, d.child_word, d.child_roman
          FROM derivations d JOIN entries e ON e.id = d.parent_entry_id
         ORDER BY random() LIMIT 8
    """):
        print(f"  {row[0]}  {row[1]:<12}  {row[2]:<8}  → {row[3]:<18}  ({row[4] or ''})")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
