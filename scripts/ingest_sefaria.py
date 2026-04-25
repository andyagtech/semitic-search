"""Match Mishnah + Targum Onkelos words against our Hebrew / Aramaic entries
and add `attestations` rows with rabbinic citations like "m. Ber. 1:1" and
"tg. Onk. Gen 1:1".

Sefaria JSON files (from fetch_sefaria.py) contain vocalized Hebrew / Aramaic
text per chapter. We strip niqqud + te'amim to get a consonantal form, then
join against entries.word / entries.vocalized_form (consonantal-form indexed).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

BASE = Path(__file__).resolve().parents[1] / "data" / "raw" / "sefaria"

# Book-order bucket for sortable ordering inside the attestations table.
# 3000 range = post-Tanakh (after 2000 range for Hebrew Bible).
BOOK_ORDER_BASE = {
    "mishnah": 3000,
    "targum onkelos":  2100,  # 2nd c. CE Aramaic Torah rendering
    "targum jonathan": 2200,  # Aramaic Prophets
    "targum neofiti":  2150,  # alt Aramaic Torah (Palestinian tradition)
    "targum jerusalem": 2175, # Fragment Targum on Torah
}

# Compact tractate/book abbreviations for citation display. Follows the
# SBL Handbook of Style for rabbinic texts where possible.
MISHNAH_ABBR = {
    "Mishnah Berakhot": "m. Ber.", "Mishnah Peah": "m. Peah", "Mishnah Demai": "m. Dem.",
    "Mishnah Kilayim": "m. Kil.", "Mishnah Sheviit": "m. Shev.", "Mishnah Terumot": "m. Ter.",
    "Mishnah Maasrot": "m. Ma'as.", "Mishnah Maaser Sheni": "m. M.Sh.", "Mishnah Challah": "m. Hal.",
    "Mishnah Orlah": "m. Orl.", "Mishnah Bikkurim": "m. Bik.",
    "Mishnah Shabbat": "m. Shab.", "Mishnah Eruvin": "m. Eruv.", "Mishnah Pesachim": "m. Pes.",
    "Mishnah Shekalim": "m. Sheq.", "Mishnah Yoma": "m. Yoma", "Mishnah Sukkah": "m. Suk.",
    "Mishnah Beitzah": "m. Bei.", "Mishnah Rosh Hashanah": "m. R.H.", "Mishnah Taanit": "m. Taʿan.",
    "Mishnah Megillah": "m. Meg.", "Mishnah Moed Katan": "m. M.Q.", "Mishnah Chagigah": "m. Hag.",
    "Mishnah Yevamot": "m. Yev.", "Mishnah Ketubot": "m. Ket.", "Mishnah Nedarim": "m. Ned.",
    "Mishnah Nazir": "m. Naz.", "Mishnah Sotah": "m. Sot.", "Mishnah Gittin": "m. Git.",
    "Mishnah Kiddushin": "m. Qid.",
    "Mishnah Bava Kamma": "m. B.Q.", "Mishnah Bava Metzia": "m. B.M.",
    "Mishnah Bava Batra": "m. B.B.", "Mishnah Sanhedrin": "m. San.",
    "Mishnah Makkot": "m. Mak.", "Mishnah Shevuot": "m. Shev.",
    "Mishnah Eduyot": "m. Ed.", "Mishnah Avodah Zarah": "m. A.Z.",
    "Pirkei Avot": "m. Avot", "Mishnah Horayot": "m. Hor.",
    "Mishnah Zevachim": "m. Zev.", "Mishnah Menachot": "m. Men.",
    "Mishnah Chullin": "m. Hul.", "Mishnah Bekhorot": "m. Bek.",
    "Mishnah Arakhin": "m. Arak.", "Mishnah Temurah": "m. Tem.",
    "Mishnah Keritot": "m. Ker.", "Mishnah Meilah": "m. Meil.",
    "Mishnah Tamid": "m. Tam.", "Mishnah Middot": "m. Mid.", "Mishnah Kinnim": "m. Qin.",
    "Mishnah Kelim": "m. Kel.", "Mishnah Oholot": "m. Ohol.",
    "Mishnah Negaim": "m. Neg.", "Mishnah Parah": "m. Par.",
    "Mishnah Tahorot": "m. Toh.", "Mishnah Mikvaot": "m. Miq.",
    "Mishnah Niddah": "m. Nid.", "Mishnah Makhshirin": "m. Makh.",
    "Mishnah Zavim": "m. Zav.", "Mishnah Tevul Yom": "m. T.Y.",
    "Mishnah Yadayim": "m. Yad.", "Mishnah Uktzin": "m. Uqts.",
}
ONKELOS_ABBR = {
    "Onkelos Genesis": "tg. Onk. Gen",
    "Onkelos Exodus": "tg. Onk. Exod",
    "Onkelos Leviticus": "tg. Onk. Lev",
    "Onkelos Numbers": "tg. Onk. Num",
    "Onkelos Deuteronomy": "tg. Onk. Deut",
}

# Targum Jonathan — Aramaic rendering of the Prophets.
JONATHAN_ABBR = {
    "Targum Jonathan on Joshua":    "tg. Jon. Josh",
    "Targum Jonathan on Judges":    "tg. Jon. Judg",
    "Targum Jonathan on I Samuel":  "tg. Jon. 1 Sam",
    "Targum Jonathan on II Samuel": "tg. Jon. 2 Sam",
    "Targum Jonathan on I Kings":   "tg. Jon. 1 Kgs",
    "Targum Jonathan on II Kings":  "tg. Jon. 2 Kgs",
    "Targum Jonathan on Isaiah":    "tg. Jon. Isa",
    "Targum Jonathan on Jeremiah":  "tg. Jon. Jer",
    "Targum Jonathan on Ezekiel":   "tg. Jon. Ezek",
    "Targum Jonathan on Hosea":     "tg. Jon. Hos",
    "Targum Jonathan on Joel":      "tg. Jon. Joel",
    "Targum Jonathan on Amos":      "tg. Jon. Amos",
    "Targum Jonathan on Obadiah":   "tg. Jon. Obad",
    "Targum Jonathan on Jonah":     "tg. Jon. Jonah",
    "Targum Jonathan on Micah":     "tg. Jon. Mic",
    "Targum Jonathan on Nahum":     "tg. Jon. Nah",
    "Targum Jonathan on Habakkuk":  "tg. Jon. Hab",
    "Targum Jonathan on Zephaniah": "tg. Jon. Zeph",
    "Targum Jonathan on Haggai":    "tg. Jon. Hag",
    "Targum Jonathan on Zechariah": "tg. Jon. Zech",
    "Targum Jonathan on Malachi":   "tg. Jon. Mal",
}

NEOFITI_ABBR = {
    "Targum Neofiti, Genesis":     "tg. Neof. Gen",
    "Targum Neofiti, Exodus":      "tg. Neof. Exod",
    "Targum Neofiti, Leviticus":   "tg. Neof. Lev",
    "Targum Neofiti, Numbers":     "tg. Neof. Num",
    "Targum Neofiti, Deuteronomy": "tg. Neof. Deut",
}

JERUSALEM_ABBR = {
    "Targum Jerusalem, Genesis":     "tg. Jer. Gen",
    "Targum Jerusalem, Exodus":      "tg. Jer. Exod",
    "Targum Jerusalem, Leviticus":   "tg. Jer. Lev",
    "Targum Jerusalem, Numbers":     "tg. Jer. Num",
    "Targum Jerusalem, Deuteronomy": "tg. Jer. Deut",
}

# Niqqud + te'amim range. Matches Hebrew and Aramaic since both use the
# Hebrew Unicode block.
POINTING_RE = re.compile(r"[֑-ׇ]")


def strip_pointing(s: str) -> str:
    if not s:
        return ""
    return POINTING_RE.sub("", s).replace("־", "")


def flatten_text(node) -> list[str]:
    """Sefaria text field can be str, list[str], list[list[str]] (for some
    nested structures like Mishnah with mishnayot-per-chapter). Walk and
    yield flat strings."""
    if isinstance(node, str):
        return [node]
    if isinstance(node, list):
        out: list[str] = []
        for item in node:
            out.extend(flatten_text(item))
        return out
    return []


def load_chapters(work_dir: Path):
    """Yield (ref, [verses]) pairs from a work subdirectory."""
    for fp in sorted(work_dir.glob("*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        ref = data["ref"]
        verses = flatten_text(data["text"])
        yield ref, verses


def main() -> int:
    if not BASE.exists():
        print(f"Missing {BASE}; run fetch_sefaria.py first.")
        return 1

    db = connect(prefer="local")
    print(f"Target: {db.backend}")

    # Ensure attestations schema (might already exist from OSHB/Quran ingest)
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

    # Build consonantal-form index for Hebrew + Aramaic (Imperial Aramaic).
    print("Building consonantal index for Hebrew + Aramaic entries...", flush=True)
    word_to_ids: dict[tuple[str, str], list[int]] = {}
    for row in db.execute(
        """SELECT id, lang, word, vocalized_form
             FROM entries WHERE lang IN ('he', 'arc')"""
    ):
        eid, lang, word, voc = row
        for form in (word, voc):
            if not form:
                continue
            key = strip_pointing(form)
            if key:
                word_to_ids.setdefault((lang, key), []).append(eid)
    print(f"  Indexed {len(word_to_ids):,} (lang, consonantal) pairs.")

    # Process Mishnah → he, Targums → arc
    works: list[tuple[str, str, str, dict, int, str]] = [
        # (subdir, source_code, match_lang, abbreviation map, order_base, target_lang_for_index)
        ("mishnah",           "mishnah",  "he",  MISHNAH_ABBR,   BOOK_ORDER_BASE["mishnah"],          "Hebrew"),
        ("targum_onkelos",    "onkelos",  "arc", ONKELOS_ABBR,   BOOK_ORDER_BASE["targum onkelos"],   "Aramaic (Onkelos)"),
        ("targum_jonathan",   "jonathan", "arc", JONATHAN_ABBR,  BOOK_ORDER_BASE["targum jonathan"],  "Aramaic (Jonathan on Prophets)"),
        ("targum_neofiti",    "neofiti",  "arc", NEOFITI_ABBR,   BOOK_ORDER_BASE["targum neofiti"],   "Aramaic (Neofiti on Torah)"),
        ("targum_jerusalem",  "jerusalem","arc", JERUSALEM_ABBR, BOOK_ORDER_BASE["targum jerusalem"], "Aramaic (Jerusalem/Fragment Targum)"),
    ]

    for subdir, source_code, match_lang, abbr_map, order_base, label in works:
        work_dir = BASE / subdir
        if not work_dir.is_dir():
            print(f"  skipping {subdir} — not fetched yet")
            continue
        print(f"\n--- {label} ({subdir}) ---", flush=True)
        earliest: dict[int, tuple[int, str]] = {}
        total_words = 0
        matched = 0
        book_seq = {book: i for i, book in enumerate(abbr_map.keys())}
        for ref, verses in load_chapters(work_dir):
            # Sefaria refs come back as "Mishnah Berakhot.1" — period is the
            # book↔chapter separator, NOT a space. Split on the last period.
            if "." not in ref:
                continue
            book, chapter = ref.rsplit(".", 1)
            abbr = abbr_map.get(book)
            if not abbr:
                continue
            book_order = order_base + book_seq[book] * 1000 + int(chapter)
            for verse_idx, verse in enumerate(verses):
                if not isinstance(verse, str):
                    continue
                for tok in verse.split():
                    consonantal = strip_pointing(tok).strip(".,:!?—()[]{}\"'")
                    if not consonantal:
                        continue
                    total_words += 1
                    hit = word_to_ids.get((match_lang, consonantal))
                    if not hit:
                        continue
                    matched += 1
                    citation = f"{abbr} {chapter}:{verse_idx+1}"
                    for eid in hit:
                        prev = earliest.get(eid)
                        if prev is None or book_order < prev[0]:
                            earliest[eid] = (book_order, citation)
        print(f"  {total_words:,} words; {matched:,} matched into {len(earliest):,} entries")

        rows = [(eid, source_code, citation, order) for eid, (order, citation) in earliest.items()]
        print(f"  Writing {len(rows):,} attestation rows...", flush=True)
        for i in range(0, len(rows), 2000):
            db.executemany(
                "INSERT OR REPLACE INTO attestations (entry_id, source, citation, book_order) VALUES (?, ?, ?, ?)",
                rows[i:i + 2000],
            )
            db.commit()

    # Sanity print
    print("\nSample rabbinic attestations:")
    for row in db.execute("""
        SELECT e.lang, COALESCE(NULLIF(e.root,''), e.root_inferred) AS r,
               a.source, a.citation, e.word
          FROM entries e JOIN attestations a ON a.entry_id = e.id
         WHERE a.source IN ('mishnah','onkelos')
         ORDER BY random() LIMIT 10
    """):
        print(f"  {row[0]}  {row[4]:<18}  root={row[1]}  {row[2]}:{row[3]}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
