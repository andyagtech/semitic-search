"""Derive a kashida-capable Hebrew font from Frank Ruhl Libre (SIL OFL) by
adding per-letter STRETCHED VARIANTS of the calligraphically-extendable
letters (ד ה ז ח ל ם ן ר ת) and wiring them up with GSUB ligatures, so
`letter + N × U+E010` substitutes with `letter_stretched_N`. This gives
proper Hebrew-scribal widening where the letter's own stroke extends,
rather than floating a separate rectangle between characters.

Algorithm per letter per stretch level N:
  1. Find the topmost stroke region of the letter (y near yMax).
  2. Identify points at the LEFT END of that region.
  3. Shift those left-end points further LEFT by STEP × N units.
  4. Expand the glyph's xMin accordingly.
  5. Leave the advance width unchanged — the stretched glyph extends
     LEFT of its origin, overlapping into the previous visual letter
     in RTL (which is empty space at word-end, so no collision).

Output is renamed "Semitic Stretch Hebrew" per SIL OFL §3.
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

SRC = Path(__file__).resolve().parents[1] / "web" / "public" / "fonts" / "FrankRuhlLibre.ttf"
OUT = Path(__file__).resolve().parents[1] / "web" / "public" / "fonts" / "SemiticStretchHebrew.ttf"

# Our stretch trigger. Originally U+E010 (PUA) — but browsers segment text
# into script runs BEFORE shaping, and PUA has script=Unknown/Zzzz. That
# means lam+E010 lands in two separate shaping runs and the GSUB `liga`
# lookup can never match across them. Use U+05C6 (Hebrew Punctuation Nun
# Hafukha) instead: script=Hebrew → stays in the Hebrew run, so the
# ligature substitution fires. It's non-combining (gc=Po) and extremely
# rare in real text (only appears a few times in Torah — Numbers 10:35-36).
STRETCH_CODEPOINT = 0x05C6
STRETCH_GLYPH = f"uni{STRETCH_CODEPOINT:04X}"
NEW_NAME = "Semitic Stretch Hebrew"
NEW_POSTSCRIPT = "SemiticStretchHebrew"
MAX_LEVELS = 6         # number of stretch variants per letter
STEP = 150             # units of leftward extension per level

# Hebrew letters traditionally stretched in Torah scribal justification
# (ת ם ל ה plus dalet/resh which are calligraphically similar).
# Aleph (א) is a special case — diagonal strokes, NOT shipped here.
#
# Each letter has a "class" that determines which contour points shift:
#   A = single-stroke top arm (ל ר ד):
#       Points with y >= y_threshold shift LEFT. Straightforward.
# Zone-based stretching model (matches Torah scribal widening):
#   bar — top bar stretches, no rigid arm/leg (dalet ד, resh ר).
#   arm — top bar stretches, ARM ABOVE rides rigidly with the bar's
#         left edge (lamed ל). Above-the-bar = full shift.
#   leg — top bar stretches, LEFT LEG BELOW rides rigidly with the bar's
#         left edge (tav ת, he ה). Below-the-bar-and-left = full shift,
#         right leg stays.
#   box — enclosed rectangle widens on the left (finalmem ם).
#
# Each class uses linear falloff in x across the bar zone: leftmost points
# of the bar shift by `shift`, points at x=x_cutoff shift by 0. The rigid
# element shifts by `shift` uniformly so its shape is preserved.
LETTERS: dict[int, dict[str, object]] = {
    # x_cutoff is the HARD boundary inside the bar zone. Points at x<x_cutoff
    # shift by the full amount (rigidly, with the arm/leg). Points at
    # x>=x_cutoff stay anchored. Pick x_cutoff between the arm/leg's extent
    # and the anchored-body's extent — it's the x-location where the flat
    # extended bar is "cut" and a new horizontal segment is inserted.
    # `aliases`: extra source glyphs that should ALSO trigger the stretch
    # (in addition to the base codepoint). Needed because the font's `ccmp`/
    # `rlig` pre-composes letter+dagesh into Hebrew Presentation Forms (U+FB30
    # block) BEFORE our liga runs. If we only matched bare letters, vocalized
    # text with dagesh (תּ, דּ, ...) would never stretch.
    0x05D3: {"name": "dalet",    "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 290,
             "aliases": ["uniFB33"]},                                # ד + dagesh — descender starts at x≈291
    0x05D4: {"name": "he",       "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 400, "x_cutoff": 350,
             "aliases": ["uniFB34"]},                                # ה + mapiq
    0x05DC: {"name": "lamed",    "class": "arm", "bar_bottom": 440, "bar_top": 573, "arm_min_y": 573, "x_cutoff": 300,
             "aliases": ["uniFB3C"]},                                # ל + dagesh (rare)
    0x05DD: {"name": "finalmem", "class": "box", "x_cutoff": 300},
    0x05E8: {"name": "resh",     "class": "bar", "bar_bottom": 440, "bar_top": 620, "x_cutoff": 300,
             "aliases": ["uniFB48"]},                                # ר + dagesh (rare) — descender corner at x=321
    0x05EA: {"name": "tav",      "class": "leg", "bar_bottom": 440, "bar_top": 620, "leg_max_y": 440, "x_cutoff": 350,
             "aliases": ["uniFB4A"]},                                # ת + dagesh
}


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
    for i, (x, y) in enumerate(new_glyph.coordinates):
        s = shift_for(x, y)
        if s > 0:
            new_glyph.coordinates[i] = (int(round(x - s)), y)
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


def main() -> int:
    if not SRC.exists():
        print(f"Missing {SRC}")
        return 1

    font = TTFont(str(SRC))

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
    cmap = font.getBestCmap()

    for cp, info in LETTERS.items():
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
        aliases_raw = info.get("aliases", [])
        aliases = list(aliases_raw) if isinstance(aliases_raw, list) else []
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
            total_shift = STEP * n
            new_glyph = stretch_glyph(
                font, src_glyph, total_shift,
                letter_class=letter_class,
                bar_bottom=bar_bottom, bar_top=bar_top,
                arm_min_y=arm_min_y, leg_max_y=leg_max_y,
                x_cutoff=x_cut_int,
                shift_contours=shift_contours,
            )
            font["glyf"][variant_name] = new_glyph
            # Grow advance proportionally: stretched letter takes more
            # horizontal space so neighbors don't overlap its extended arm.
            font["hmtx"].metrics[variant_name] = (base_advance + total_shift, 0)
            if variant_name not in order:
                order.append(variant_name)
            font.setGlyphOrder(order)
            variants.append(variant_name)
        letter_variants[src_glyph] = {"variants": variants, "aliases": aliases}
        alias_note = f" + aliases {aliases}" if aliases else ""
        print(f"  {letter_name} (class {letter_class}): {MAX_LEVELS} variants × step={STEP}{alias_note}")

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
    fea_lines.append("} liga;")
    fea_src = "\n".join(fea_lines)
    addOpenTypeFeaturesFromString(font, fea_src)
    print(f"  wired {total_rules} multi-component ligature rules via feaLib")

    # --- 4. Rename per OFL.
    name_table = font["name"]
    RENAMES = {
        1: NEW_NAME,
        4: NEW_NAME + " Regular",
        6: NEW_POSTSCRIPT,
        16: NEW_NAME,
        17: "Regular",
    }
    plat_variants = [(3, 1, 0x409), (1, 0, 0x0)]
    for name_id, value in RENAMES.items():
        for plat in plat_variants:
            name_table.setName(value, name_id, plat[0], plat[1], plat[2])
    for plat in plat_variants:
        name_table.setName("SemiticSearch-SemiticStretchHebrew-2.0", 3, plat[0], plat[1], plat[2])

    # --- 5. Save.
    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUT))
    size_kb = OUT.stat().st_size / 1024
    print(f"\n✓ Wrote {OUT} ({size_kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
