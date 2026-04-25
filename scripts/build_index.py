"""Build the v1 lexical index from Kaikki JSONL dumps.

Targets either local SQLite or Turso (libsql) based on the --target flag.
One row per (lang, word, etymology_number, pos); glosses JSON-encoded.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from semitic_search.db import Db, connect
from semitic_search.ingest import iter_records

LANGS: list[tuple[str, str]] = [
    ("ar", "arabic.jsonl"),
    ("he", "hebrew.jsonl"),
    ("syc", "syriac.jsonl"),
    ("am", "amharic.jsonl"),
    ("ti", "tigrinya.jsonl"),
    ("gez", "geez.jsonl"),
    ("ug", "ugaritic.jsonl"),
    ("akk", "akkadian.jsonl"),
    ("arc", "aramaic.jsonl"),
    ("aii", "assyrian_neo_aramaic.jsonl"),
]

SCHEMA_STATEMENTS = [
    """CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY,
        lang TEXT NOT NULL,
        word TEXT NOT NULL,
        etymology_number INTEGER,
        pos TEXT NOT NULL DEFAULT '',
        root TEXT,
        vocalized_form TEXT,
        romanization TEXT,
        glosses_json TEXT NOT NULL DEFAULT '[]',
        etymology_text TEXT,
        wiktionary_title TEXT NOT NULL,
        UNIQUE (lang, word, etymology_number, pos)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_entries_lang_root ON entries(lang, root)",
    "CREATE INDEX IF NOT EXISTS idx_entries_lang_word ON entries(lang, word)",
    "CREATE INDEX IF NOT EXISTS idx_entries_root ON entries(root) WHERE root IS NOT NULL",
    """CREATE TABLE IF NOT EXISTS ingest_meta (
        lang TEXT PRIMARY KEY,
        source_path TEXT NOT NULL,
        source_bytes INTEGER,
        entries_ingested INTEGER NOT NULL,
        entries_with_root INTEGER NOT NULL,
        ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
]


INSERT_SQL = """
INSERT OR IGNORE INTO entries
    (lang, word, etymology_number, pos, root, vocalized_form, romanization,
     glosses_json, etymology_text, wiktionary_title)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


def _apply_schema(db: Db) -> None:
    for stmt in SCHEMA_STATEMENTS:
        db.execute(stmt)
    db.commit()


def _ingest_one(db: Db, code: str, src: Path, batch_size: int) -> tuple[int, int]:
    db.execute("DELETE FROM entries WHERE lang = ?", (code,))
    db.execute("DELETE FROM ingest_meta WHERE lang = ?", (code,))
    db.commit()

    n = 0
    with_root = 0
    buffer: list[tuple] = []
    for rec in iter_records(src, code):
        n += 1
        if rec.root:
            with_root += 1
        buffer.append((
            rec.lang,
            rec.word,
            rec.etymology_number,
            rec.pos,
            rec.root,
            rec.vocalized_form,
            rec.romanization,
            json.dumps(list(rec.glosses), ensure_ascii=False),
            rec.etymology_text,
            rec.wiktionary_title,
        ))
        if len(buffer) >= batch_size:
            db.executemany(INSERT_SQL, buffer)
            db.commit()
            buffer.clear()
    if buffer:
        db.executemany(INSERT_SQL, buffer)
        db.commit()

    db.execute(
        "INSERT INTO ingest_meta (lang, source_path, source_bytes, entries_ingested, entries_with_root) "
        "VALUES (?, ?, ?, ?, ?)",
        (code, str(src), src.stat().st_size, n, with_root),
    )
    db.commit()
    return n, with_root


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the Semitic Search lexical index.")
    parser.add_argument(
        "--target",
        choices=("local", "turso"),
        default="local",
        help="Where to write. 'local' uses data/processed/semitic.sqlite3; 'turso' uses TURSO_DATABASE_URL.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows per insert batch. Smaller for Turso (default 500 here, override for local to ~2000).",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    raw_dir = project_root / "data" / "raw"
    if not raw_dir.exists():
        print(f"ERROR: {raw_dir} missing — run the Kaikki download first.", file=sys.stderr)
        return 1

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    _apply_schema(db)

    for code, filename in LANGS:
        src = raw_dir / filename
        if not src.exists():
            print(f"[skip] {code}: {src} missing")
            continue
        n, with_root = _ingest_one(db, code, src, args.batch_size)
        pct = (with_root / n * 100) if n else 0.0
        print(f"[done] {code}: {n:,} entries, {with_root:,} with root ({pct:.1f}%)")

    db.close()
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
