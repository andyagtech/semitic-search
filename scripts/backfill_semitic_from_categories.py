"""Mine explicit root annotations we missed in the original ingest.

Wiktionary editors categorize many derived lemmas with category names like
"Arabic terms belonging to the root X Y Z" / "Hebrew terms belonging to the
root X-Y-Z". These live in `senses[].categories[].name` and are NOT in the
etymology templates, so our original root extractor missed them.

Two passes:
1. Category-name regex — extract "... belonging to the root <radicals>"
   and promote to gold `root`.
2. form_of inheritance — for each un-rooted entry whose senses[].form_of
   references another lemma in the same language, inherit that parent's
   root (gold or inferred) into root_inferred with source='form_of_parent'.

Zero cost. Fully deterministic. Safe to re-run.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

# Matches "<Language> terms belonging to the root <radicals>" where radicals
# may be space-separated or hyphen-separated. Captures the radicals string.
_CATEGORY_PATTERN = re.compile(
    r"(?:Arabic|Hebrew|Classical Syriac|Aramaic|Assyrian Neo-Aramaic|Classical Mandaic|Turoyo|Ge'?ez|Amharic|Tigrinya|Akkadian|Ugaritic|Phoenician|Punic|Sabaean|Old South Arabian)"
    r"\s+terms belonging to the root\s+(.+)$",
    re.IGNORECASE,
)

# Radicals in category names come separated by spaces or hyphens. Normalize
# to space-separated.
_SEP = re.compile(r"[\s\u05be\-]+")


def extract_category_root(categories: list[dict]) -> str | None:
    for cat in categories or ():
        name = cat.get("name", "")
        m = _CATEGORY_PATTERN.search(name)
        if not m:
            continue
        raw = m.group(1).strip()
        parts = [p for p in _SEP.split(raw) if p]
        if len(parts) >= 2:
            return " ".join(parts)
    return None


def extract_form_of_parents(senses: list[dict]) -> list[str]:
    """Return the `form_of[].word` values — candidates whose root we'd inherit."""
    parents: list[str] = []
    for sense in senses or ():
        for fo in sense.get("form_of") or ():
            w = fo.get("word")
            if w:
                parents.append(w)
    return parents


def pass_1_categories(db, raw_path: Path, lang: str) -> tuple[int, int]:
    """Read the raw JSONL, extract roots from category names, UPDATE rows."""
    n_seen = 0
    updates: list[tuple[str, str, int | None, str]] = []
    with raw_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            n_seen += 1
            word = entry.get("word")
            if not word:
                continue
            all_cats: list[dict] = []
            for s in entry.get("senses") or ():
                all_cats.extend(s.get("categories") or ())
            root = extract_category_root(all_cats)
            if not root:
                continue
            updates.append((root, word, entry.get("etymology_number"), entry.get("pos") or ""))

    # Apply — only set `root` where it's currently NULL, so we don't overwrite
    # editor-annotated template roots.
    applied = 0
    if updates:
        for i in range(0, len(updates), 500):
            batch = updates[i : i + 500]
            for root, word, etym, pos in batch:
                etym_val = etym if etym is not None else None
                rows = db.execute(
                    "UPDATE entries SET root = ? WHERE lang = ? AND word = ? AND "
                    "COALESCE(etymology_number, -1) = COALESCE(?, -1) AND pos = ? "
                    "AND root IS NULL",
                    (root, lang, word, etym_val, pos),
                )
            db.commit()
            # Turso's UPDATE doesn't return rowcount the same way; re-query:
        applied = db.execute(
            "SELECT COUNT(*) FROM entries WHERE lang = ? AND root IS NOT NULL",
            (lang,),
        )[0][0]
    return len(updates), applied


def pass_2_form_of(db, raw_path: Path, lang: str) -> int:
    """For each un-rooted entry with form_of parents, inherit root from parent."""
    # Build a lookup of word → root (gold or inferred) in the same lang.
    parent_roots: dict[str, str] = {}
    rows = db.execute(
        "SELECT word, COALESCE(NULLIF(root, ''), root_inferred) AS r "
        "FROM entries WHERE lang = ? AND COALESCE(NULLIF(root, ''), root_inferred) IS NOT NULL",
        (lang,),
    )
    for word, r in rows:
        # Prefer gold if a lemma has multiple entries — the first (by insertion order)
        # that came with a root is already the candidate; keep the first seen.
        if word not in parent_roots:
            parent_roots[word] = r

    inherited: list[tuple[str, str]] = []  # (inherited_root, entry_word_key)
    to_update: list[tuple[str, int]] = []
    # We need entry ids, so join through the raw data → DB.
    id_map: dict[tuple[str, int | None, str], int] = {}
    for row in db.execute(
        "SELECT id, word, etymology_number, pos FROM entries "
        "WHERE lang = ? AND root IS NULL AND root_inferred IS NULL",
        (lang,),
    ):
        id_map[(row[1], row[2], row[3] or "")] = row[0]

    n_inherited = 0
    with raw_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            key = (entry.get("word"), entry.get("etymology_number"), entry.get("pos") or "")
            if key not in id_map:
                continue
            parents = extract_form_of_parents(entry.get("senses") or [])
            for p in parents:
                root = parent_roots.get(p)
                if root:
                    to_update.append((root, id_map[key]))
                    n_inherited += 1
                    break  # one is enough

    if to_update:
        for i in range(0, len(to_update), 500):
            batch = to_update[i : i + 500]
            db.executemany(
                "UPDATE entries SET root_inferred = ?, root_inferred_confidence = 'high', "
                "root_inferred_source = 'form_of_parent' WHERE id = ?",
                batch,
            )
            db.commit()
    return n_inherited


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    project = Path(__file__).resolve().parents[1]
    raw_dir = project / "data" / "raw"
    db = connect(prefer=args.target)

    LANG_FILES = [
        ("ar", "arabic.jsonl"),
        ("he", "hebrew.jsonl"),
        ("syc", "syriac.jsonl"),
        ("arc", "aramaic.jsonl"),
        ("aii", "assyrian_neo_aramaic.jsonl"),
    ]

    print(f"Target: {db.backend}\n")
    print(f"{'lang':<5} {'cat roots found':>16} {'form_of inherited':>18}")
    print("-" * 45)
    for lang, filename in LANG_FILES:
        path = raw_dir / filename
        if not path.exists():
            continue
        cat_count, _ = pass_1_categories(db, path, lang)
        inh_count = pass_2_form_of(db, path, lang)
        print(f"{lang:<5} {cat_count:>16,} {inh_count:>18,}")

    print("\n=== New coverage ===")
    for lang in ("ar", "he", "syc", "arc", "aii"):
        total = db.execute("SELECT COUNT(*) FROM entries WHERE lang = ?", (lang,))[0][0]
        if not total:
            continue
        gold = db.execute("SELECT COUNT(*) FROM entries WHERE lang = ? AND root IS NOT NULL", (lang,))[0][0]
        inf = db.execute("SELECT COUNT(*) FROM entries WHERE lang = ? AND root_inferred IS NOT NULL", (lang,))[0][0]
        pct = (gold + inf) / total * 100
        print(f"  {lang:<5} {total:>8,}  gold={gold:>6,}  inferred={inf:>6,}  cov={pct:>5.1f}%")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
