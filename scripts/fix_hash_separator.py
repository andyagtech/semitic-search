"""One-off cleanup: strip the Kaikki `# ` separator artifacts from
vocalized_form (and romanization) fields in the local index.

Rather than re-ingest all 75K Arabic entries, we do an in-place UPDATE that
applies the same cleaning rule as the new _clean_canonical() in ingest.py.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect
from semitic_search.ingest import _clean_canonical


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")

    rows = db.execute(
        """SELECT id, word, vocalized_form, romanization FROM entries
            WHERE vocalized_form LIKE '% # %' OR romanization LIKE '% # %'""",
    )
    print(f"Rows with '# ' artifacts: {len(rows):,}")

    updates: list[tuple] = []
    for entry_id, word, voc, rom in rows:
        new_voc = _clean_canonical(voc, word) if voc and " # " in voc else voc
        new_rom = rom
        if rom and " # " in rom:
            # Take everything before the first ` # ` (the first romanized form)
            new_rom = rom.split(" # ")[0].strip()
        if new_voc != voc or new_rom != rom:
            updates.append((new_voc, new_rom, entry_id))

    if updates:
        for i in range(0, len(updates), 500):
            db.executemany(
                "UPDATE entries SET vocalized_form = ?, romanization = ? WHERE id = ?",
                updates[i : i + 500],
            )
            db.commit()
    print(f"Updated {len(updates):,} rows")

    # Sanity: confirm artifacts are gone
    leftover = db.execute(
        "SELECT COUNT(*) FROM entries WHERE vocalized_form LIKE '% # %' OR romanization LIKE '% # %'",
    )[0][0]
    print(f"Remaining rows with artifact: {leftover}")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
