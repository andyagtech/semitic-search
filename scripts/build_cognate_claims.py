"""Scan every ingested Kaikki dump for cross-language cognate claims.

Writes a `cognate_claims` table to the same SQLite index. Each row is an
editor-curated assertion that the source entry's word is a cognate of the
claimed root in another Semitic language. Completely independent of the
in-language root annotation — these claims work even for Ge'ez / Ugaritic /
Akkadian / Aramaic entries where the dump has no native root templates.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from semitic_search.cognate_claims import iter_cognate_claims
from semitic_search.db import connect

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
]

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS cognate_claims (
        id INTEGER PRIMARY KEY,
        source_lang TEXT NOT NULL,
        source_word TEXT NOT NULL,
        source_etym_num INTEGER,
        source_pos TEXT NOT NULL DEFAULT '',
        claimed_lang TEXT NOT NULL,
        claimed_root TEXT NOT NULL,
        source_template TEXT NOT NULL,
        UNIQUE (source_lang, source_word, source_etym_num, source_pos, claimed_lang, claimed_root)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_claims_source ON cognate_claims(source_lang, source_word)",
    "CREATE INDEX IF NOT EXISTS idx_claims_claimed ON cognate_claims(claimed_lang, claimed_root)",
]

INSERT_SQL = """
INSERT OR IGNORE INTO cognate_claims
    (source_lang, source_word, source_etym_num, source_pos,
     claimed_lang, claimed_root, source_template)
VALUES (?, ?, ?, ?, ?, ?, ?)
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    raw_dir = project_root / "data" / "raw"
    if not raw_dir.exists():
        print(f"ERROR: {raw_dir} missing", file=sys.stderr)
        return 1

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")
    for stmt in SCHEMA:
        db.execute(stmt)
    db.commit()

    print(f"{'lang':<6} {'scanned':>10} {'claims':>10} {'→ langs'}")
    print("-" * 80)
    total = 0
    for code, filename in LANGS:
        src = raw_dir / filename
        if not src.exists():
            print(f"{code:<6} (missing: {filename})")
            continue

        # Clear old claims for this source_lang so rebuilds are idempotent.
        db.execute("DELETE FROM cognate_claims WHERE source_lang = ?", (code,))

        rows: list[tuple] = []
        per_target: Counter[str] = Counter()
        for claim in iter_cognate_claims(src, code):
            rows.append((
                claim.source_lang,
                claim.source_word,
                claim.source_etym_num,
                claim.source_pos,
                claim.claimed_lang,
                claim.claimed_root,
                claim.source_template,
            ))
            per_target[claim.claimed_lang] += 1
            if len(rows) >= 500:
                db.executemany(INSERT_SQL, rows)
                db.commit()
                rows.clear()
        if rows:
            db.executemany(INSERT_SQL, rows)
            db.commit()

        claim_count = sum(per_target.values())
        total += claim_count
        # Line count of the dump as a rough denominator for "scanned"
        with src.open() as f:
            scanned = sum(1 for _ in f)
        top = ", ".join(f"{l}={n}" for l, n in per_target.most_common(5)) or "—"
        print(f"{code:<6} {scanned:>10,} {claim_count:>10,}   {top}")

    print(f"\nTotal claims: {total:,}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
