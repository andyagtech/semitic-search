"""Fetch Targum Jonathan (Neviim) + Targum Neofiti + Targum Jerusalem
from the Sefaria v3 API. Written as a sibling to fetch_sefaria.py — same
on-disk layout, same ~4/s polite rate.
"""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "sefaria"

# Targum Jonathan parallels the entire Nevi'im (Former + Latter Prophets).
# Sefaria slug convention: "Targum Jonathan on Isaiah", one file per chapter.
TARGUM_JONATHAN: dict[str, int] = {
    # Former Prophets
    "Targum Jonathan on Joshua": 24,
    "Targum Jonathan on Judges": 21,
    "Targum Jonathan on I Samuel": 31,
    "Targum Jonathan on II Samuel": 24,
    "Targum Jonathan on I Kings": 22,
    "Targum Jonathan on II Kings": 25,
    # Latter Prophets — major
    "Targum Jonathan on Isaiah": 66,
    "Targum Jonathan on Jeremiah": 52,
    "Targum Jonathan on Ezekiel": 48,
    # Twelve
    "Targum Jonathan on Hosea": 14,
    "Targum Jonathan on Joel": 4,
    "Targum Jonathan on Amos": 9,
    "Targum Jonathan on Obadiah": 1,
    "Targum Jonathan on Jonah": 4,
    "Targum Jonathan on Micah": 7,
    "Targum Jonathan on Nahum": 3,
    "Targum Jonathan on Habakkuk": 3,
    "Targum Jonathan on Zephaniah": 3,
    "Targum Jonathan on Haggai": 2,
    "Targum Jonathan on Zechariah": 14,
    "Targum Jonathan on Malachi": 3,
}

# Targum Neofiti: alternative Aramaic rendering of the Torah.
TARGUM_NEOFITI: dict[str, int] = {
    "Targum Neofiti, Genesis": 50,
    "Targum Neofiti, Exodus": 40,
    "Targum Neofiti, Leviticus": 27,
    "Targum Neofiti, Numbers": 36,
    "Targum Neofiti, Deuteronomy": 34,
}

# Targum Jerusalem / Fragment Targum on the Torah.
TARGUM_JERUSALEM: dict[str, int] = {
    "Targum Jerusalem, Genesis": 50,
    "Targum Jerusalem, Exodus": 40,
    "Targum Jerusalem, Leviticus": 27,
    "Targum Jerusalem, Numbers": 36,
    "Targum Jerusalem, Deuteronomy": 34,
}


def fetch_chapter(ref: str, out_path: Path, delay: float = 0.25) -> bool:
    if out_path.exists():
        return True
    url = f"https://www.sefaria.org/api/v3/texts/{ref.replace(' ', '_').replace(',', '%2C')}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "semitic-search/0.1"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except Exception as e:
        print(f"  ✗ {ref}: {str(e)[:80]}", flush=True)
        return False
    versions = data.get("versions") or []
    if not versions:
        print(f"  ✗ {ref}: no versions", flush=True)
        return False
    text = versions[0].get("text")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"ref": ref, "text": text}, ensure_ascii=False))
    time.sleep(delay)
    return True


def fetch_work(work_name: str, books: dict[str, int]) -> None:
    print(f"\n=== {work_name} ===", flush=True)
    subdir = work_name.lower().replace(" ", "_").replace(",", "")
    total = sum(books.values())
    done = 0
    for book, n in books.items():
        for ch in range(1, n + 1):
            ref = f"{book}.{ch}"
            fname = f"{book.replace(' ', '_').replace(',', '')}_{ch}.json"
            fetch_chapter(ref, OUT_DIR / subdir / fname)
            done += 1
            if done % 25 == 0:
                print(f"  ...{done}/{total}", flush=True)
    print(f"  ✓ {done}/{total}", flush=True)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fetch_work("Targum Jonathan", TARGUM_JONATHAN)
    fetch_work("Targum Neofiti", TARGUM_NEOFITI)
    fetch_work("Targum Jerusalem", TARGUM_JERUSALEM)
    print("\n✓ All done.")
