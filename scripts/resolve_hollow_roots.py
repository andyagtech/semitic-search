"""Post-process CAMeL-extracted roots with `#` placeholders.

CAMeL Tools marks the weak consonant slot in hollow and defective Arabic
roots with `#` (e.g. root of بَاتَ or بَيْت is returned as `ب # ت`). Our
canonical-root transliterator doesn't map `#`, so these entries end up in
the wrong root bucket.

Heuristic: look at the surface unvocalized word. If it contains ي (yaʾ) at
a plausible position, substitute # → ي. Else try و (waw). If the surface
has neither (pure perfect-form hollow verb like قال whose root is
actually q-w-l), fall back to و (statistically more common in Arabic
hollow roots). Same logic for Hebrew (י / ו).

Not perfect, but the common case — nominal and imperfect forms where the
weak letter is surface-visible — is solved.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from semitic_search.db import connect

AR_WEAK_CHARS = ["ي", "و"]  # prefer yaʾ if both present
HE_WEAK_CHARS = ["י", "ו"]


def resolve(root: str, word: str, lang: str) -> tuple[str, bool]:
    """Return (resolved_root, changed)."""
    radicals = root.split()
    if "#" not in radicals:
        return root, False
    candidates = AR_WEAK_CHARS if lang == "ar" else HE_WEAK_CHARS if lang in ("he", "arc") else []
    if not candidates:
        return root, False

    # Which weak characters are present in the surface word?
    present = [c for c in candidates if c in word]
    fallback = candidates[1] if lang == "ar" else candidates[1]  # و / ו default

    resolved = []
    for r in radicals:
        if r != "#":
            resolved.append(r)
            continue
        if present:
            resolved.append(present[0])  # use surface-visible weak letter
        else:
            resolved.append(fallback)
    return " ".join(resolved), True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("local", "turso"), default="local")
    args = parser.parse_args()

    db = connect(prefer=args.target)
    print(f"Target: {db.backend}")

    for lang in ("ar", "he", "arc"):
        rows = db.execute(
            "SELECT id, word, root_inferred FROM entries "
            "WHERE lang = ? AND root_inferred IS NOT NULL AND root_inferred LIKE '%#%'",
            (lang,),
        )
        updates: list[tuple] = []
        for row in rows:
            entry_id, word, root = row
            resolved, changed = resolve(root, word, lang)
            if changed:
                updates.append((resolved, entry_id))
        if updates:
            for i in range(0, len(updates), 500):
                db.executemany(
                    "UPDATE entries SET root_inferred = ? WHERE id = ?",
                    updates[i : i + 500],
                )
                db.commit()
        print(f"  {lang}: {len(rows):,} rows with '#' → {len(updates):,} resolved")

    print("\nSample resolutions for Arabic 'بيت' family:")
    for r in db.execute(
        "SELECT word, vocalized_form, root_inferred FROM entries "
        "WHERE lang='ar' AND word IN ('بيت','بيوت','تبيت','مبيت','بات') ORDER BY word LIMIT 8",
    ):
        print(f"  {r[0]!r:<10} {r[1]!r:<14} → {r[2]!r}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
