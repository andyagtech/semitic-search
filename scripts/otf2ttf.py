"""Convert a CFF-based .otf font to a TrueType .ttf with quadratic outlines.

Needed because our stretch-font builder reads/modifies glyf table directly,
which only exists in TrueType. CFF (`CFF ` table) uses cubic Bezier curves
that need conversion to quadratic via cu2qu.

Usage: python otf2ttf.py SOURCE.otf [DEST.ttf]
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._g_l_y_f import Glyph
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen


def otf_to_ttf(src_path: Path, dst_path: Path, max_err: float = 1.0) -> None:
    font = TTFont(str(src_path))
    if "glyf" in font:
        # already TrueType; just re-save under the new name
        font.save(str(dst_path))
        return
    if "CFF " not in font and "CFF2" not in font:
        raise ValueError(f"{src_path}: no CFF or glyf — unknown outline format")

    glyph_set = font.getGlyphSet()
    glyph_order = font.getGlyphOrder()

    # Convert each CFF glyph to a TTGlyph via Cu2QuPen.
    new_glyphs: dict[str, Glyph] = {}
    for name in glyph_order:
        ttpen = TTGlyphPen(None)
        cu2qu_pen = Cu2QuPen(ttpen, max_err=max_err)
        glyph_set[name].draw(cu2qu_pen)
        new_glyphs[name] = ttpen.glyph()

    # Replace CFF outline tables with glyf + loca.
    glyf = newTable("glyf")
    glyf.glyphOrder = glyph_order
    glyf.glyphs = new_glyphs
    font["glyf"] = glyf
    # loca is auto-built when font["glyf"] is compiled.
    font["loca"] = newTable("loca")

    # Patch maxp from version 0.5 (CFF) to 1.0 (TT) and recompute counts.
    maxp = font["maxp"]
    maxp.tableVersion = 0x00010000
    maxp.maxPoints = 0
    maxp.maxContours = 0
    maxp.maxCompositePoints = 0
    maxp.maxCompositeContours = 0
    maxp.maxZones = 2
    maxp.maxTwilightPoints = 0
    maxp.maxStorage = 0
    maxp.maxFunctionDefs = 0
    maxp.maxInstructionDefs = 0
    maxp.maxStackElements = 0
    maxp.maxSizeOfInstructions = 0
    maxp.maxComponentElements = 0
    maxp.maxComponentDepth = 0
    for g in new_glyphs.values():
        if g.numberOfContours > 0:
            n_pts = len(g.coordinates)
            n_contours = g.numberOfContours
            if n_pts > maxp.maxPoints:
                maxp.maxPoints = n_pts
            if n_contours > maxp.maxContours:
                maxp.maxContours = n_contours

    # Drop CFF tables and switch font flavor to TrueType.
    for tag in ("CFF ", "CFF2", "VORG"):
        if tag in font:
            del font[tag]
    font.sfntVersion = "\x00\x01\x00\x00"  # TrueType magic

    font.save(str(dst_path))


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) >= 3 else src.with_suffix(".ttf")
    otf_to_ttf(src, dst)
    print(f"✓ {src.name} → {dst.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
