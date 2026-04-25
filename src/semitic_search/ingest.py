"""Parse Kaikki.org Wiktionary JSONL dumps into normalized lexical records.

One Kaikki line = one Wiktionary entry. One lemma can appear as multiple entries
(one per POS x etymology_number). Roots live under `etymology_templates[]`
where `.name` is one of a known per-language set; radicals are space-separated
in `.args["1"]`.

Only verified empirically for Arabic (`ar-root`, `ar-rootbox`). For the other
four languages, template names are inferred from the same naming convention
and will be adjusted after inspecting real dumps — a coverage report run is
part of the v1 build.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

# Verified against real Kaikki dumps on 2026-04-19. Hebrew's `he-rootbox` is the
# dominant form (2,699 hits vs 101 for `he-root`). Amharic/Tigrinya use only
# the `-rootbox` variant; Syriac only uses `syc-root`. Ge'ez / Ugaritic /
# Akkadian / Aramaic have no language-specific templates — they rely on the
# generic `{{root|entry_lang|root_lang|...}}` form, handled separately below.
ROOT_TEMPLATE_NAMES: dict[str, frozenset[str]] = {
    "ar": frozenset({"ar-root", "ar-rootbox"}),
    "he": frozenset({"he-root", "he-rootbox"}),
    "syc": frozenset({"syc-root"}),
    "am": frozenset({"am-rootbox"}),
    "ti": frozenset({"ti-rootbox"}),
    "gez": frozenset(),
    "ug": frozenset(),
    "akk": frozenset({"akk-root"}),
    "arc": frozenset(),  # Imperial/Official Aramaic
    "aii": frozenset({"aii-root"}),  # Assyrian Neo-Aramaic
}

# Radicals can be separated by whitespace (Ar/Syc), maqaf U+05BE (He), ASCII
# hyphen (Am/Ti/Ge'ez), or Ethiopic word-separator. A single regex handles all.
_RADICAL_SPLIT = re.compile(r"[\s\u05be\-]+")


@dataclass(slots=True, frozen=True)
class LexicalRecord:
    lang: str
    word: str
    etymology_number: int | None
    pos: str
    root: str | None
    root_radicals: tuple[str, ...] | None
    vocalized_form: str | None
    romanization: str | None
    glosses: tuple[str, ...]
    etymology_text: str | None

    @property
    def wiktionary_title(self) -> str:
        return self.word


def _parse_args_from(args: dict, start: int) -> str | None:
    """Parse radicals out of Kaikki template args starting at `start`.

    Handles two shapes:
    (a) args[start] is a single string with all radicals separated by
        whitespace/maqaf/hyphen (Arabic `ar-root`, Hebrew `he-rootbox`, etc.)
    (b) args[start], args[start+1], ... each hold one radical (Hebrew
        `he-root` style).
    """
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


def _extract_root(entry: dict, lang: str) -> str | None:
    """Return a canonical, space-separated root string (e.g., 'ك ت ب') or None.

    Tries three template encodings:
    1. Language-specific templates per ROOT_TEMPLATE_NAMES (ar-root, he-rootbox, etc.)
    2. Generic `{{root|<entry_lang>|<root_lang>|<radicals>}}` where entry_lang
       and root_lang both equal our target `lang` — used by Ge'ez and sometimes
       by Hebrew/Aramaic editors who prefer the generic template.
    """
    wanted = ROOT_TEMPLATE_NAMES.get(lang, frozenset())
    for tmpl in entry.get("etymology_templates") or ():
        name = tmpl.get("name")
        args = tmpl.get("args") or {}

        if name in wanted:
            got = _parse_args_from(args, 1)
            if got:
                return got
            continue

        # Generic {{root|LANG|LANG|...}}. Args 1 and 2 are both language codes;
        # radicals start at arg 3. A cross-lang cognate claim would have
        # args["2"] != lang, which we skip here — that's handled by the
        # cognate-claim extractor.
        if name == "root":
            arg1 = args.get("1")
            arg2 = args.get("2")
            if arg1 == lang and arg2 == lang:
                got = _parse_args_from(args, 3)
                if got:
                    return got

    return None


def _clean_canonical(form_text: str, word: str) -> str:
    """Kaikki occasionally packs multiple conjugations into a single 'canonical'
    form string with `# ` separators, e.g. `"أكتب # أَكْتُبُ"` meaning
    unvocalized # vocalized. Take just the first vocalized form.

    Heuristic: if the text contains ` # `, the first token is usually the
    unvocalized word (matching .word); the vocalized form we want is the
    second token. Beyond that we stop — later tokens are different
    conjugations.
    """
    parts = form_text.split(" # ")
    if len(parts) == 1:
        return form_text.strip()
    first, second = parts[0].strip(), parts[1].strip()
    # If the first token IS the unvocalized word, prefer the second (vocalized).
    if first == word or first.replace(" ", "") == word.replace(" ", ""):
        return second
    # Otherwise take the first and hope for the best.
    return first


def _walk_forms(entry: dict) -> tuple[str | None, str | None]:
    vocalized: str | None = None
    romanization: str | None = None
    word = entry.get("word") or ""
    for form in entry.get("forms") or ():
        tags = set(form.get("tags") or ())
        form_text = form.get("form")
        if not form_text:
            continue
        # Prefer a form tagged exactly {"canonical"} over {"canonical","form-iv"}
        # etc. — cleaner lemma form.
        if vocalized is None and "canonical" in tags:
            vocalized = _clean_canonical(form_text, word)
        if romanization is None and "romanization" in tags:
            # Same packing issue can appear in romanization fields.
            romanization = _clean_canonical(form_text, word).split()[0] if " # " in form_text else form_text
        if vocalized and romanization:
            break
    return vocalized, romanization


def _extract_glosses(entry: dict) -> tuple[str, ...]:
    out: list[str] = []
    for sense in entry.get("senses") or ():
        for g in sense.get("glosses") or ():
            if g:
                out.append(g)
    return tuple(out)


def iter_records(jsonl_path: str | Path, lang: str) -> Iterator[LexicalRecord]:
    """Yield one LexicalRecord per Kaikki entry. Skips entries without a `word`."""
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
            word = entry.get("word")
            if not word:
                continue
            root = _extract_root(entry, lang)
            radicals = tuple(root.split()) if root else None
            vocalized, romanization = _walk_forms(entry)
            glosses = _extract_glosses(entry)
            yield LexicalRecord(
                lang=lang,
                word=word,
                etymology_number=entry.get("etymology_number"),
                pos=entry.get("pos") or "",
                root=root,
                root_radicals=radicals,
                vocalized_form=vocalized,
                romanization=romanization,
                glosses=glosses,
                etymology_text=entry.get("etymology_text"),
            )
