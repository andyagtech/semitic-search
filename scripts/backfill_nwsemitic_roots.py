"""Consonantal-skeleton backfill for arc (Imperial Aramaic) and any other
Hebrew/Syriac-script entries lacking a gold root.

For entries in Hebrew/Syriac script, the `word` field IS already a pure
consonantal sequence (these scripts are abjads). We take the first 3
consonants as the root, mapping Hebrew final forms (ך/ם/ן/ף/ץ) back to
their medial equivalents for consistent indexing.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect
from semitic_search.nwsemitic_root import extract_root

TARGET_LANGS = ["arc", "aii"]  # Imperial Aramaic + Assyrian NA (backstop for un-rooted)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}\n")

    for lang in TARGET_LANGS:
        rows = db.execute(
            "SELECT id, word, pos FROM entries WHERE lang = ? AND root IS NULL AND root_inferred IS NULL",
            (lang,),
        )
        updates: list[tuple] = []
        for row in rows:
            entry_id, word, pos = row
            if not word:
                continue
            root = extract_root(word, expected_length=3)
            if root is None:
                continue
            n = len(root.split())
            conf = "high" if n == 3 else "low"
            updates.append((root, conf, "nwsemitic_mechanical", entry_id))

        if updates:
            for i in range(0, len(updates), 500):
                db.executemany(
                    "UPDATE entries SET root_inferred = ?, root_inferred_confidence = ?, "
                    "root_inferred_source = ? WHERE id = ?",
                    updates[i : i + 500],
                )
                db.commit()
        print(f"{lang:<5} {len(updates):>6,} roots inferred from {len(rows):>6,} un-rooted entries")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
