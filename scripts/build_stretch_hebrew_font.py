"""Build kashida-capable Hebrew fonts from open-source bases. Each entry in
CONFIGS specifies a source font (e.g. Frank Ruhl Libre, Keter Aram Tsova)
and per-letter geometric zones (bar/arm/leg/box ranges, x_cutoff). For each
of the six scribally-stretchable letters (ד ה ל ם ר ת), we derive 6 widened
variants and wire them via GSUB ligatures so `letter + N × U+05C6` produces
`letter_stretched_N`.

The framework is config-driven so adding a new font is just adding one
CONFIGS entry. Per-font tuning is required because each font's glyphs sit
at different coordinates (Frank Ruhl uses UPM=1000, Keter Aram Tsova
UPM=2048, Heebo UPM=1000 with different stroke heights, etc.).

License notes:
  - SIL OFL fonts (Frank Ruhl Libre, David Libre, Heebo, Noto, ...) — must
    be renamed (per OFL §3) when modified. Output stays under SIL OFL.
  - GPL fonts (Culmus: Keter Aram Tsova, Keter YG, Taamey Frank, Shofar,
    Ktav Yad CLM) — derivatives must remain GPL. Distribute output as GPL.
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

import pathops
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

FONTS_DIR = Path(__file__).resolve().parents[1] / "web" / "public" / "fonts"

# Our stretch trigger. Originally U+E010 (PUA) — but browsers segment text
# into script runs BEFORE shaping, and PUA has script=Unknown/Zzzz. That
# means lam+E010 lands in two separate shaping runs and the GSUB `liga`
# lookup can never match across them. Use U+05C6 (Hebrew Punctuation Nun
# Hafukha) instead: script=Hebrew → stays in the Hebrew run, so the
# ligature substitution fires. It's non-combining (gc=Po) and extremely
# rare in real text (only appears a few times in Torah — Numbers 10:35-36).
STRETCH_CODEPOINT = 0x05C6
STRETCH_GLYPH = f"uni{STRETCH_CODEPOINT:04X}"
MAX_LEVELS = 16        # number of stretch variants per letter

# ---------------------------------------------------------------------------
# Per-font configurations. STEP is in font units; scale with the font's UPM
# (Frank Ruhl uses 1000, Keter Aram Tsova 2048, ...). The visual stretch
# at a given font-size is `step / upem * font-size-px` per level.
# ---------------------------------------------------------------------------

# `alias_codepoints` is a list of Unicode codepoints (Hebrew Presentation
# Forms) that the build resolves to the font's actual glyph name via cmap.
# This works across fonts that use different naming conventions (fontTools'
# `uniFB33` vs Culmus's `daleddagesh`).
ALIAS_DAGESH = {
    "dalet":    [0xFB33],   # ד + dagesh
    "he":       [0xFB34],   # ה + mapiq
    "lamed":    [0xFB3C],   # ל + dagesh (rare)
    "resh":     [0xFB48],   # ר + dagesh (rare)
    "tav":      [0xFB4A],   # ת + dagesh
}

# Arabic combining marks to import into every Hebrew stretch font: shaddah,
# three tanwin marks, sukun. Pulled from Amiri-Regular.ttf and scaled to
# the target font's UPM. Lets users place these marks over any Hebrew
# letter (academic / comparative use case).
ARABIC_MARKS = [0x0651, 0x064B, 0x064C, 0x064D, 0x0652]

# Combining diaeresis (U+0308): two dots above. Used for Hebrew Heh + dots
# to visually represent Arabic ة (taa marbuta), among other comparative uses.
# Amiri's diaeresis is positioned for Latin x-heights, too low for Hebrew —
# we design our own glyph instead.
DIAERESIS_CP = 0x0308

FRANK_RUHL = {
    "id": "frank-ruhl",
    "source": "FrankRuhlLibre.ttf",
    "output": "SemiticStretchHebrew.ttf",
    "family": "Semitic Stretch Hebrew",
    "postscript": "SemiticStretchHebrew",
    "internal_id": "SemiticSearch-SemiticStretchHebrew-2.0",
    "step": 150,
    "import_marks": ARABIC_MARKS,
    "letters": {
        # dalet/resh/lamed all opt into overflow chains: kashidas beyond
        # MAX_LEVELS substitute into bar segments that tile leftward of the
        # max pre-baked variant, with a rounded corner cap on the leftmost
        # segment matching the natural bar's left-edge design.
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 290,
                 "alias_codepoints": ALIAS_DAGESH["dalet"], "overflow": True},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 400, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 440, "bar_top": 573, "arm_min_y": 573, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["lamed"], "overflow": True, "arm_top_y": 793},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 300},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["resh"], "overflow": True},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 440, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Keter Aram Tsova (Culmus, GPL) — UPM=2048, so all values ~2× Frank Ruhl's.
# Initial values from coordinate inspection; will be refined visually.
KETER_ARAM_TSOVA = {
    "id": "keter-aram-tsova",
    "source": "KeterAramTsova.ttf",
    "output": "SemiticStretchKeterAramTsova.ttf",
    "family": "Semitic Stretch Keter Aram Tsova",
    "postscript": "SemiticStretchKeterAramTsova",
    "internal_id": "SemiticSearch-SemiticStretchKeterAramTsova-1.0",
    "step": 300,
    "import_marks": ARABIC_MARKS,
    "letters": {
        # dalet: single-contour topology (one closed outline that traces
        # outside + inside). bar_bottom=650 lets the underside (y=699)
        # and the left ear's lower curve (y≥655) shift together with the
        # top, so the bar extends as a unit. x_cutoff=500 anchors pt 46
        # at (509, 713) — the corner where the descender's interior left
        # wall meets the bar's underside — preventing it from shifting
        # leftward by `shift` and distorting the inner cavity.
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 650, "bar_top": 1250, "x_cutoff": 500,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        # he: leg_max_y=800 captures the left leg + underside; bar_bottom
        # set to 800 too so the gap between leg/bar zones (which left the
        # left ear y=855 stranded) closes. x_cutoff=600 anchors the inner
        # right edge (pts 11-15 at x=665-681) — it joins the right leg's
        # interior, which must stay put. Earlier 700 dragged the inner
        # edge leftward and broke the underside/right-leg connection.
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 800, "bar_top": 1250, "leg_max_y": 800, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        # Lamed: body wide y=675-1227 (right reaches 784, narrowing to
        # 666 in the joint band), pure arm y>1227 (x<196).
        # arm_min_y=1227 keeps the body's slight slope from getting
        # sliced — earlier arm_min_y=1089 sliced off body-right points
        # at y=1100ish that should have stayed anchored.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 675, "bar_top": 1227, "arm_min_y": 1227, "x_cutoff": 400,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 600},
        # resh: underside at y=720-784. bar_bottom=720 brings underside
        # into the stretch zone so the bar widens uniformly (top + bottom).
        # x_cutoff=600 anchors the descender's inner left wall (pt 53 at
        # x=607) so it stays connected to the right leg.
        # underside_y_max=800 + underside_x_min=150 flattens the arch in
        # the underside (pts 54-58 dip to y=784) into a clean line from
        # the right anchor (607, 720) to the leftmost shifted point at
        # y=745. underside_x_min excludes the left ear (pts 0-4 at x<100)
        # which lives in the same y range but should keep its curved shape.
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 720, "bar_top": 1250, "x_cutoff": 600,
                 "underside_y_max": 800, "underside_x_min": 150,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 900, "bar_top": 1250, "leg_max_y": 900, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Shmulik CLM (Culmus fancy, GPL) — UPM=2048, distinctive serif Hebrew
# inspired by hand-set type. Top bars sit around y=900-1238.
SHMULIK = {
    "id": "shmulik",
    "source": "ShmulikCLM.ttf",
    "output": "SemiticStretchShmulikCLM.ttf",
    "family": "Semitic Stretch Shmulik CLM",
    "postscript": "SemiticStretchShmulikCLM",
    "internal_id": "SemiticSearch-SemiticStretchShmulikCLM-1.0",
    "step": 300,
    "import_marks": ARABIC_MARKS,
    "letters": {
        # Shmulik's body bars sit at y=1050 with serifs reaching y=1186.
        # Letters are wide (1280-1600 advance), so x_cutoffs are bigger
        # than narrower fonts — they anchor the actual right descender/leg
        # which sits near x=1000+.
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 900, "bar_top": 1250, "x_cutoff": 900,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        # he: x_cutoff was 1100 — but Shmulik's right floating leg lives at
        # x=1005-1239, so 1100 sliced THROUGH it (left half x<1100 shifted,
        # right half x>=1100 stayed → tore the leg). Lowering to 900 keeps
        # the entire right leg anchored (x>900) while the bar's left edge
        # at x=114 still shifts.
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 900, "bar_top": 1250, "leg_max_y": 900, "x_cutoff": 900,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        # Lamed: body wide y=697-1124 (right reaches 1126), pure arm
        # y>1240 (x<393). arm_min_y=1240 keeps the body's TOP-RIGHT
        # (x=1126 at y up to 1124) anchored by x-split — earlier
        # arm_min_y=981 sliced it off because the body has a slight
        # slope and points just above 981 with x=1126 got rigidly
        # translated leftward.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 700, "bar_top": 1240, "arm_min_y": 1240, "x_cutoff": 500,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        # finalmem: was x_cutoff=1100 — but the right corner serifs
        # have points at x≈1100-1300, and the inner contour ends at
        # x=1039. Lowering to 800 anchors all right-side serif features.
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 800},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 900, "bar_top": 1250, "x_cutoff": 900,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        # tav: was x_cutoff=1200 but Shmulik's right descender sits at
        # x=1163-1595 with internal points at x≈1163; cutoff=1200 split
        # it. Lowered to 1000 — right descender (all x>1100) now stays
        # anchored, plus left leg + bar's left half still translate.
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 900, "bar_top": 1250, "leg_max_y": 900, "x_cutoff": 1000,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Hillel (Culmus fancy, GPL) — UPM=1000, modern Israeli serif. No
# composed-dagesh glyphs, so aliases unused (IgnoreMarks lookupflag
# suffices to skip the dagesh combining mark).
HILLEL = {
    "id": "hillel",
    "source": "HillelCLM-Medium.ttf",
    "output": "SemiticStretchHillelCLM.ttf",
    "family": "Semitic Stretch Hillel CLM",
    "postscript": "SemiticStretchHillelCLM",
    "internal_id": "SemiticSearch-SemiticStretchHillelCLM-1.0",
    # 150 instead of 130 — keeps the stretch ratio consistent at ~0.15em
    # per level across all UPM=1000 fonts. Was 130 because Hillel renders
    # smaller; normalizing makes side-by-side comparisons fair.
    "step": 150,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 350, "bar_top": 520, "x_cutoff": 280},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 350, "bar_top": 520, "leg_max_y": 320, "x_cutoff": 280},
        # Lamed: body wide y=403-520 (x to 456), pure arm y>520 (x<140).
        # x_cutoff=200 anchors body's right edge cleanly.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 400, "bar_top": 520, "arm_min_y": 520, "x_cutoff": 200},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 280},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 350, "bar_top": 520, "x_cutoff": 250},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 350, "bar_top": 520, "leg_max_y": 350, "x_cutoff": 320},
    },
}

# Gladia (Culmus fancy, GPL) — UPM=1000, bold display Hebrew. No composed
# dagesh forms, same as Hillel.
GLADIA = {
    "id": "gladia",
    "source": "GladiaCLM-Bold.ttf",
    "output": "SemiticStretchGladiaCLM.ttf",
    "family": "Semitic Stretch Gladia CLM",
    "postscript": "SemiticStretchGladiaCLM",
    "internal_id": "SemiticSearch-SemiticStretchGladiaCLM-1.0",
    "step": 150,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 450, "bar_top": 620, "x_cutoff": 380},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 450, "bar_top": 620, "leg_max_y": 400, "x_cutoff": 380},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 450, "bar_top": 600, "arm_min_y": 600, "x_cutoff": 300},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 350},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 450, "bar_top": 620, "x_cutoff": 350},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 450, "bar_top": 620, "leg_max_y": 450, "x_cutoff": 400},
    },
}

# --- More fonts requested from opensiddur.org/help/fonts/ ---

NOTO_SANS_HEBREW = {
    "id": "noto-sans-hebrew",
    "source": "NotoSansHebrew.ttf",
    "output": "SemiticStretchNotoSansHebrew.ttf",
    "family": "Semitic Stretch Noto Sans Hebrew",
    "postscript": "SemiticStretchNotoSansHebrew",
    "internal_id": "SemiticSearch-SemiticStretchNotoSansHebrew-1.0",
    "step": 150,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 400, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 440, "bar_top": 600, "arm_min_y": 600, "x_cutoff": 280,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 350},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 280,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 440, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

NOTO_SERIF_HEBREW = {
    "id": "noto-serif-hebrew",
    "source": "NotoSerifHebrew.ttf",
    "output": "SemiticStretchNotoSerifHebrew.ttf",
    "family": "Semitic Stretch Noto Serif Hebrew",
    "postscript": "SemiticStretchNotoSerifHebrew",
    "internal_id": "SemiticSearch-SemiticStretchNotoSerifHebrew-1.0",
    "step": 150,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 480, "bar_top": 670, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 480, "bar_top": 670, "leg_max_y": 440, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 480, "bar_top": 650, "arm_min_y": 650, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 350},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 480, "bar_top": 670, "x_cutoff": 280,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 480, "bar_top": 670, "leg_max_y": 480, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

SHOFAR = {
    "id": "shofar",
    "source": "ShofarRegular.ttf",
    "output": "SemiticStretchShofar.ttf",
    "family": "Semitic Stretch Shofar",
    "postscript": "SemiticStretchShofar",
    "internal_id": "SemiticSearch-SemiticStretchShofar-1.0",
    "step": 300,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 900, "bar_top": 1250, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 900, "bar_top": 1250, "leg_max_y": 800, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 900, "bar_top": 1200, "arm_min_y": 1200, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 600},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 900, "bar_top": 1250, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 900, "bar_top": 1250, "leg_max_y": 900, "x_cutoff": 800,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# FreeMono (GNU FreeFont, GPL) — monospace with Hebrew. Step = 600 (the
# font's mono cell width) so each stretch level adds exactly one full
# character cell. Preserves monospacing: a stretched letter occupies
# (1 + n) cells, keeping all column alignments intact.
FREE_MONO = {
    "id": "free-mono",
    "source": "FreeMono.ttf",
    "output": "SemiticStretchFreeMono.ttf",
    "family": "Semitic Stretch FreeMono",
    "postscript": "SemiticStretchFreeMono",
    "internal_id": "SemiticSearch-SemiticStretchFreeMono-1.0",
    "step": 600,
    # Mono cell width = 600. "mono" mode rewrites the glyph so the body
    # sits in the RIGHTMOST of the (1+N) cells (next to the previous
    # letter under RTL), with the kashida bar extending LEFTWARD into the
    # additional cells. Under "natural" the body would stay in the
    # leftmost cell, leaving a huge gap to the next letter on the right.
    "lsb_mode": "mono",
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 350, "bar_top": 500, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 350, "bar_top": 500, "leg_max_y": 320, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 350, "bar_top": 480, "arm_min_y": 480, "x_cutoff": 300,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 350},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 350, "bar_top": 500, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 350, "bar_top": 500, "leg_max_y": 350, "x_cutoff": 400,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Nachlieli CLM (Culmus, GPL) — UPM=1090, light/airy serif Hebrew.
NACHLIELI = {
    "id": "nachlieli",
    "source": "NachlieliCLM-Light.ttf",
    "output": "SemiticStretchNachlieliCLM.ttf",
    "family": "Semitic Stretch Nachlieli CLM",
    "postscript": "SemiticStretchNachlieliCLM",
    "internal_id": "SemiticSearch-SemiticStretchNachlieliCLM-1.0",
    "step": 165,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 420, "bar_top": 620, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 420, "bar_top": 620, "leg_max_y": 380, "x_cutoff": 380,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 420, "bar_top": 600, "arm_min_y": 600, "x_cutoff": 320,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 380},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 420, "bar_top": 620, "x_cutoff": 320,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 420, "bar_top": 620, "leg_max_y": 430, "x_cutoff": 430,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Miriam Mono CLM (Culmus, GPL) — monospace serif Hebrew. UPM=1000,
# mono cell width=600. Step = 600 to match — preserves monospacing.
MIRIAM_MONO = {
    "id": "miriam-mono",
    "source": "MiriamMonoCLM-Book.ttf",
    "output": "SemiticStretchMiriamMonoCLM.ttf",
    "family": "Semitic Stretch Miriam Mono CLM",
    "postscript": "SemiticStretchMiriamMonoCLM",
    "internal_id": "SemiticSearch-SemiticStretchMiriamMonoCLM-1.0",
    "step": 600,
    "lsb_mode": "mono",  # see FreeMono note
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 350, "bar_top": 500, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 350, "bar_top": 500, "leg_max_y": 320, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 350, "bar_top": 480, "arm_min_y": 480, "x_cutoff": 280,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 350},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 350, "bar_top": 500, "x_cutoff": 320,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 350, "bar_top": 500, "leg_max_y": 350, "x_cutoff": 350,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Ezra SIL SR (SIL OFL) — UPM=2048, scholarly Hebrew Bible font with full
# cantillation. SR = "SIL Roman" version with right-to-left support tweaks.
EZRA_SIL = {
    "id": "ezra-sil",
    "source": "EzraSIL-SR.ttf",
    "output": "SemiticStretchEzraSIL.ttf",
    "family": "Semitic Stretch Ezra SIL SR",
    "postscript": "SemiticStretchEzraSIL",
    "internal_id": "SemiticSearch-SemiticStretchEzraSIL-1.0",
    "step": 300,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 1000, "bar_top": 1500, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        # he: bar_bottom was 1100 / leg_max_y was 1000 — but Ezra's bar
        # bottom row sits at y=1018, smack in the 100-unit gap zone. All
        # bar-bottom points (165, 244, 1061, 1141, 1149, 1201 at y=1018,
        # plus 134 at y=1072) stayed anchored while the upper bar shifted
        # → bar tore apart, and the inflated advance forced "ים" to wrap
        # to a new visual line. Set both to 1000 to close the gap so
        # bar-bottom points (y=1018) land in bar zone with x-split.
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 1000, "bar_top": 1500, "leg_max_y": 1000, "x_cutoff": 800,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        # Lamed: body wide y=893-1259, joint narrows y=1259-1442 (right
        # still at 1160), pure arm y>1442 (x<352). bar_top=1442 keeps the
        # joint in bar zone with x-split; x_cutoff=400 anchors right side.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 900, "bar_top": 1442, "arm_min_y": 1442, "x_cutoff": 400,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 700},
        # resh / tav: same story as he above — bar bottom is at y=1018 in
        # Ezra, so bar_bottom=1100 left the bar's lower-left points outside
        # the shift zone and the upper-left points inside it → taper. Lower
        # to 1000.
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 1000, "bar_top": 1500, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 1000, "bar_top": 1500, "leg_max_y": 1000, "x_cutoff": 800,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# StamAshkenazCLM (Culmus, GPL) — Ashkenazi Stam (Torah-scribal) style.
# This is the closest match to the requested "Taamey Ashkenaz" — Culmus
# does not have a separate "Taamey Ashkenaz" font, only StamAshkenaz. The
# lamed reaches x=-300 even at baseline (already-extended arm); set the
# arm_min_y high so we don't double-stretch.
STAM_ASHKENAZ = {
    "id": "stam-ashkenaz",
    "source": "StamAshkenazCLM.ttf",
    "output": "SemiticStretchStamAshkenazCLM.ttf",
    "family": "Semitic Stretch Stam Ashkenaz CLM",
    "postscript": "SemiticStretchStamAshkenazCLM",
    "internal_id": "SemiticSearch-SemiticStretchStamAshkenazCLM-1.0",
    "step": 300,
    # Source lamed already has xMin=-300 (an extended arm) so the body's
    # right edge (xMax=1115) sits 50 units inside advance=1165. With
    # "shift" mode the renderer translates by -xMin, pushing the body
    # past the advance and into the next letter. With "natural" the body
    # stays at xMax=1115 while advance grows by `shift` → big gap to the
    # next letter on the right. "mono" mode translates by exactly `shift`,
    # preserving the body's 50-unit right offset within the new advance.
    "lsb_mode": "mono",
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 850, "bar_top": 1450, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        # he: bar_bottom was 850 / leg_max_y was 800 — but the actual bar
        # bottom sits at y=700 and the bar's left edge runs UP from y=830.
        # That left a 50-unit gap zone (800..850) where the bar's left-edge
        # points at (114, 832) and (114, 848) DIDN'T shift while everything
        # above and below did → notch/break in the bar's left edge. Set
        # both to 700 (the actual bar bottom) to close the gap.
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 700, "bar_top": 1450, "leg_max_y": 700, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        # Lamed: body wide y=563-1127 (x to 1115), narrow joint y=1127-1314
        # (x=176 only), arm y>1314 reaches OUT to x=-300 (Stam style).
        # bar_top=1314 / arm_min_y=1314 / x_cutoff=400 splits cleanly.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 550, "bar_top": 1314, "arm_min_y": 1314, "x_cutoff": 400,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 600},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 850, "bar_top": 1100, "x_cutoff": 600,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 850, "bar_top": 1100, "leg_max_y": 900, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

# Shlomo SemiStam (CC BY-SA / OFL via the Open Siddur project, derived
# from Ezra SIL SR — has full cantillation marks). Wayback-archived from
# Google Sites since the original host requires sign-in.
SHLOMO_SEMISTAM = {
    "id": "shlomo-semistam",
    "source": "ShlomoSemiStam.ttf",
    "output": "SemiticStretchShlomoSemiStam.ttf",
    "family": "Semitic Stretch Shlomo SemiStam",
    "postscript": "SemiticStretchShlomoSemiStam",
    "internal_id": "SemiticSearch-SemiticStretchShlomoSemiStam-1.0",
    "step": 300,
    "import_marks": ARABIC_MARKS,
    "letters": {
        0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 1100, "bar_top": 1500, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["dalet"]},
        0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 1100, "bar_top": 1500, "leg_max_y": 1000, "x_cutoff": 800,
                 "alias_codepoints": ALIAS_DAGESH["he"]},
        # Lamed: body wide y=898-1259 (x to 1180), joint y=1259-1440 (x to
        # 833), arm y>1620 (x<325). bar_top=1440 catches body+joint with
        # x-split; x_cutoff=500 anchors right side cleanly.
        0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 900, "bar_top": 1440, "arm_min_y": 1440, "x_cutoff": 500,
                 "alias_codepoints": ALIAS_DAGESH["lamed"]},
        0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 700},
        0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 1100, "bar_top": 1400, "x_cutoff": 700,
                 "alias_codepoints": ALIAS_DAGESH["resh"]},
        0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 1100, "bar_top": 1400, "leg_max_y": 1100, "x_cutoff": 800,
                 "alias_codepoints": ALIAS_DAGESH["tav"]},
    },
}

CONFIGS = [
    FRANK_RUHL, KETER_ARAM_TSOVA, SHMULIK, HILLEL, GLADIA,
    NOTO_SANS_HEBREW, NOTO_SERIF_HEBREW, SHOFAR,
    FREE_MONO, NACHLIELI, MIRIAM_MONO, EZRA_SIL,
    STAM_ASHKENAZ, SHLOMO_SEMISTAM,
]

# Stretching model (matches Torah scribal widening):
#   bar — top bar stretches; no rigid arm/leg (dalet ד, resh ר).
#   arm — top bar stretches; arm ABOVE rides rigidly with the bar's left
#         edge (lamed ל).
#   leg — top bar stretches; LEFT leg BELOW rides rigidly with the bar's
#         left edge (tav ת, he ה). Right leg stays anchored.
#   box — enclosed rectangle widens on the left (finalmem ם).
#
# Within the bar zone we use a hard x-split (not linear falloff): points at
# x<x_cutoff shift by the full amount (riding with the arm/leg), points at
# x≥x_cutoff stay anchored. This produces a FLAT extended top bar.
#
# `aliases`: extra source glyphs that should ALSO trigger the stretch (in
# addition to the base codepoint). Needed because each font's `ccmp`/`rlig`
# pre-composes letter+dagesh into Hebrew Presentation Forms (U+FB30 block)
# BEFORE our liga runs. Without aliases, vocalized text with dagesh (תּ,
# דּ, ...) would never stretch.


def stretch_glyph(
    font: TTFont,
    src_name: str,
    shift: int,
    *,
    letter_class: str = "bar",
    bar_bottom: int = 440,
    bar_top: int = 620,
    arm_min_y: int | None = None,
    leg_max_y: int | None = None,
    x_cutoff: int | None = None,
    shift_contours: list[int] | None = None,
    underside_y_max: int | None = None,
    underside_x_min: int | None = None,
) -> object:
    """Return a new TTGlyph built from `src_name` with selected points
    shifted LEFT. Shift depends on letter_class and the point's (x, y):

      bar — y in [bar_bottom, bar_top] AND x < x_cutoff:
              shift = full * (1 - x/x_cutoff)   (linear falloff)
            else: no shift.

      arm — y >= arm_min_y AND x < x_cutoff: full shift (rigid translate).
            y in [bar_bottom, arm_min_y] AND x < x_cutoff:
              shift = full * (1 - x/x_cutoff).
            else: no shift.

      leg — y <= leg_max_y AND x < x_cutoff: full shift (rigid left leg).
            y in [bar_bottom, bar_top] AND x < x_cutoff:
              shift = full * (1 - x/x_cutoff).
            else: no shift.

      box — x < x_cutoff: full shift (widen left side of rectangle).
    """
    src = font["glyf"][src_name]
    if src.numberOfContours <= 0:
        return copy.deepcopy(src)

    def shift_for(x: int, y: int) -> float:
        """Hard-boundary horizontal stretch. Points are either:
          — shifted by the FULL amount (they move rigidly leftward with the
            stretching region's left edge), or
          — not shifted at all (they stay anchored to the right side).
        A linear falloff would curve the extended bar; the user wants it
        FLAT (like image #36), so we use a hard x-boundary inside the bar
        zone. The arm (above) or leg (below) the bar also translates
        rigidly by the full amount, staying connected to the bar's left
        edge and preserving its own decorative shape (serifs, flags).
        """
        if x_cutoff is None:
            return 0.0
        if letter_class == "box":
            return shift if x < x_cutoff else 0.0
        if letter_class == "arm":
            # above the bar: whole arm translates by full shift
            if arm_min_y is not None and y > arm_min_y:
                return shift
            # inside the bar: hard x-split
            if bar_bottom <= y <= bar_top:
                return shift if x < x_cutoff else 0.0
            return 0.0
        if letter_class == "leg":
            # below the bar: left leg (x<x_cutoff) translates, right leg stays
            if leg_max_y is not None and y <= leg_max_y:
                return shift if x < x_cutoff else 0.0
            # inside the bar: hard x-split
            if bar_bottom <= y <= bar_top:
                return shift if x < x_cutoff else 0.0
            return 0.0
        # "bar" (dalet, resh): only the bar zone stretches, hard split
        if bar_bottom <= y <= bar_top:
            return shift if x < x_cutoff else 0.0
        return 0.0

    # "shear" class: shift each point LEFT by an amount proportional to
    # (1 - y/bar_top). Top of letter (y=bar_top) doesn't move; bottom
    # (y=0) shifts by the full amount; linear interpolation between.
    # This widens letters whose skeleton is DIAGONAL (aleph, ayin) without
    # breaking the contours — the whole letter tilts so the diagonal
    # becomes more horizontal while every part stays connected at the top.
    if letter_class == "shear":
        y_ref = bar_top  # use bar_top as the "anchor y" where shift = 0
        new_glyph = copy.deepcopy(src)
        for i, (x, y) in enumerate(new_glyph.coordinates):
            factor = max(0.0, 1.0 - y / y_ref) if y_ref > 0 else 0.0
            dx = shift * factor
            if dx != 0:
                new_glyph.coordinates[i] = (int(round(x - dx)), y)
        new_glyph.recalcBounds(font["glyf"])
        return new_glyph

    # "contours" class kept for reference — rigid translation of whole
    # contours. Works when the letter has truly disconnected parts but
    # creates visible gaps for letters whose contours share a visual
    # connection (like aleph's diagonal touching the upper hook).
    if letter_class == "contours" and shift_contours is not None:
        end_pts = list(src.endPtsOfContours)
        def contour_idx(i: int) -> int:
            for ci, end in enumerate(end_pts):
                if i <= end:
                    return ci
            return len(end_pts) - 1
        new_glyph = copy.deepcopy(src)
        for i, (x, y) in enumerate(new_glyph.coordinates):
            if contour_idx(i) in shift_contours:
                new_glyph.coordinates[i] = (int(x - shift), y)
        new_glyph.recalcBounds(font["glyf"])
        return new_glyph

    new_glyph = copy.deepcopy(src)
    orig_coords = list(src.coordinates)
    for i, (x, y) in enumerate(new_glyph.coordinates):
        s = shift_for(x, y)
        if s > 0:
            new_glyph.coordinates[i] = (int(round(x - s)), y)

    # Optionally straighten the underside of the bar. Some fonts (e.g.
    # Keter Aram Tsova resh) have an arch-shaped underside — the bottom
    # edge of the top bar dips to a flat dome at y=784 between two end
    # points at y=720 and y=745. When stretched, this arch is preserved
    # and reads as a "bend" in the otherwise straight bar. Snapping the
    # moving underside points onto the line connecting the right anchor
    # to the leftmost shifted point flattens the dome into a clean
    # (slightly angled) line. underside_x_min lets us exclude the left
    # ear, which lives in the same y range but should keep its curve.
    if underside_y_max is not None:
        underside_idx = [
            i for i, (ox, oy) in enumerate(orig_coords)
            if bar_bottom <= oy <= underside_y_max
            and (underside_x_min is None or ox >= underside_x_min)
        ]
        anchor = None    # rightmost original (x, y) that did NOT shift
        leftmost = None  # leftmost original (idx, x, y) that DID shift
        for i in underside_idx:
            ox, oy = orig_coords[i]
            nx, _ = new_glyph.coordinates[i]
            if ox == nx:  # not shifted
                if anchor is None or ox > anchor[0]:
                    anchor = (ox, oy)
            else:
                if leftmost is None or ox < leftmost[1]:
                    leftmost = (i, ox, oy)
        if anchor is not None and leftmost is not None:
            ax, ay = anchor
            li, _, _ = leftmost
            lx_new, ly_new = new_glyph.coordinates[li]
            slope = (ly_new - ay) / (lx_new - ax) if lx_new != ax else 0
            for i in underside_idx:
                ox, _ = orig_coords[i]
                nx, _ = new_glyph.coordinates[i]
                if ox != nx:
                    target_y = ay + slope * (nx - ax)
                    new_glyph.coordinates[i] = (nx, int(round(target_y)))

    new_glyph.recalcBounds(font["glyf"])
    return new_glyph


def build_simple_gsub_ligatures(font: TTFont, lig_map: dict[tuple[str, str], str]) -> None:
    """Install a ligature-substitution lookup and WIRE IT INTO EVERY
    existing `liga` feature in the font. Adding a duplicate feature record
    or duplicate script record would be ignored by most OT shapers, so
    instead we append our new lookup index to each liga-feature already
    present. Fall back to creating a new feature if none exists."""
    components_by_first: dict[str, list[tuple[str, str]]] = {}
    for (first, second), lig in lig_map.items():
        components_by_first.setdefault(first, []).append((second, lig))

    gsub = font.get("GSUB")
    if gsub is None:
        gsub = font["GSUB"] = otTables_new_gsub()

    # Build the ligature-subst subtable.
    ligs = ot.LigatureSubst()
    ligs.ligatures = {}
    for first, pairs in components_by_first.items():
        bucket = []
        for second, lig in pairs:
            L = ot.Ligature()
            L.Component = [second]
            L.LigGlyph = lig
            L.CompCount = 2
            bucket.append(L)
        ligs.ligatures[first] = bucket

    lookup = ot.Lookup()
    lookup.LookupType = 4
    lookup.LookupFlag = 0
    lookup.SubTableCount = 1
    lookup.SubTable = [ligs]

    table = gsub.table
    if table.LookupList is None:
        table.LookupList = ot.LookupList()
        table.LookupList.Lookup = []
        table.LookupList.LookupCount = 0
    lookup_index = len(table.LookupList.Lookup)
    table.LookupList.Lookup.append(lookup)
    table.LookupList.LookupCount = len(table.LookupList.Lookup)

    # Ensure FeatureList / ScriptList exist.
    if table.FeatureList is None:
        table.FeatureList = ot.FeatureList()
        table.FeatureList.FeatureRecord = []
        table.FeatureList.FeatureCount = 0
    if table.ScriptList is None:
        table.ScriptList = ot.ScriptList()
        table.ScriptList.ScriptRecord = []
        table.ScriptList.ScriptCount = 0

    # Find every existing 'liga' FeatureRecord and append our lookup_index
    # to its LookupListIndex. If none exists, create one and wire it up
    # from every existing script's DefaultLangSys.
    wired = 0
    for rec in table.FeatureList.FeatureRecord:
        if rec.FeatureTag == "liga":
            rec.Feature.LookupListIndex.append(lookup_index)
            rec.Feature.LookupCount = len(rec.Feature.LookupListIndex)
            wired += 1

    if wired == 0:
        # No existing liga feature — create one and point all scripts at it.
        feat = ot.Feature()
        feat.LookupListIndex = [lookup_index]
        feat.LookupCount = 1
        fr = ot.FeatureRecord()
        fr.FeatureTag = "liga"
        fr.Feature = feat
        table.FeatureList.FeatureRecord.append(fr)
        table.FeatureList.FeatureCount = len(table.FeatureList.FeatureRecord)
        new_feat_index = len(table.FeatureList.FeatureRecord) - 1
        # Attach to all existing scripts (DFLT / hebr / etc.)
        for sr in table.ScriptList.ScriptRecord:
            if sr.Script.DefaultLangSys is not None:
                lis = sr.Script.DefaultLangSys.FeatureIndex
                if new_feat_index not in lis:
                    lis.append(new_feat_index)
                    sr.Script.DefaultLangSys.FeatureCount = len(lis)
        # If no scripts either, create DFLT.
        if not table.ScriptList.ScriptRecord:
            sr = ot.ScriptRecord()
            sr.ScriptTag = "DFLT"
            s = ot.Script()
            s.DefaultLangSys = ot.DefaultLangSys()
            s.DefaultLangSys.LookupOrder = None
            s.DefaultLangSys.ReqFeatureIndex = 0xFFFF
            s.DefaultLangSys.FeatureIndex = [new_feat_index]
            s.DefaultLangSys.FeatureCount = 1
            s.LangSysRecord = []
            s.LangSysCount = 0
            sr.Script = s
            table.ScriptList.ScriptRecord.append(sr)
            table.ScriptList.ScriptCount = 1


def otTables_new_gsub():
    """Build a minimal empty GSUB table object."""
    from fontTools.ttLib.tables.otBase import BaseTTXConverter
    from fontTools.ttLib.tables.G_S_U_B_ import table_G_S_U_B_
    t = table_G_S_U_B_("GSUB")
    t.table = ot.GSUB()
    t.table.ScriptList = None
    t.table.FeatureList = None
    t.table.LookupList = None
    t.table.Version = 0x00010000
    return t


def import_arabic_marks(target_font: TTFont, codepoints: list[int]) -> int:
    """Copy combining-mark glyphs from Amiri-Regular.ttf into target_font,
    scaling coordinates if UPMs differ. Returns count of marks imported.

    Why: shaddah / tanwin (U+0651, U+064B-064D) are Arabic combining marks.
    When typed after a Hebrew letter, browsers either render them via font
    fallback (often misaligned) or show tofu. Embedding the mark glyphs
    directly in our Hebrew font lets the same font render the base + mark
    as one shaping run, avoiding fallback weirdness.

    The source glyph's y-coordinates (Amiri designs them at y=820-1230 to
    sit above Arabic letters) line up well with Hebrew letter heights
    when both UPMs are 1000. For other UPMs we scale.
    """
    amiri_path = FONTS_DIR / "Amiri-Regular.ttf"
    if not amiri_path.exists():
        return 0
    amiri = TTFont(str(amiri_path))
    src_upem = amiri["head"].unitsPerEm
    dst_upem = target_font["head"].unitsPerEm
    scale = dst_upem / src_upem
    src_cmap = amiri.getBestCmap()
    target_glyf = target_font["glyf"]
    target_hmtx = target_font["hmtx"]
    order = target_font.getGlyphOrder()
    imported = 0
    for cp in codepoints:
        gname = src_cmap.get(cp)
        if not gname:
            continue
        src_glyph = amiri["glyf"][gname]
        # Decompose composite glyphs into a flat outline (kasratan is
        # composite in Amiri — referencing other glyphs by name — and we
        # can't easily port its components piecewise). Use TTGlyphPen +
        # decompose machinery via the glyph set.
        if src_glyph.numberOfContours == -1:
            # Composite — render via amiri's glyph set then capture outline.
            from fontTools.pens.recordingPen import DecomposingRecordingPen
            from fontTools.pens.transformPen import TransformPen
            from fontTools.misc.transform import Identity
            amiri_gs = amiri.getGlyphSet()
            pen = DecomposingRecordingPen(amiri_gs)
            amiri_gs[gname].draw(pen)
            ttpen = TTGlyphPen(None)
            scale_t = Identity.scale(scale, scale)
            tp = TransformPen(ttpen, scale_t)
            pen.replay(tp)
            new_glyph = ttpen.glyph()
        else:
            new_glyph = copy.deepcopy(src_glyph)
            for i, (x, y) in enumerate(new_glyph.coordinates):
                new_glyph.coordinates[i] = (int(round(x * scale)), int(round(y * scale)))
            new_glyph.recalcBounds(target_glyf)
        target_glyf[gname] = new_glyph
        # Combining marks have advance=0
        target_hmtx.metrics[gname] = (0, 0)
        if gname not in order:
            order.append(gname)
        # cmap mapping
        for t in target_font["cmap"].tables:
            if t.isUnicode() or t.platformID == 3:
                t.cmap[cp] = gname
        imported += 1
    target_font.setGlyphOrder(order)
    return imported


def add_two_dots_above(target_font: TTFont) -> bool:
    """Install a custom 'two dots above' glyph at U+0308 (combining diaeresis).
    Designed for Hebrew letter heights — sits well above the letter cap. Uses
    negative x-positioning so the mark backs up over the preceding character.
    Returns True if added.
    """
    upem = target_font["head"].unitsPerEm
    # Scale factors relative to UPM=1000 baseline
    s = upem / 1000.0
    cy = int(900 * s)        # vertical center of the dots (above letter cap)
    r = int(60 * s)          # dot radius
    cx_left = int(-330 * s)  # left dot center (negative — backs up over base)
    cx_right = int(-110 * s)

    pen = TTGlyphPen(None)
    for cx in (cx_left, cx_right):
        # Approximate a circle with 4 quadratic Bezier segments.
        pen.moveTo((cx + r, cy))
        pen.qCurveTo((cx + r, cy + r), (cx, cy + r))
        pen.qCurveTo((cx - r, cy + r), (cx - r, cy))
        pen.qCurveTo((cx - r, cy - r), (cx, cy - r))
        pen.qCurveTo((cx + r, cy - r), (cx + r, cy))
        pen.closePath()
    glyph = pen.glyph()

    gname = f"uni{DIAERESIS_CP:04X}"
    order = target_font.getGlyphOrder()
    if gname not in order:
        order.append(gname)
        target_font.setGlyphOrder(order)
    target_font["glyf"][gname] = glyph
    target_font["hmtx"].metrics[gname] = (0, 0)  # combining mark
    for t in target_font["cmap"].tables:
        if t.isUnicode() or t.platformID == 3:
            t.cmap[DIAERESIS_CP] = gname
    return True


def build_overflow_segment(
    font: TTFont,
    src_glyph_name: str,
    info: dict,
    step: int,
    max_levels: int,
    lsb_mode: str,
) -> tuple[str, int, int]:
    """Build the overflow "tatweel" bar-segment glyph for a stretchable
    letter. Returns (segment_glyph_name, advance, lsb).

    Inspired by Arabic kashida tatweel: a flat horizontal segment matching
    the letter's bar y-band that tiles seamlessly to the LEFT (in RTL
    display) of the letter's max pre-baked variant. Each additional U+05C6
    after `letter_s{max_levels}` substitutes into another segment, so the
    extension grows without bound.

    Geometry:
      · width = `step` font units (one stretch level), so segment N adds
        the same horizontal increment as a pre-baked level would have.
      · y-band = [bar_bottom, bar_top] from the letter config — matches
        the bar's design thickness exactly so the seam is invisible.

    LSB math:
      · HarfBuzz emits glyphs in VISUAL left-to-right order (regardless of
        script direction). Renderers accumulate pen rightward (pen += adv)
        and draw each glyph at `pen + (lsb - xMin)`.
      · For RTL text "ל" + N kashidas + "ה", the buffer order is:
        [heh, seg, seg, ..., seg, lamed_s16] — segments sit BETWEEN heh
        (leftmost) and lamed_s16 (rightmost), tiling to lamed's bar-left.
      · The variant's bar-left display = pen_lamed + (lsb - xMin) +
        bar_xmin_stretched. Since pen_lamed is determined by cumulative
        advance of preceding glyphs, the segment just needs an LSB that
        positions its outline at the bar's y-band exactly:
            lsb_seg = bar_left_offset_in_glyph
        (= the leftmost bar-x minus the glyph's own xMin in the source.)
      · This makes segments tile contiguously and the LAST segment's
        right edge land exactly on the variant's bar-left display.
    """
    bar_bottom = int(info["bar_bottom"])
    bar_top = int(info["bar_top"])
    letter_name = str(info["name"])

    pen = TTGlyphPen(None)
    pen.moveTo((0, bar_bottom))
    pen.lineTo((step, bar_bottom))
    pen.lineTo((step, bar_top))
    pen.lineTo((0, bar_top))
    pen.closePath()
    seg_glyph = pen.glyph()

    seg_name = f"{letter_name}_bar_segment"

    src_glyph = font["glyf"][src_glyph_name]

    # Bar's leftmost x within its y-band (in source-glyph coordinates).
    # Both bar_xmin and glyph xmin shift by the same total_shift during
    # stretching, so the offset is invariant — read it from the source.
    bar_xs = [x for x, y in src_glyph.coordinates if bar_bottom <= y <= bar_top]
    bar_left_offset = (min(bar_xs) - src_glyph.xMin) if bar_xs else 0

    # See docstring above for derivation. For all lsb_modes the LSB is the
    # same simple value because what matters is where the segment's outline
    # falls relative to its pen position — and that's just the bar offset.
    lsb_seg = bar_left_offset

    font["glyf"][seg_name] = seg_glyph
    font["hmtx"].metrics[seg_name] = (step, lsb_seg)
    order = font.getGlyphOrder()
    if seg_name not in order:
        order.append(seg_name)
        font.setGlyphOrder(order)

    return seg_name, step, lsb_seg


def _clip_glyph_at_y(
    glyf_table, glyph_name: str, y_threshold: int, *, keep_below: bool
) -> pathops.Path:
    """Boolean-intersect a glyph's outline with a half-plane y <= threshold
    (keep_below=True) or y >= threshold (False). Returns a pathops Path.

    Draws directly from the glyf table rather than via font.getGlyphSet() —
    the latter eagerly loads gvar, which is stale after we've added stretch
    variant glyphs (gvar.glyphCount no longer matches the font's glyphOrder).
    """
    src = pathops.Path()
    glyf_table[glyph_name].draw(src.getPen(), glyf_table)
    BIG = 100_000
    clip = pathops.Path()
    cp = clip.getPen()
    if keep_below:
        cp.moveTo((-BIG, -BIG)); cp.lineTo((BIG, -BIG))
        cp.lineTo((BIG, y_threshold)); cp.lineTo((-BIG, y_threshold))
    else:
        cp.moveTo((-BIG, y_threshold)); cp.lineTo((BIG, y_threshold))
        cp.lineTo((BIG, BIG)); cp.lineTo((-BIG, BIG))
    cp.closePath()
    return pathops.op(src, clip, pathops.PathOp.INTERSECTION)


def build_overflow_chain(
    font: TTFont,
    src_glyph_name: str,
    last_variant_name: str,
    info: dict,
    step: int,
    max_levels: int,
) -> tuple[str, str, str]:
    """For a stretchable letter with bar or arm class, build the three-glyph
    chain that extends the bar past the pre-baked variant cap. For arm-class
    letters the arm migrates to the leftmost end:

      · {name}_overflow_start   — lamed_s{max} with the arm clipped off
                                  (just bar + body). Substitutes in for
                                  lamed_s{max} when overflow triggers, so
                                  the arm doesn't double up at both ends.
      · {name}_bar_segment      — plain bar rectangle, intermediate tile.
      · {name}_overflow_tail    — bar rectangle + arm extracted from the
                                  original glyph, translated to overhang
                                  the bar's left by `bar_left_offset`
                                  units (matching lamed_s{max}'s arm-vs-
                                  bar offset).

    GSUB chain (added later in fea_lines):
      sub last' kashida by start;        # demote when overflow about to fire
      sub start kashida' lookup → tail;  # first overflow kashida → tail
      sub tail  kashida' lookup → tail;  # subsequent kashidas → tail
      sub tail' tail by intermediate;    # demote all-but-rightmost tail to plain seg

    All lsb math assumes lsb_mode="shift" (caller responsibility to gate).
    """
    bar_bottom = int(info["bar_bottom"])
    bar_top = int(info["bar_top"])
    letter_class = str(info.get("class", "bar"))
    has_arm = letter_class == "arm"
    arm_min_y = int(info.get("arm_min_y", bar_top))
    letter_name = str(info["name"])

    glyf = font["glyf"]
    src_glyph = glyf[src_glyph_name]

    # Bar's leftmost x within its y-band (in source-glyph coords). Both bar
    # and arm shift by the same total_shift during stretching so this is
    # invariant.
    bar_xs = [x for x, y in src_glyph.coordinates if bar_bottom <= y <= bar_top]
    bar_left_offset = (min(bar_xs) - src_glyph.xMin) if bar_xs else 0

    # The body's natural bar top — typically lower than `bar_top` because
    # `bar_top` covers the bar/arm transition shoulder. Clipping lamed_s{max}
    # at this y and matching the segment's top to it makes the bar a uniform
    # flat strip across the entire extended cluster (no seam at the shoulder).
    arm_xs = [x for x, y in src_glyph.coordinates if y > arm_min_y]
    arm_x_range = (min(arm_xs), max(arm_xs)) if arm_xs else (0, 0)
    body_top_ys = [
        y for x, y in src_glyph.coordinates
        if bar_bottom <= y <= bar_top
        and not (arm_x_range[0] <= x <= arm_x_range[1])
    ]
    seg_bar_top = max(body_top_ys) if body_top_ys else bar_top

    # The bar's left-edge has rounded corners (top-left and bottom-left
    # softening) in most Hebrew designs. We want those corners ONLY at the
    # visual leftmost end of the extended cluster (= seg_tail), so we need
    # to clip them off lamed_overflow_start AND graft them onto seg_tail.
    #
    # bar_clip_x_left = the x where the bar's bottom edge becomes flat,
    # just past the rounded corner. In lamed_s{max}'s post-stretch coords,
    # this is the second-leftmost x at y=bar_bottom.
    last_glyph = glyf[last_variant_name]
    bottom_xs = sorted({x for x, y in last_glyph.coordinates if y == bar_bottom})
    bar_clip_x_left = bottom_xs[1] if len(bottom_xs) >= 2 else last_glyph.xMin

    # 1. start glyph: lamed_s{max} clipped at (x >= bar_clip_x_left, y <= seg_bar_top)
    # so its left edge is a clean vertical line that tiles seamlessly with
    # the rectangular intermediate segments.
    BIG = 100_000
    src_path = pathops.Path()
    last_glyph.draw(src_path.getPen(), glyf)
    clip_box = pathops.Path()
    cb = clip_box.getPen()
    cb.moveTo((bar_clip_x_left, -BIG)); cb.lineTo((BIG, -BIG))
    cb.lineTo((BIG, seg_bar_top)); cb.lineTo((bar_clip_x_left, seg_bar_top))
    cb.closePath()
    no_arm_path = pathops.op(src_path, clip_box, pathops.PathOp.INTERSECTION)
    start_pen = TTGlyphPen(None)
    no_arm_path.draw(start_pen)
    start_glyph = start_pen.glyph()
    start_glyph.recalcBounds(glyf)
    start_name = f"{letter_name}_overflow_start"
    glyf[start_name] = start_glyph
    base_advance = font["hmtx"].metrics[src_glyph_name][0]
    max_advance = base_advance + step * max_levels
    # lsb=0 (shift mode) keeps display alignment consistent with lamed_s{max}.
    font["hmtx"].metrics[start_name] = (max_advance, 0)

    # 2. Extract the bar's left-edge structure from lamed_s{max} — the
    # rounded bottom-left and top-left corners that we just clipped OFF
    # the start glyph. Translate so its rightmost x = 0 (i.e., it sits
    # to the left of seg_tail's bar rectangle, providing the visual
    # rounded-end-cap.)
    edge_clip = pathops.Path()
    ec = edge_clip.getPen()
    ec.moveTo((-BIG, bar_bottom)); ec.lineTo((bar_clip_x_left, bar_bottom))
    ec.lineTo((bar_clip_x_left, seg_bar_top)); ec.lineTo((-BIG, seg_bar_top))
    ec.closePath()
    edge_path = pathops.op(src_path, edge_clip, pathops.PathOp.INTERSECTION)
    edge_xmax_orig = edge_path.bounds[2] if edge_path.bounds else 0
    edge_path = edge_path.transform(1, 0, 0, 1, -edge_xmax_orig, 0)
    corner_leftmost_x = edge_path.bounds[0] if edge_path.bounds else 0

    # 3. arm-only outline from the ORIGINAL (unstretched) glyph (arm class
    # only). Extract everything above seg_bar_top so the arm bottom continues
    # from the bar's top with no gap. Translate the arm so it sits at the
    # visual leftmost of the cluster — its leftmost x lands
    # `arm_overhang_past_corner` units to the LEFT of the rounded corner cap.
    arm_path = None
    if has_arm:
        arm_path = _clip_glyph_at_y(glyf, src_glyph_name, seg_bar_top, keep_below=False)
        # Optionally clip the arm's TOP — Hebrew lameds typically end in a
        # small decorative serif/kotz at the very top, which reads as a
        # "lip" when grafted onto an extension. `arm_top_y` (per-letter
        # config) clips at that y to leave a smoother rounded top.
        arm_top_y = info.get("arm_top_y")
        if arm_top_y is not None:
            top_clip = pathops.Path()
            tc = top_clip.getPen()
            tc.moveTo((-BIG, -BIG)); tc.lineTo((BIG, -BIG))
            tc.lineTo((BIG, int(arm_top_y))); tc.lineTo((-BIG, int(arm_top_y)))
            tc.closePath()
            arm_path = pathops.op(arm_path, top_clip, pathops.PathOp.INTERSECTION)
        arm_bounds = arm_path.bounds
        arm_overhang_past_corner = 20
        arm_target_xmin = corner_leftmost_x - arm_overhang_past_corner
        arm_translate_x = arm_target_xmin - arm_bounds[0]
        arm_translate_y = seg_bar_top - arm_bounds[1]
        arm_path = arm_path.transform(1, 0, 0, 1, arm_translate_x, arm_translate_y)

    # 4. tail glyph: bar rectangle + corner cap + arm (if arm-class). Bar
    # extends 2 units beyond `step` on both sides so adjacent segments
    # overlap (hides sub-pixel/AA gaps).
    tail_pen = TTGlyphPen(None)
    if arm_path is not None:
        arm_path.draw(tail_pen)
    edge_path.draw(tail_pen)
    tail_pen.moveTo((-2, bar_bottom))
    tail_pen.lineTo((step + 2, bar_bottom))
    tail_pen.lineTo((step + 2, seg_bar_top))
    tail_pen.lineTo((-2, seg_bar_top))
    tail_pen.closePath()
    tail_glyph = tail_pen.glyph()
    tail_glyph.recalcBounds(glyf)
    tail_name = f"{letter_name}_overflow_tail"
    glyf[tail_name] = tail_glyph
    # lsb = xMin so display offset = 0 → bar's display = pen..pen+step,
    # tiling seamlessly to the next intermediate segment (which has lsb=0).
    font["hmtx"].metrics[tail_name] = (step, tail_glyph.xMin)

    # 5. intermediate segment: plain bar rectangle, lsb=0. Outline extends
    # 2 units beyond `step` on each side to overlap adjacent segments and
    # hide sub-pixel rendering gaps between glyphs.
    int_pen = TTGlyphPen(None)
    int_pen.moveTo((-2, bar_bottom))
    int_pen.lineTo((step + 2, bar_bottom))
    int_pen.lineTo((step + 2, seg_bar_top))
    int_pen.lineTo((-2, seg_bar_top))
    int_pen.closePath()
    int_glyph = int_pen.glyph()
    int_name = f"{letter_name}_bar_segment"
    glyf[int_name] = int_glyph
    font["hmtx"].metrics[int_name] = (step, 0)

    order = font.getGlyphOrder()
    for n in (start_name, int_name, tail_name):
        if n not in order:
            order.append(n)
    font.setGlyphOrder(order)

    return start_name, int_name, tail_name


def build_one(config: dict) -> int:
    src_path = FONTS_DIR / config["source"]
    out_path = FONTS_DIR / config["output"]
    family = config["family"]
    postscript = config["postscript"]
    internal_id = config["internal_id"]
    step = int(config["step"])
    letters = config["letters"]

    print(f"\n=== Building {family} (from {config['source']}) ===")
    if not src_path.exists():
        print(f"  ! Missing source font {src_path}")
        return 1

    font = TTFont(str(src_path))

    # --- 1. Design the U+E010 control/stretch glyph (zero-advance placeholder
    # for chain-substitution). It acts as the trigger codepoint the user
    # types; GSUB ligatures consume pairs of (letter, U+E010) → stretched.
    pen = TTGlyphPen(None)
    pen.moveTo((0, 0))
    pen.lineTo((1, 0))
    pen.lineTo((1, 1))
    pen.lineTo((0, 1))
    pen.closePath()
    trigger_glyph = pen.glyph()
    order = font.getGlyphOrder()
    if STRETCH_GLYPH not in order:
        order.append(STRETCH_GLYPH)
    font.setGlyphOrder(order)
    font["glyf"][STRETCH_GLYPH] = trigger_glyph
    # Keep advance small so unmatched extenders at word-end aren't huge.
    font["hmtx"].metrics[STRETCH_GLYPH] = (40, 0)

    # Map the codepoint.
    for t in font["cmap"].tables:
        if t.isUnicode() or t.platformID == 3:
            t.cmap[STRETCH_CODEPOINT] = STRETCH_GLYPH

    # --- 2. For each stretch letter, generate MAX_LEVELS variant glyphs.
    # letter_variants: src_glyph -> {"variants": [s1..sMAX], "aliases": [...]}
    # Aliases are extra source glyphs (composed presentation forms) that
    # should also trigger the same stretch (see LETTERS dict for details).
    letter_variants: dict[str, dict] = {}
    # src_glyph -> (segment_glyph_name, last_variant_name) — populated for
    # bar-class letters with "overflow": True (simple single-segment chain).
    overflow_segments: dict[str, tuple[str, str]] = {}
    # src_glyph -> (start, intermediate, tail, last_variant) — populated
    # for arm-class letters with "overflow": True (start/tail/intermediate
    # three-glyph chain that migrates the arm to the leftmost end).
    overflow_chains: dict[str, tuple[str, str, str, str]] = {}
    cmap = font.getBestCmap()

    for cp, info in letters.items():
        letter_name = str(info["name"])
        letter_class = str(info.get("class", "bar"))
        bar_bottom = int(info.get("bar_bottom", 440))  # type: ignore
        bar_top = int(info.get("bar_top", 620))  # type: ignore
        arm = info.get("arm_min_y")
        arm_min_y = int(arm) if isinstance(arm, int) else None
        leg = info.get("leg_max_y")
        leg_max_y = int(leg) if isinstance(leg, int) else None
        x_cut = info.get("x_cutoff")
        x_cut_int = int(x_cut) if isinstance(x_cut, int) else None
        und_y = info.get("underside_y_max")
        underside_y_max = int(und_y) if isinstance(und_y, int) else None
        und_x = info.get("underside_x_min")
        underside_x_min = int(und_x) if isinstance(und_x, int) else None
        # Resolve alias codepoints (Hebrew Presentation Forms) to the
        # actual glyph names this font uses. Different fonts have different
        # naming conventions (uniFB33 vs daleddagesh).
        alias_cps_raw = info.get("alias_codepoints", [])
        alias_cps = list(alias_cps_raw) if isinstance(alias_cps_raw, list) else []
        aliases = [cmap[a] for a in alias_cps if a in cmap]
        shift_contours_raw = info.get("shift_contours")
        shift_contours = list(shift_contours_raw) if isinstance(shift_contours_raw, list) else None
        src_glyph = cmap.get(cp)
        if not src_glyph:
            print(f"  skip {letter_name}: not in cmap")
            continue

        base_advance = font["hmtx"].metrics[src_glyph][0]
        variants: list[str] = []
        for n in range(1, MAX_LEVELS + 1):
            variant_name = f"{letter_name}_s{n}"
            total_shift = step * n
            new_glyph = stretch_glyph(
                font, src_glyph, total_shift,
                letter_class=letter_class,
                bar_bottom=bar_bottom, bar_top=bar_top,
                arm_min_y=arm_min_y, leg_max_y=leg_max_y,
                x_cutoff=x_cut_int,
                shift_contours=shift_contours,
                underside_y_max=underside_y_max,
                underside_x_min=underside_x_min,
            )
            # Grow advance proportionally: stretched letter takes more
            # horizontal space so neighbors don't overlap its extended arm.
            # lsb_mode controls how the renderer positions the body:
            #   "shift"   (default): lsb=0 → renderer translates right by
            #              (lsb - xMin) = -xMin, pulling the body close to
            #              the previous letter and letting the kashida
            #              visually bridge to it. Right for proportional
            #              fonts where the source xMin is small/positive.
            #   "natural": lsb=xMin → no translation, body stays at its
            #              source-coord position. Required for fonts whose
            #              source already has very negative xMin (e.g. Stam
            #              Ashkenaz lamed at xMin=-300): with lsb=0 the
            #              body translates so far right it intersects the
            #              previous letter.
            #   "mono":    translate the entire stretched glyph rightward
            #              by exactly `shift`. The advance grows by `shift`,
            #              so this preserves the body's offset from the
            #              advance's right edge — the body stays where it
            #              would naturally sit relative to the NEXT letter
            #              on its right. The arm and kashida extend left
            #              into the new space. Required for (a) mono fonts
            #              (body lands in the rightmost cell, kashida fills
            #              the extra cells leftward) and (b) any font whose
            #              source has very negative xMin (e.g. Stam Ashkenaz
            #              lamed at -300), where "shift" overshoots and
            #              "natural" leaves a `shift`-sized gap to the next
            #              letter.
            lsb_mode = config.get("lsb_mode", "shift")
            if lsb_mode == "mono":
                for i in range(len(new_glyph.coordinates)):
                    x, y = new_glyph.coordinates[i]
                    new_glyph.coordinates[i] = (x + total_shift, y)
                new_glyph.recalcBounds(font["glyf"])
                new_lsb = new_glyph.xMin
            elif lsb_mode == "natural":
                new_lsb = new_glyph.xMin
            else:
                new_lsb = 0
            font["glyf"][variant_name] = new_glyph
            font["hmtx"].metrics[variant_name] = (base_advance + total_shift, new_lsb)
            if variant_name not in order:
                order.append(variant_name)
            font.setGlyphOrder(order)
            variants.append(variant_name)
        letter_variants[src_glyph] = {"variants": variants, "aliases": aliases}
        alias_note = f" + aliases {aliases}" if aliases else ""
        print(f"  {letter_name} (class {letter_class}): {MAX_LEVELS} variants × step={step}{alias_note}")

        # Overflow tatweel-style chain. Default-enabled for bar/arm class
        # letters in shift-mode fonts (the math for natural/mono modes
        # still needs derivation, so those are skipped). Leg/box classes
        # still TODO. Per-letter `"overflow": False` opts out.
        is_shift = config.get("lsb_mode", "shift") == "shift"
        overflow_default = letter_class in ("bar", "arm") and is_shift
        overflow_enabled = info.get("overflow", overflow_default)
        if overflow_enabled and is_shift and letter_class in ("bar", "arm"):
            start, intermed, tail = build_overflow_chain(
                font, src_glyph, variants[-1], info, step, MAX_LEVELS,
            )
            overflow_chains[src_glyph] = (start, intermed, tail, variants[-1])
            print(f"    + overflow chain ({letter_class}): start={start}, int={intermed}, tail={tail}")

    # --- 2a. Drop variable-font tables. Noto Sans/Serif Hebrew (and other
    # Google variable fonts) ship with fvar/gvar/HVAR/STAT/avar. When we
    # add stretch variant glyphs to the font, gvar's per-glyph variation
    # records no longer match glyphCount → font is invalid and the new
    # glyphs render as blanks. We don't need variable axes for static
    # stretch derivatives, so drop the variable-font tables entirely.
    for tag in ("fvar", "gvar", "avar", "cvar", "HVAR", "VVAR", "MVAR", "STAT"):
        if tag in font:
            del font[tag]

    # --- 2b. Optionally import Arabic combining marks (shaddah, tanwin,
    # sukun) so the same font can render Hebrew base + Arabic mark cleanly.
    import_marks = config.get("import_marks", [])
    if import_marks:
        n = import_arabic_marks(font, list(import_marks))
        print(f"  imported {n} Arabic mark glyphs from Amiri")
    # --- 2c. Custom two-dots-above (U+0308) — designed for Hebrew letter
    # heights. Lets users place dots above Hebrew Heh to evoke Arabic ة.
    if add_two_dots_above(font):
        print(f"  installed two-dots-above (U+0308)")

    # --- 3. Wire up GSUB ligatures via feaLib (Adobe Feature File syntax).
    #
    # IMPORTANT: Use MULTI-COMPONENT ligatures, not a chain. HarfBuzz's
    # ligature substitution fires once per cursor position then advances
    # PAST the new ligature, so (lam, E010) → lam_s1 followed by
    # (lam_s1, E010) → lam_s2 never chains — the shaper doesn't reconsider
    # the just-emitted glyph. Instead, emit rules for every count:
    #   sub lam E010 E010 E010 E010 E010 E010 by lam_s6;
    #   sub lam E010 E010 E010 E010 E010 by lam_s5;
    #   ...
    # and list longest first so greedy matching picks the biggest chain.
    #
    # Also declare `languagesystem hebr dflt;` so the feature is registered
    # under the Hebrew script, not just DFLT.
    # `lookupflag IgnoreMarks;` tells the shaper to skip over niqqud
    # (combining marks in GDEF Mark class) when matching ligature components.
    # Without it, a letter with its own niqqud (e.g. "תּ" = ת + dagesh)
    # followed by triggers won't match because the dagesh sits between the
    # letter and the first trigger. With IgnoreMarks, (ת + [skip dagesh] +
    # U+05C6 × N) → tav_sN correctly.
    fea_lines = [
        "languagesystem DFLT dflt;",
        "languagesystem hebr dflt;",
        "",
    ]
    # Helper lookups for the overflow chain. Defined OUTSIDE the feature
    # block so they can be invoked from chained-context rules. Each
    # overflow letter gets its own `kashida → bar_segment` (or → tail)
    # lookup so we can reference the per-letter glyph by name.
    for src_glyph, (seg_name, _last) in overflow_segments.items():
        fea_lines.append(f"lookup k_to_{seg_name} {{")
        fea_lines.append(f"    sub {STRETCH_GLYPH} by {seg_name};")
        fea_lines.append(f"}} k_to_{seg_name};")
        fea_lines.append("")
    for src_glyph, (_start, _int, tail, _last) in overflow_chains.items():
        fea_lines.append(f"lookup k_to_{tail} {{")
        fea_lines.append(f"    sub {STRETCH_GLYPH} by {tail};")
        fea_lines.append(f"}} k_to_{tail};")
        fea_lines.append("")
    fea_lines += [
        "feature liga {",
        "    lookupflag IgnoreMarks;",
    ]
    total_rules = 0
    for src_glyph, payload in letter_variants.items():
        variants = payload["variants"]
        aliases = payload.get("aliases", [])
        first_glyphs = [src_glyph] + [a for a in aliases if a in font.getGlyphOrder()]
        for first in first_glyphs:
            # Emit longest first (MAX_LEVELS components) down to shortest.
            for n in range(len(variants), 0, -1):
                comps = " ".join([first] + [STRETCH_GLYPH] * n)
                fea_lines.append(f"    sub {comps} by {variants[n - 1]};")
                total_rules += 1
    # --- Overflow chain. AFTER all the multi-component ligatures so the
    # max-level ligature consumes its full quota of kashidas first, then
    # leftover kashidas get tatweel-substituted into bar segments. The
    # second rule (`sub bar_segment U+05C6'`) is what makes the chain
    # arbitrarily long: each substitution puts a bar_segment before the
    # next kashida, which then triggers the same lookup. HarfBuzz processes
    # chained-context substitutions left-to-right with re-entry, so the
    # cascade resolves in one pass.
    overflow_rules = 0
    for src_glyph, (seg_name, last_variant) in overflow_segments.items():
        fea_lines.append(f"    sub {last_variant} {STRETCH_GLYPH}' lookup k_to_{seg_name};")
        fea_lines.append(f"    sub {seg_name} {STRETCH_GLYPH}' lookup k_to_{seg_name};")
        overflow_rules += 2
    # Arm-class overflow chain (lamed). The "extend" rules and the "demote"
    # rule must live in SEPARATE lookups — within one lookup the shaper
    # makes a single left-to-right pass, so without splitting, all the new
    # tails would already be there but the demote rule would miss them.
    # Splitting forces a second pass after extend completes.
    #
    # Pass 1 (extend, single lookup):
    #   [lamed_s16, k, k, k] → [start, tail, tail, tail]
    # Pass 2 (demote, separate lookup):
    #   → [start, intermediate, intermediate, tail]
    # The arm rides with the LAST tail = leftmost segment in display.
    fea_lines.append("} liga;")
    for src_glyph, (start, intermed, tail, last_variant) in overflow_chains.items():
        fea_lines.append("")
        fea_lines.append(f"feature liga {{")
        fea_lines.append(f"    lookupflag IgnoreMarks;")
        fea_lines.append(f"    sub {last_variant}' {STRETCH_GLYPH} by {start};")
        fea_lines.append(f"    sub {start} {STRETCH_GLYPH}' lookup k_to_{tail};")
        fea_lines.append(f"    sub {tail} {STRETCH_GLYPH}' lookup k_to_{tail};")
        fea_lines.append(f"}} liga;")
        fea_lines.append("")
        fea_lines.append(f"feature liga {{")
        fea_lines.append(f"    lookupflag IgnoreMarks;")
        fea_lines.append(f"    sub {tail}' {tail} by {intermed};")
        fea_lines.append(f"}} liga;")
        overflow_rules += 4
    fea_src = "\n".join(fea_lines)
    addOpenTypeFeaturesFromString(font, fea_src)
    overflow_note = f" + {overflow_rules} overflow chain rules" if overflow_rules else ""
    print(f"  wired {total_rules} multi-component ligature rules via feaLib{overflow_note}")

    # --- 4. Rename per OFL/GPL §3 (must rename derivatives).
    name_table = font["name"]
    RENAMES = {
        1: family,
        4: family + " Regular",
        6: postscript,
        16: family,
        17: "Regular",
    }
    plat_variants = [(3, 1, 0x409), (1, 0, 0x0)]
    for name_id, value in RENAMES.items():
        for plat in plat_variants:
            name_table.setName(value, name_id, plat[0], plat[1], plat[2])
    for plat in plat_variants:
        name_table.setName(internal_id, 3, plat[0], plat[1], plat[2])

    # --- 5. Save.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(out_path))
    size_kb = out_path.stat().st_size / 1024
    print(f"  ✓ Wrote {out_path.name} ({size_kb:.0f} KB)")
    return 0


def main() -> int:
    """Build every font in CONFIGS. Failures don't stop the loop — each
    config is independent."""
    failures = 0
    for cfg in CONFIGS:
        try:
            rc = build_one(cfg)
            if rc != 0:
                failures += 1
        except Exception as e:
            print(f"  ! Build failed for {cfg.get('id')}: {e}")
            failures += 1
    print(f"\nDone. {len(CONFIGS) - failures}/{len(CONFIGS)} fonts built.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
