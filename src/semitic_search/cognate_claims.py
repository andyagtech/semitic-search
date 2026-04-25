"""Extract Wiktionary-editor-curated cognate claims from Kaikki dumps.

When an entry in language X cites `{{Y-root|...}}` or `{{root|X|Y|...}}` where
Y != X, that's a human-curated cross-language cognate claim: "this X word
shares a root with the Y root ...". These are strong evidence independent of
any in-lang root annotation, and they're the *only* root signal we have for
Ge'ez/Ugaritic/Akkadian/Aramaic entries on Wiktionary.

One row per (source_lang, source_word, source_etym_num, claimed_lang,
claimed_root) tuple.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

_RADICAL_SPLIT = re.compile(r"[\s\u05be\-]+")

# Templates like "ar-root", "he-root", "syc-root", "akk-root", "gez-root".
# Also cover the -rootbox variants and -root-link.
_LANG_ROOT_TEMPLATE = re.compile(r"^([a-z]{2,3})-root(?:box|-link)?$")


def _parse_args_from(args: dict, start: int) -> str | None:
    raw = args.get(str(start))
    if isinstance(raw, str) and raw.strip():
        parts = [p for p in _RADICAL_SPLIT.split(raw.strip()) if p]
        if len(parts) >= 2:
            return " ".join(parts)
    per_position: list[str] = []
    for i in range(start, start + 6):
        val = args.get(str(i))
        if isinstance(val, str) and val.strip():
            per_position.append(val.strip())
        else:
            break
    if len(per_position) >= 2:
        return " ".join(per_position)
    return None


@dataclass(slots=True, frozen=True)
class CognateClaim:
    source_lang: str
    source_word: str
    source_etym_num: int | None
    source_pos: str
    claimed_lang: str
    claimed_root: str
    source_template: str  # e.g. "ar-root" or "root"


def _iter_claims_for_entry(entry: dict, source_lang: str) -> Iterator[CognateClaim]:
    word = entry.get("word")
    if not word:
        return
    pos = entry.get("pos") or ""
    etym_num = entry.get("etymology_number")
    seen: set[tuple[str, str]] = set()  # (claimed_lang, claimed_root)

    for tmpl in entry.get("etymology_templates") or ():
        name = tmpl.get("name") or ""
        args = tmpl.get("args") or {}

        # Case A: language-tagged template like "ar-root", "he-rootbox"
        m = _LANG_ROOT_TEMPLATE.match(name)
        if m:
            claimed_lang = m.group(1)
            if claimed_lang == source_lang:
                continue  # same-lang root — not a cognate claim
            root = _parse_args_from(args, 1)
            if not root:
                continue
            key = (claimed_lang, root)
            if key in seen:
                continue
            seen.add(key)
            yield CognateClaim(
                source_lang=source_lang,
                source_word=word,
                source_etym_num=etym_num,
                source_pos=pos,
                claimed_lang=claimed_lang,
                claimed_root=root,
                source_template=name,
            )
            continue

        # Case B: generic {{root|entry_lang|root_lang|radicals...}}
        if name == "root":
            arg1 = args.get("1")
            arg2 = args.get("2")
            if arg1 != source_lang or not isinstance(arg2, str) or arg2 == source_lang:
                continue
            root = _parse_args_from(args, 3)
            if not root:
                continue
            key = (arg2, root)
            if key in seen:
                continue
            seen.add(key)
            yield CognateClaim(
                source_lang=source_lang,
                source_word=word,
                source_etym_num=etym_num,
                source_pos=pos,
                claimed_lang=arg2,
                claimed_root=root,
                source_template="root",
            )


def iter_cognate_claims(jsonl_path: str | Path, source_lang: str) -> Iterator[CognateClaim]:
    path = Path(jsonl_path)
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            yield from _iter_claims_for_entry(entry, source_lang)
