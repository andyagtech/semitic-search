"""Fetch Mishnah + Targum Onkelos from the Sefaria v3 API.

Writes one text file per (tractate/book, chapter) to data/raw/sefaria/.
Polite on the public API: serial requests, ~4/s.
"""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "sefaria"

# Mishnah tractate → chapter count. Canonical counts from the Kaufmann
# manuscript / standard printed editions.
MISHNAH: dict[str, int] = {
    # Zeraim
    "Mishnah Berakhot": 9, "Mishnah Peah": 8, "Mishnah Demai": 7,
    "Mishnah Kilayim": 9, "Mishnah Sheviit": 10, "Mishnah Terumot": 11,
    "Mishnah Maasrot": 5, "Mishnah Maaser Sheni": 5, "Mishnah Challah": 4,
    "Mishnah Orlah": 3, "Mishnah Bikkurim": 4,
    # Moed
    "Mishnah Shabbat": 24, "Mishnah Eruvin": 10, "Mishnah Pesachim": 10,
    "Mishnah Shekalim": 8, "Mishnah Yoma": 8, "Mishnah Sukkah": 5,
    "Mishnah Beitzah": 5, "Mishnah Rosh Hashanah": 4, "Mishnah Taanit": 4,
    "Mishnah Megillah": 4, "Mishnah Moed Katan": 3, "Mishnah Chagigah": 3,
    # Nashim
    "Mishnah Yevamot": 16, "Mishnah Ketubot": 13, "Mishnah Nedarim": 11,
    "Mishnah Nazir": 9, "Mishnah Sotah": 9, "Mishnah Gittin": 9,
    "Mishnah Kiddushin": 4,
    # Nezikin
    "Mishnah Bava Kamma": 10, "Mishnah Bava Metzia": 10, "Mishnah Bava Batra": 10,
    "Mishnah Sanhedrin": 11, "Mishnah Makkot": 3, "Mishnah Shevuot": 8,
    "Mishnah Eduyot": 8, "Mishnah Avodah Zarah": 5, "Pirkei Avot": 6,
    "Mishnah Horayot": 3,
    # Kodashim
    "Mishnah Zevachim": 14, "Mishnah Menachot": 13, "Mishnah Chullin": 12,
    "Mishnah Bekhorot": 9, "Mishnah Arakhin": 9, "Mishnah Temurah": 7,
    "Mishnah Keritot": 6, "Mishnah Meilah": 6, "Mishnah Tamid": 7,
    "Mishnah Middot": 5, "Mishnah Kinnim": 3,
    # Tahorot
    "Mishnah Kelim": 30, "Mishnah Oholot": 18, "Mishnah Negaim": 14,
    "Mishnah Parah": 12, "Mishnah Tahorot": 10, "Mishnah Mikvaot": 10,
    "Mishnah Niddah": 10, "Mishnah Makhshirin": 6, "Mishnah Zavim": 5,
    "Mishnah Tevul Yom": 4, "Mishnah Yadayim": 4, "Mishnah Uktzin": 3,
}

# Targum Onkelos: Aramaic translation paralleling the Torah.
TARGUM_ONKELOS: dict[str, int] = {
    "Onkelos Genesis": 50, "Onkelos Exodus": 40, "Onkelos Leviticus": 27,
    "Onkelos Numbers": 36, "Onkelos Deuteronomy": 34,
}


def fetch_chapter(ref: str, out_path: Path, delay: float = 0.25) -> bool:
    """Fetch a single chapter and write its text list as JSON. Returns True
    on success. Skips if the file already exists."""
    if out_path.exists():
        return True
    url = f"https://www.sefaria.org/api/v3/texts/{ref.replace(' ', '_')}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "semitic-search/0.1"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except Exception as e:
        print(f"  ✗ {ref}: {e}", flush=True)
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
    total_chapters = sum(books.values())
    done = 0
    for book, n_chapters in books.items():
        for ch in range(1, n_chapters + 1):
            ref = f"{book}.{ch}"
            fname = f"{book.replace(' ', '_')}_{ch}.json"
            out_path = OUT_DIR / work_name.lower().replace(" ", "_") / fname
            fetch_chapter(ref, out_path)
            done += 1
            if done % 20 == 0:
                print(f"  ...{done}/{total_chapters} chapters", flush=True)
    print(f"  ✓ {done}/{total_chapters}", flush=True)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fetch_work("Mishnah", MISHNAH)
    fetch_work("Targum Onkelos", TARGUM_ONKELOS)
    print("\n✓ All done.")
