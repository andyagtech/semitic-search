"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  convert,
  type Script as ConvertScript,
  SCRIPT_LABELS as CONVERT_LABELS,
  MODERN_SCRIPTS as CONVERT_MODERN,
  ANCIENT_SCRIPTS as CONVERT_ANCIENT,
} from "@/lib/script_convert";

// FontLab script-id → cross-script converter script-id. Only scripts
// with an entry here can act as source or target for the converter.
const CONVERTIBLE: Record<string, ConvertScript> = {
  hebrew: "he",
  syriac: "syr",
  arabic: "ar",
  ethiopic: "eth",
  paleo: "paleo",
  samaritan: "samaritan",
  aramaic: "aramaic",
  ugaritic: "ugaritic",
};
const CONVERT_TO_FONTLAB: Record<ConvertScript, string> = {
  he: "hebrew",
  syr: "syriac",
  ar: "arabic",
  eth: "ethiopic",
  paleo: "paleo",
  samaritan: "samaritan",
  aramaic: "aramaic",
  ugaritic: "ugaritic",
};

// All fonts local under /public/fonts/. Open licenses: SIL OFL for the
// Google Noto family + Amiri + Solitreo, GPL for Ktav Yad CLM (Culmus
// Project).
type FontEntry = {
  id: string;
  label: string;
  file: string;
  family: string;
  note?: string;
};

type ScriptEntry = {
  id: string;
  label: string;
  dir: "rtl" | "ltr";
  sample: string;
  fonts: FontEntry[];
};

const SCRIPTS: ScriptEntry[] = [
  {
    id: "arabic", label: "Arabic", dir: "rtl",
    // Van Dyck Arabic translation of Genesis 1:1 — "In the beginning God
    // created the heavens and the earth". Multi-line so auto-justify has
    // room to insert tatweels on each row.
    sample:
      "فِي الْبَدْءِ خَلَقَ اللهُ\n" +
      "السَّمَاوَاتِ\n" +
      "وَالأَرْضَ",
    fonts: [
      { id: "amiri",    label: "Amiri (classical Naskh)", file: "Amiri-Regular.ttf", family: "FL_Amiri" },
      { id: "naskh",    label: "Noto Naskh Arabic",       file: "NotoNaskhArabic.ttf", family: "FL_NaskhArabic" },
      { id: "kufi",     label: "Reem Kufi",               file: "ReemKufi-Regular.ttf", family: "FL_ReemKufi" },
      { id: "notokufi", label: "Noto Kufi Arabic",        file: "NotoKufiArabic.ttf", family: "FL_NotoKufiArabic" },
      { id: "nastaliq", label: "Noto Nastaliq Urdu",      file: "NotoNastaliqUrdu.ttf", family: "FL_NotoNastaliq" },
      { id: "sans",     label: "Noto Sans Arabic",        file: "NotoSansArabic.ttf", family: "FL_NotoSansArabic" },
    ],
  },
  {
    id: "hebrew", label: "Hebrew", dir: "rtl",
    sample: "בְּרֵאשִׁית בָּרָא אֱלֹהִים",
    fonts: [
      // ─── Semitic Stretch fonts — grouped at the top since they're the flagship ───
      { id: "stretch",    label: "Semitic Stretch Hebrew", file: "SemiticStretchHebrew.ttf", family: "FL_StretchHebrew",
        note: "custom derivative of Frank Ruhl Libre (OFL). Kashida-like widening via + / − keys." },
      { id: "stretchketer", label: "Semitic Stretch Keter Aram Tsova", file: "SemiticStretchKeterAramTsova.ttf", family: "FL_StretchKeterAram",
        note: "Keter Aram Tsova (Culmus, GPL). Aleppo-codex letterforms with kashida-like widening." },
      { id: "stretchshmulik", label: "Semitic Stretch Shmulik CLM", file: "SemiticStretchShmulikCLM.ttf", family: "FL_StretchShmulik",
        note: "Culmus (GPL) by Yoram Gnat. Display serif with kashida-like widening." },
      { id: "stretchhillel", label: "Semitic Stretch Hillel CLM", file: "SemiticStretchHillelCLM.ttf", family: "FL_StretchHillel",
        note: "Culmus (GPL) by Maxim Iorsh. Modern Hebrew, consonants only (no niqqud)." },
      { id: "stretchgladia", label: "Semitic Stretch Gladia CLM", file: "SemiticStretchGladiaCLM.ttf", family: "FL_StretchGladia",
        note: "Culmus (GPL) by Maxim Iorsh. Bold display Hebrew, consonants only." },
      { id: "stretchnotosanshebrew", label: "Semitic Stretch Noto Sans Hebrew", file: "SemiticStretchNotoSansHebrew.ttf", family: "FL_StretchNotoSansHebrew",
        note: "Noto Sans Hebrew (OFL) with stretch ligatures." },
      { id: "stretchnotoserifhebrew", label: "Semitic Stretch Noto Serif Hebrew", file: "SemiticStretchNotoSerifHebrew.ttf", family: "FL_StretchNotoSerifHebrew",
        note: "Noto Serif Hebrew (OFL) with stretch ligatures." },
      { id: "stretchshofar", label: "Semitic Stretch Shofar", file: "SemiticStretchShofar.ttf", family: "FL_StretchShofar",
        note: "Shofar (Culmus, GPL); Karaitic-inspired with stretch ligatures." },
      { id: "stretchezrasil", label: "Semitic Stretch Ezra SIL SR", file: "SemiticStretchEzraSIL.ttf", family: "FL_StretchEzraSIL",
        note: "Ezra SIL SR (SIL OFL); scholarly Bible font with stretch." },
      { id: "stretchstamashkenaz", label: "Semitic Stretch Stam Ashkenaz CLM", file: "SemiticStretchStamAshkenazCLM.ttf", family: "FL_StretchStamAshkenaz",
        note: "Stam Ashkenaz CLM (Culmus, GPL); Ashkenazi Torah-scribal with stretch." },
      { id: "stretchshlomosemistam", label: "Semitic Stretch Shlomo SemiStam", file: "SemiticStretchShlomoSemiStam.ttf", family: "FL_StretchShlomoSemiStam",
        note: "Shlomo SemiStam (CC BY-SA / OFL); derived from Ezra SIL SR with full cantillation." },
      { id: "stretchrashi", label: "Semitic Stretch Rashi", file: "SemiticStretchRashi.ttf", family: "FL_StretchRashi",
        note: "Noto Rashi Hebrew (OFL) with stretch ligatures. Historically apt: printed Rashi commentaries live in narrow justified columns beside the main biblical text." },
      { id: "stretchnachlieli", label: "Semitic Stretch Nachlieli CLM", file: "SemiticStretchNachlieliCLM.ttf", family: "FL_StretchNachlieli",
        note: "Nachlieli CLM Light (Culmus, GPL); airy serif Hebrew with stretch." },
      { id: "stretchmiriammono", label: "Semitic Stretch Miriam Mono CLM", file: "SemiticStretchMiriamMonoCLM.ttf", family: "FL_StretchMiriamMono",
        note: "Miriam Mono CLM (Culmus, GPL); monospace serif with stretch." },
      { id: "stretchfreemono", label: "Semitic Stretch FreeMono", file: "SemiticStretchFreeMono.ttf", family: "FL_StretchFreeMono",
        note: "GNU FreeMono (GPL) — monospace; stretch breaks the monospacing for stretched letters." },
      // ─── Non-stretch Hebrew fonts — only those without a stretch build ───
      // (Noto Sans/Serif Hebrew, Frank Ruhl Libre, Keter Aram Tsova, and
      // Shofar were dropped because Semitic Stretch versions already cover
      // them 1:1 — the un-widened variant is just the same font without the
      // extender GSUB, so it's redundant.)
      { id: "davidlibre", label: "David Libre",        file: "DavidLibre-Regular.ttf", family: "FL_DavidLibre",
        note: "digital revival of David; Jerusalem style" },
      { id: "heebo",      label: "Heebo",              file: "Heebo.ttf", family: "FL_Heebo",
        note: "modern Israeli sans" },
      { id: "assistant",  label: "Assistant",          file: "Assistant.ttf", family: "FL_Assistant",
        note: "SIL OFL modern sans" },
      { id: "alef",       label: "Alef",               file: "Alef-Regular.ttf", family: "FL_Alef",
        note: "modern Israeli geometric sans" },
      { id: "miriam",     label: "Miriam Libre",       file: "MiriamLibre-Regular.ttf", family: "FL_Miriam",
        note: "clean modern Hebrew sans (Miriam Libre — the serif; distinct from Miriam Mono which has a stretch build above)" },
      { id: "taameyfrank",label: "Taamey Frank CLM",   file: "TaameyFrankCLM-Medium.ttf", family: "FL_TaameyFrank",
        note: "Culmus / Yoram Gnat (GPL). jalt + salt + niqqud + te'amim positioning" },
      { id: "keteryg",    label: "Keter YG",           file: "KeterYG-Medium.ttf", family: "FL_KeterYG",
        note: "Culmus (GPL). jalt + salt for proper wide forms (distinct from Keter Aram Tsova; that one has a stretch build above)" },
      { id: "solitreo",   label: "Solitreo",           file: "Solitreo-Regular.ttf", family: "FL_Solitreo",
        note: "Sephardi / Judeo-Spanish cursive — NO NIQQUD, toggle Strip marks" },
      { id: "ktavyad",    label: "Ktav Yad CLM",       file: "KtavYadCLM-MediumItalic.ttf", family: "FL_KtavYad",
        note: "modern Israeli handwritten; GPL (Culmus)" },
    ],
  },
  {
    id: "paleo", label: "Paleo-Hebrew (Phoenician block)", dir: "rtl",
    sample: "𐤁𐤓𐤀𐤔𐤉𐤕 𐤁𐤓𐤀 𐤀𐤋𐤄𐤉𐤌",
    fonts: [
      { id: "phn", label: "Noto Sans Phoenician", file: "NotoSansPhoenician-Regular.ttf", family: "FL_Phoenician" },
    ],
  },
  {
    id: "samaritan", label: "Samaritan", dir: "rtl",
    sample: "ࠁࠓࠀࠔࠉࠕ ࠁࠓࠀ",
    fonts: [
      { id: "sam", label: "Noto Sans Samaritan", file: "NotoSansSamaritan-Regular.ttf", family: "FL_Samaritan" },
    ],
  },
  {
    id: "syriac", label: "Assyrian (Syriac)", dir: "rtl",
    // Peshitta Genesis 1:1, split into four short lines so auto-justify
    // has room to insert tatweel triggers on each row.
    sample:
      "ܒܪܝܫܝܬ\n" +
      "ܒܪܐ ܐܠܗܐ\n" +
      "ܝܬ ܫܡܝܐ\n" +
      "ܘܝܬ ܐܪܥܐ",
    fonts: [
      { id: "stretchsyriac", label: "Semitic Stretch Noto Sans Syriac", file: "SemiticStretchNotoSansSyriac.ttf", family: "FL_StretchNotoSansSyriac",
        note: "Custom Noto Sans Syriac derivative (OFL). Kashida-style widening on beth ܒ, dalath ܕ, rish ܪ, and taw ܬ via the same U+05C6 trigger as the Hebrew stretch fonts." },
      { id: "stretchnohadrasapna", label: "Semitic Stretch Nohadra Sapna", file: "SemiticStretchNohadraSapna.ttf", family: "FL_StretchNohadraSapna",
        note: "Custom Nohadra Sapna derivative (SIL OFL, Sargis Yonan). Block-style geometric Syriac with kashida widening on ܐ ܒ ܕ ܗ ܘ ܡ ܣ ܪ ܫ ܬ. Converted from CFF to TrueType before stretch synthesis." },
      { id: "stretchnohadraamedia", label: "Semitic Stretch Nohadra Amedia", file: "SemiticStretchNohadraAmedia.ttf", family: "FL_StretchNohadraAmedia",
        note: "Custom Nohadra Amedia derivative (SIL OFL, Sargis Yonan). Same geometric design as Sapna, alternate weight/style." },
      { id: "nohadrasapna", label: "Nohadra Sapna", file: "NohadraSyriacSapna.ttf", family: "FL_NohadraSapna",
        note: "Sargis Yonan (SIL OFL). Block-style geometric Syriac; unstretched original." },
      { id: "nohadraamedia", label: "Nohadra Amedia", file: "NohadraSyriacAmedia.ttf", family: "FL_NohadraAmedia",
        note: "Sargis Yonan (SIL OFL). Companion to Sapna; unstretched original." },
      { id: "idiqlat", label: "Idiqlat", file: "Idiqlat-Regular.ttf", family: "FL_Idiqlat",
        note: "SIL Idiqlat (OFL). Calligraphic Syriac. Not stretchable — its top-strokes are curved rather than flat, so the bar/leg framework produces discontinuities." },
      { id: "sans",  label: "Noto Sans Syriac",  file: "NotoSansSyriac.ttf", family: "FL_NotoSansSyriac" },
      { id: "serif", label: "Noto Serif Syriac (Estrangela-leaning)", file: "NotoSerifSyriac.ttf", family: "FL_NotoSerifSyriac" },
      // Meltho fonts (Beth Mardutho: The Syriac Institute) — one per
      // classical Syriac script tradition.
      { id: "meltho-edessa", label: "Estrangelo Edessa (Estrangela)", file: "MelthoEdessa.ttf", family: "FL_MelthoEdessa",
        note: "Classical Estrangela — the oldest Syriac script tradition. Beth Mardutho SIL Meltho family." },
      { id: "meltho-adiabene", label: "East Syriac Adiabene (Madnhaya)", file: "MelthoAdiabene.ttf", family: "FL_MelthoAdiabene",
        note: "Madnhaya (East Syriac) — used by the Assyrian Church of the East and Chaldean Catholic Church. Beth Mardutho SIL Meltho family." },
      { id: "meltho-jerusalem", label: "Serto Jerusalem (Serta)", file: "MelthoJerusalem.ttf", family: "FL_MelthoJerusalem",
        note: "Serta / West Syriac cursive — used by the Syriac Orthodox Church and Maronites. Beth Mardutho SIL Meltho family." },
    ],
  },
  {
    id: "aramaic", label: "Imperial Aramaic", dir: "rtl",
    sample: "𐡀𐡁𐡂𐡃𐡄𐡅𐡆𐡇𐡈",
    fonts: [
      { id: "ia", label: "Noto Sans Imperial Aramaic", file: "NotoSansImperialAramaic-Regular.ttf", family: "FL_ImperialAramaic" },
    ],
  },
  {
    id: "mandaic", label: "Mandaic", dir: "rtl",
    sample: "ࡀࡁࡂࡃࡄࡅ",
    fonts: [
      { id: "m", label: "Noto Sans Mandaic", file: "NotoSansMandaic-Regular.ttf", family: "FL_Mandaic" },
    ],
  },
  {
    id: "ethiopic", label: "Amharic (Ge'ez, Tigrinya)", dir: "ltr",
    // Ge'ez Genesis 1:1 — "In the beginning God created heaven and earth."
    // Multi-line so auto-justify has multiple rows to widen. Every line
    // contains at least one stretchable fidel (መ ጠ ሠ ሐ ወ series) so
    // the letter-widening path fires on every row.
    sample:
      "በቀዳሚ ገብረ እግዚአብሔር\n" +
      "ሰማየ ወምድረ",
    fonts: [
      { id: "stretchethiopic", label: "Semitic Stretch Noto Serif Ethiopic", file: "SemiticStretchNotoSerifEthiopic.ttf", family: "FL_StretchNotoSerifEthiopic",
        note: "custom derivative of Noto Serif Ethiopic (OFL). Per-fidel widening on 5 Ge'ez consonant series (መ ጠ ሠ ሐ ወ) × 7 vowel orders. Trigger is U+2060 (Word Joiner) clustered after the fidel." },
      { id: "sans",  label: "Noto Sans Ethiopic",  file: "NotoSansEthiopic.ttf", family: "FL_NotoSansEthiopic" },
      { id: "serif", label: "Noto Serif Ethiopic", file: "NotoSerifEthiopic.ttf", family: "FL_NotoSerifEthiopic" },
    ],
  },
  {
    id: "cuneiform", label: "Akkadian cuneiform", dir: "ltr",
    sample: "𒀭𒈗𒋛𒊒𒌋𒌋",
    fonts: [
      { id: "cune", label: "Noto Sans Cuneiform", file: "NotoSansCuneiform-Regular.ttf", family: "FL_NotoSansCuneiform" },
    ],
  },
  {
    id: "ugaritic", label: "Ugaritic", dir: "ltr",
    sample: "𐎁𐎛𐎍 𐎎𐎍𐎋",
    fonts: [
      { id: "ug", label: "Noto Sans Ugaritic", file: "NotoSansUgaritic-Regular.ttf", family: "FL_Ugaritic" },
    ],
  },
  {
    id: "osa", label: "Old South Arabian", dir: "rtl",
    sample: "𐩤𐩺𐩬𐩥𐩬",
    fonts: [
      { id: "osa", label: "Noto Sans Old South Arabian", file: "NotoSansOldSouthArabian-Regular.ttf", family: "FL_OSA" },
    ],
  },
];

// Bright, vibrant defaults — picked so EVERY swatch (incl. the first
// cluster) reads clearly on both the dark and light themes. The previous
// palette led with #111827 (near-black), invisible on dark backgrounds.
// Rainbow palette applied when the user clicks "Reset palette". Default
// on load is a single ink colour (see DEFAULT_INK) so first-time visitors
// see the text as normal calligraphy rather than a colour spectrum.
const DEFAULT_COLORS = [
  "#fbbf24", "#f87171", "#fb923c", "#34d399", "#60a5fa",
  "#a78bfa", "#f472b6", "#22d3ee", "#a3e635", "#facc15",
];
// Single-ink default — dark neutral so it reads well on both the light
// paper-cream page background and the parchment SVG preview.
const DEFAULT_INK = "#111827";

// --- Kashida / tatweel ----------------------------------------------------

const TATWEEL = "ـ";
// Our Hebrew-stretch trigger. U+05C6 (Hebrew Punctuation Nun Hafukha) is
// script=Hebrew, so browsers keep it in the same shaping run as surrounding
// Hebrew letters and our GSUB `liga` rule (letter + N × U+05C6 → letter_sN)
// actually fires. We previously used U+E010 (PUA) but browsers segment PUA
// into a separate script-Unknown run, which silently broke the substitution.
const HEBREW_STRETCH = "׆";
// Syriac widening trigger — U+2060 Word Joiner. Fires our stretch-font
// widening ligature to produce a widened letter variant (letter → letter_sN).
// Distinct from TATWEEL (U+0640), which stays available as the font's own
// baseline bridging glyph. Word Joiner is script=Common so it doesn't split
// the Syriac shaping run (unlike U+05C6, which is script=Hebrew).
const SYRIAC_WIDENING = "⁠";

/** True for characters that act as "stretch extenders" — they should
 *  inherit the color of the preceding letter so the combined stroke
 *  paints as one continuous shape across the overlap region. */
function isStretchExtender(cluster: string): boolean {
  return cluster === TATWEEL || cluster === HEBREW_STRETCH;
}

/** For each cluster, compute its effective render color. Extenders look
 *  backward to find the nearest non-extender cluster's color so seams
 *  between the letter's stroke and the overlapping extender rectangle
 *  paint as one continuous color. */
function effectiveColors(clusters: string[], colors: string[]): string[] {
  const out = [...colors];
  let lastLetterColor = colors[0] ?? "#111827";
  for (let i = 0; i < clusters.length; i++) {
    if (isStretchExtender(clusters[i])) {
      out[i] = lastLetterColor;
    } else {
      lastLetterColor = colors[i] ?? "#111827";
    }
  }
  return out;
}
// Arabic letters that can take a kashida AFTER them (they have a medial/initial
// joining form). Non-connectors (no left-joining form): alef 0627, dal 062F,
// dhal 0630, ra 0631, zay 0632, waw 0648, tatweel 0640, hamza 0621.
function canTakeKashidaAfter(ch: string): boolean {
  const cp = ch.charCodeAt(0);
  // Arabic block (basic joining letters)
  if (cp >= 0x0622 && cp <= 0x064A) {
    const nonJoining = [0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629,
                        0x062F, 0x0630, 0x0631, 0x0632, 0x0648];
    if (nonJoining.includes(cp)) return false;
    return true;
  }
  // Syriac block. Eight letters do NOT connect to the following letter
  // (they're right-joining only), so inserting a tatweel after them
  // creates a stub with nothing to bridge to. Traditional Syriac scribal
  // stretching skips these letters entirely.
  //   Ālap 0x0710, Dālat 0x0715, Hē 0x0717, Waw 0x0718,
  //   Zayn 0x0719, Ṣāḏē 0x0729, Rēš 0x072A, Taw 0x072C
  if (cp >= 0x0712 && cp <= 0x072F) {
    const syriacNonConnectors = [0x0710, 0x0715, 0x0717, 0x0718,
                                 0x0719, 0x0729, 0x072A, 0x072C];
    if (syriacNonConnectors.includes(cp)) return false;
    return true;
  }
  return false;
}

// Background guides for the SVG preview.
//   baselines — single baseline per row (notebook paper)
//   all       — cap-height + dashed x-height + baseline (scribal sheet)
//   grid      — same horizontals plus vertical em-fraction rules
//                (major every 1em, minor every 0.25em)
//
// Positions are snapped to REAL font metrics — ascent / descent /
// x-height / cap-height read from the font's OS/2 + hhea tables.
// Fall back to sensible defaults for fonts that don't report
// x-height or cap-height (some display faces omit them).
//
// The CSS line-box uses hhea ascent+descent for the em-box, then
// splits any extra line-height leading half above / half below.
type GuideMode = "none" | "baselines" | "all" | "grid";
const LINE_HEIGHT = 1.4;
function guideBackground(
  mode: GuideMode,
  fontSize: number,
  metrics: FontMetrics | null,
): React.CSSProperties {
  if (mode === "none") return {};

  // Fallback to heuristic ratios if metrics haven't loaded yet.
  const m: FontMetrics = metrics ?? {
    ascent: 0.85, descent: -0.15, xHeight: 0.5, capHeight: 0.7,
  };
  const emHeight = m.ascent - m.descent;                     // em
  const leading = Math.max(0, LINE_HEIGHT - emHeight) / 2;   // em
  // Line box: [leading | ascent | descent | leading], all in em.
  const topOfEm = leading * fontSize;                        // px
  const baselineY = (leading + m.ascent) * fontSize;         // px
  const xHeightY = baselineY - (m.xHeight || 0.5) * fontSize;
  const capHeightY = baselineY - (m.capHeight || 0.7) * fontSize;
  const descentY = baselineY - m.descent * fontSize;         // descent is negative
  const period = LINE_HEIGHT * fontSize;                     // px

  const strong = "rgba(59, 130, 246, 0.55)";  // baseline
  const soft = "rgba(59, 130, 246, 0.30)";    // cap-height
  const mid = "rgba(59, 130, 246, 0.40)";     // x-height (dashed)
  const faint = "rgba(59, 130, 246, 0.18)";   // ascent / descent extremes
  const major = "rgba(59, 130, 246, 0.25)";   // grid major verticals
  const minor = "rgba(59, 130, 246, 0.10)";   // grid minor verticals

  const withUpper = mode !== "baselines";
  // Dashed line needs horizontal resolution — a 1px-wide tile would
  // collapse the dash pattern. Widen the tile whenever we draw dashes.
  const tileW = withUpper ? 200 : 1;

  const parts: string[] = [];
  // Baseline always drawn — the strong anchor.
  parts.push(hLine(0, baselineY, tileW, strong, 1.5));
  if (withUpper) {
    // Cap-height (top of most letter bodies) — solid, thin.
    parts.push(hLine(0, capHeightY, tileW, soft, 1));
    // x-height (median) — dashed, thinner. Cluster width tracks fontSize
    // so dashes look consistent across sizes.
    const dashUnit = Math.max(3, Math.round(fontSize * 0.06));
    parts.push(hLine(0, xHeightY, tileW, mid, 0.75, `${dashUnit} ${dashUnit}`));
    // Ascent + descent extremes — very faint, so they don't distract but
    // still give you the em-box outline for measuring vertical bearings.
    parts.push(hLine(0, topOfEm, tileW, faint, 0.5));
    parts.push(hLine(0, descentY, tileW, faint, 0.5));
  }
  const hSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${period}" ` +
    `preserveAspectRatio="none">${parts.join("")}</svg>`;
  const hUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(hSvg)}")`;

  const base: React.CSSProperties = {
    backgroundOrigin: "content-box",
    backgroundClip: "content-box",
  };

  if (mode === "grid") {
    // Em-fraction verticals: major every 1em, minor every 0.25em.
    // Tile width = 1em (fontSize). Lines at 0 (major), 0.25em, 0.5em,
    // 0.75em (minor). Next tile's 0-position is at x=1em → next major.
    const em = fontSize;
    const vParts = [
      vLine(0, em, major, 1),
      vLine(em * 0.25, em, minor, 0.5),
      vLine(em * 0.5, em, minor, 0.5),
      vLine(em * 0.75, em, minor, 0.5),
    ];
    const vSvg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${em}" height="1" ` +
      `preserveAspectRatio="none">${vParts.join("")}</svg>`;
    const vUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(vSvg)}")`;
    return {
      ...base,
      backgroundImage: `${hUri}, ${vUri}`,
      backgroundSize: `${tileW}px ${period}px, ${em}px 1px`,
      backgroundRepeat: "repeat, repeat",
    };
  }
  return {
    ...base,
    backgroundImage: hUri,
    backgroundSize: `${tileW}px ${period}px`,
    backgroundRepeat: "repeat",
  };
}
function hLine(
  x: number, y: number, w: number, color: string, width: number, dash?: string,
): string {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${color}" ` +
         `stroke-width="${width}" vector-effect="non-scaling-stroke"${dashAttr}/>`;
}
function vLine(
  x: number, h: number, color: string, width: number,
): string {
  return `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" ` +
         `stroke-width="${width}" vector-effect="non-scaling-stroke"/>`;
}

// Hebrew "wide" letter presentation forms. Used in traditional scribal
// justification of Torah columns. Font support varies — serif Hebrew fonts
// render distinct glyphs; sans may fall back.
const HEBREW_WIDE: Record<string, string> = {
  "א": "ﬡ", "ד": "ﬢ", "ה": "ﬣ", "כ": "ﬤ",
  "ל": "ﬥ", "ם": "ﬦ", "ר": "ﬧ", "ת": "ﬨ",
};
// Reverse lookup: wide form → base letter, used for the per-letter toggle.
const HEBREW_WIDE_INVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(HEBREW_WIDE).map(([k, v]) => [v, k]),
);

/** Combining-mark regex per script. Used by the "strip diacritics" toggle
 *  so fonts that don't contain niqqud / harakat / Syriac vowel glyphs
 *  (e.g. Solitreo, some sans Arabic faces) can render their consonantal
 *  skeleton cleanly. */
const DIACRITICS: Record<string, RegExp> = {
  // Hebrew niqqud + te'amim + cantillation, EXCLUDING U+05C6 (Nun Hafukha)
  // which we use as our stretch trigger. Range U+0591–U+05C7 minus U+05C6
  // splits into two subranges: U+0591–U+05C5 and U+05C7.
  hebrew: /[֑-ׇׅ]/g,
  arabic: /[ً-ٰٟۖ-ۭ]/g, // harakat + Quranic marks
  syriac: /[ܰ-݊]/g,          // Syriac vowels + diacritics
  ethiopic: /[፝-፟]/g,        // Ethiopic combining marks (rare)
};

function stripDiacritics(text: string, scriptId: string): string {
  const re = DIACRITICS[scriptId];
  if (!re) return text;
  return text.replace(re, "");
}

// Split into grapheme clusters so niqqud / harakat / Syriac vowels stay
// attached to their base consonants (each cluster is one colorable unit).
function graphemes(text: string): string[] {
  try {
    const Seg = (Intl as unknown as {
      Segmenter: new (l?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> }
    }).Segmenter;
    const seg = new Seg(undefined, { granularity: "grapheme" });
    return [...seg.segment(text)].map((s) => s.segment);
  } catch {
    return [...text];
  }
}

// Font metrics extracted directly from the OpenType tables. All values
// are in em units (i.e. divided by the font's `unitsPerEm`) so callers
// just multiply by the CSS font-size in pixels to get exact positions.
export type FontMetrics = {
  ascent: number;      // em, positive
  descent: number;     // em, negative (descenders go below baseline)
  xHeight: number;     // em, positive (0 if font doesn't report it)
  capHeight: number;   // em, positive (0 if font doesn't report it)
};

const metricsCache = new Map<string, Promise<FontMetrics | null>>();
async function loadFontMetrics(file: string): Promise<FontMetrics | null> {
  if (metricsCache.has(file)) return metricsCache.get(file)!;
  const p = (async () => {
    try {
      const opentype = await import("opentype.js");
      const buf = await (await fetch(`/fonts/${file}`)).arrayBuffer();
      const font = opentype.parse(buf);
      const upem = font.unitsPerEm || 1000;
      // OS/2 table is optional but reliable when present. hhea gives
      // the vertical metrics the browser actually uses for line-box
      // layout, so prefer it for ascent/descent.
      const os2 = (font.tables as { os2?: { sxHeight?: number; sCapHeight?: number } }).os2;
      const hhea = font.tables.hhea as { ascender?: number; descender?: number };
      const ascent = (hhea.ascender ?? font.ascender ?? upem) / upem;
      const descent = (hhea.descender ?? font.descender ?? -upem * 0.2) / upem;
      const xHeight = (os2?.sxHeight ?? 0) / upem;
      const capHeight = (os2?.sCapHeight ?? 0) / upem;
      return { ascent, descent, xHeight, capHeight };
    } catch (e) {
      console.warn(`font-metrics parse failed for ${file}:`, e);
      return null;
    }
  })();
  metricsCache.set(file, p);
  return p;
}

// Register @font-face for the selected font so the browser can render it.
const loadedFamilies = new Set<string>();
function ensureFontLoaded(family: string, file: string): Promise<void> {
  if (loadedFamilies.has(family)) return Promise.resolve();
  return new Promise((resolve) => {
    const style = document.createElement("style");
    // Cache-bust on each page load so rebuilt fonts (esp. Semitic Stretch
    // Hebrew, whose GSUB table we regenerate) are picked up instead of the
    // stale copy held by the browser's font cache across sessions.
    const bust = `?v=${Date.now()}`;
    style.textContent = `@font-face { font-family: '${family}'; src: url('/fonts/${file}${bust}') format('truetype'); font-display: swap; }`;
    document.head.appendChild(style);
    loadedFamilies.add(family);
    const docWithFonts = document as unknown as { fonts?: FontFaceSet };
    if (docWithFonts.fonts) {
      docWithFonts.fonts.load(`16px '${family}'`).then(() => resolve()).catch(() => resolve());
    } else {
      setTimeout(resolve, 200);
    }
  });
}

// Short script-native sample used inside the FontPicker dropdown so each
// entry visually renders in the font it names — much clearer than the
// system-font-rendered browser-default <option> text.
const PICKER_SAMPLE: Record<string, string> = {
  hebrew:    "אבגד הוזח טיכל מנסע",
  syriac:    "ܐܒܓܕ ܗܘܙ ܚܛܝ ܟܠܡ",
  arabic:    "ابجد هوز حطي كلمن",
  paleo:     "\u{10900}\u{10901}\u{10902} \u{10903}\u{10904}\u{10905}",
  samaritan: "ࠀࠁࠂ ࠃࠄࠅ",
  aramaic:   "\u{10840}\u{10841}\u{10842} \u{10843}\u{10844}",
  mandaic:   "ࡀࡁࡂ ࡃࡄࡅ",
};

// Custom font picker — replaces the native <select> so each option renders
// in its own font-family instead of the browser's chrome font. Loads every
// font in the current script when opened so options paint with real glyphs.
function FontPicker({
  fonts, value, onChange, sampleText, dir,
}: {
  fonts: FontEntry[];
  value: string;
  onChange: (id: string) => void;
  sampleText: string;
  dir: "rtl" | "ltr";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = fonts.find((f) => f.id === value) ?? fonts[0];

  // Preload every font in this script the first time the picker opens so
  // the options render in their own faces without a flash of fallback text.
  useEffect(() => {
    if (!open) return;
    for (const f of fonts) ensureFontLoaded(f.family, f.file);
  }, [open, fonts]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-2 py-1.5 border border-neutral-300 rounded text-sm bg-white hover:bg-neutral-50 flex items-center justify-between gap-2"
      >
        <span className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="truncate">{current.label}</span>
          <span
            className="truncate text-lg text-neutral-800"
            style={{ fontFamily: `"${current.family}", system-ui`, direction: dir }}
          >
            {sampleText}
          </span>
        </span>
        <span className="text-neutral-500 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-[28rem] overflow-y-auto bg-white border border-neutral-300 rounded shadow-lg">
          {fonts.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onChange(f.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 border-b border-neutral-100 last:border-b-0 hover:bg-amber-50 ${f.id === value ? "bg-amber-50/70" : ""}`}
            >
              <div className="text-xs text-neutral-700">{f.label}</div>
              <div
                className="mt-0.5 text-xl text-neutral-900 truncate"
                style={{ fontFamily: `"${f.family}", system-ui`, direction: dir }}
              >
                {sampleText}
              </div>
              {f.note && (
                <div className="mt-0.5 text-[11px] text-neutral-500 leading-snug">{f.note}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Cross-script feature showcase — each item is a "try me" preset that
// loads text (and optionally a font) into the editor. Some are LIVE
// (already implemented, click reproduces working output), some are
// EXPERIMENTAL (browser renders it, may look weird — that's the point),
// and some are PROPOSED (not implemented yet — surfaces what we could
// add for a script).
type ShowcaseItem = {
  title: string;
  description: string;
  text: string;
  font?: string;
  status: "live" | "experimental" | "proposed";
};
const SHOWCASE: { section: string; scriptId: string; items: ShowcaseItem[] }[] = [
  {
    section: "Hebrew",
    scriptId: "hebrew",
    items: [
      {
        title: "Full niqqud + te'amim (cantillation)",
        description:
          "Standard Masoretic pointing: niqqud (vowel points) + te'amim (cantillation accents). Requires a font with cantillation glyphs — Taamey Frank CLM (Culmus, GPL) is the reference implementation.",
        font: "taameyfrank",
        text: "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃",
        status: "live",
      },
      {
        title: "Arabic pronunciation guides on Hebrew letters",
        description:
          "Judeo-Arabic tradition — Arabic language written in Hebrew script by Jewish scholars (Saadia Gaon c. 900, Maimonides c. 1200). Two conventions layer on Hebrew consonants: the dot-above (U+0307, from the Sefaria/Tiberian tradition) marks Arabic phonemes with no Hebrew equivalent — כ̇ = خ (khāʾ), ג̇ = غ/ج, ט̇ = ظ, ץ̇ = ض — and Arabic shadda (U+0651) marks gemination: אללّה (Allah), אלסّמאואת (as-samāwāt), תהبّ (tahibb). Text: Saadia Gaon's Tafsir on Genesis 1:1-2 (Sefaria original + reconstructed shaddas).",
        text:
          "אול מא כ̇לק אללّה אלסّמאואת ואלארץ̇\n" +
          "ואלארץ̇ כאנתْ גאמרה ומסתבחרה וט̇לאם עלי וג̇ה אלגמר וריח אללّה תהבّ עלי וג̇ה אלמא",
        font: "stretch",
        status: "experimental",
      },
      {
        title: "Vocalized Tafsir Rasag (reconstructed)",
        description:
          "The same Saadia Gaon passage as above, now with full Arabic vowel marks — fatha (◌َ), kasra (◌ِ), damma (◌ُ), tanwīn (◌ً/◌ٌ/◌ٍ), shadda (◌ّ), sukūn (◌ْ) — reconstructed from classical Arabic grammar following the tradition preserved in Yosef Kafih's 1963 vocalized edition (הַתּוֹרָה עִם תַּרְגּוּם וּפֵרוּשׁ רַבֵּנוּ סַעֲדְיָה גָּאוֹן, worked from Yemenite manuscripts). Case endings, verbal patterns, and definite-article assimilation are grammatically determined, so this reconstruction should match Kafih ~95%. Vowel marks were imported into the stretch-Hebrew font specifically for this demo.",
        text:
          "אَוَّלَ מَא כَ̇לَקَ אَלْלَّהُ אלْסَّמَאוَאתِ וَאלْאَרْץَ̇\n" +
          "וَאלْאَרْץُ̇ כَאנَתْ גَ̇אמِרَהً וَמُסْתَבْחِרَהً וَטَ̇לَאםٌ עَלَי וَגْ̇הِ אלْגَמْרِ וَרِיחُ אَלْלَّהِ תَהِבُّ עَלَי וَגْ̇הِ אלْמَאِ",
        font: "stretch",
        status: "experimental",
      },
      {
        title: "Mixed Hebrew + Arabic letters",
        description:
          "Modern Hebrew borrows an ASCII apostrophe (׳ geresh) to mark Arabic-origin phonemes it lacks: ג׳ = \"j\", ח׳ = \"kh\", ע׳ = \"gh\", צ׳ = \"ch\". A more precise mixed-script rendering uses the actual Arabic base letter — no geresh needed. To make the Arabic letter render in its INITIAL positional form (looks like the start of an Arabic word), append U+200D ZWJ so the shaper picks the initial variant instead of the isolated one. Shown: Ghajar village (Wikipedia: רג׳ר) becomes غ‍ג׳ר with initial-form ghayn; Khartoum (Wikipedia: ח׳רטום) becomes خ‍רטום with initial-form khāʾ.",
        text: "غ‍ג׳ר (Ghajar)  ·  خ‍רטום (Khartoum)",
        status: "experimental",
      },
      {
        title: "Kashida-style stretch justification",
        description:
          "Semitic Stretch fonts add a custom GSUB kashida on 8 stretchable letters (א ד ה ל ם ר ת ט). Trigger is U+05C6 clustered after the letter. Auto-justify does this per line.",
        text: "בְּרֵאשִׁ׆׆׆ית בָּרָ׆׆׆א אֱלֹהִים",
        font: "stretch",
        status: "live",
      },
      {
        title: "Wide letter presentation forms",
        description:
          "Traditional Torah-scribal wide letters (U+FB21–FB28: ﬡ ﬢ ﬣ ﬤ ﬥ ﬦ ﬧ ﬨ). Distinct from `jalt` — these are separate Unicode codepoints. Rendering depends on font.",
        text: "וְאֵת ﬡרֶץ הַזֹּאת ﬤתָב ﬥאֹמֵר ﬧב",
        status: "live",
      },
      {
        title: "Rafeh (rare cantillation mark)",
        description:
          "U+05BF — soft-consonant marker (opposite of dagesh). Attested in the Aleppo Codex but rarely used in modern typesetting.",
        text: "בֿ גֿ דֿ כֿ פֿ תֿ",
        status: "live",
      },
    ],
  },
  {
    section: "Arabic",
    scriptId: "arabic",
    items: [
      {
        title: "Full harakat + Qur'anic marks",
        description:
          "Fatha/kasra/damma + shadda + sukun + tanwin, plus small-alif (U+0670) and dagger vowels used in Qur'anic orthography.",
        text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ٱلْحَمْدُ لِلَّهِ",
        status: "live",
      },
      {
        title: "Niqqud on Arabic (Hebrew marks)",
        description:
          "Hebrew niqqud (U+05B0–U+05BC) stacked on Arabic letters. Semantically parallel to harakat but visually distinct — the two traditions independently developed pointing systems ~7th c. CE.",
        text: "بְ تִ جֻ دַ هֶ",
        status: "experimental",
      },
      {
        title: "Tatweel/Kashida — classical stretch",
        description:
          "U+0640 (Arabic tatweel) inserted between joining letters to widen the line. Standard justification technique in classical typography and calligraphy.",
        text: "بِســـمِ اللـــهِ الرَّحـــمَـــنِ",
        status: "live",
      },
      {
        title: "Lam-alef ligature stack",
        description:
          "The Arabic lam+alef combines via the `liga` GSUB into a single glyph. Also shown: hamza-on-alef variants (أ إ آ) that participate in the ligature.",
        text: "لا لأ لإ لآ الله",
        status: "live",
      },
      {
        title: "Vertical stacking (Nastaliq)",
        description:
          "Persian/Urdu Nastaliq hand cascades letters diagonally downward within a word. The `Noto Nastaliq Urdu` font implements the full contextual-alternate stack.",
        text: "بسم اللہ الرحمن الرحیم",
        font: "nastaliq",
        status: "live",
      },
      {
        title: "ZWNJ (U+200C) — stop the join",
        description:
          "Zero-Width Non-Joiner breaks the cursive-joining behaviour between two letters that would otherwise connect. Same phrase without vs. with a ZWNJ between each letter of the second word — the second reads as isolated letterforms even though the underlying letters are the same.",
        text: "الرحمن  الرحمن  ·  ال‌ر‌ح‌م‌ن",
        status: "live",
      },
    ],
  },
  {
    section: "Assyrian (Syriac)",
    scriptId: "syriac",
    items: [
      {
        title: "Full Syriac pointing (siyāme + qushshaya/rukkakha)",
        description:
          "Siyāme (plural marker — two dots above), qushshaya (hard-stop dot), rukkakha (soft-stop dot). East Syriac tradition; West Syriac uses different marks.",
        text: "ܡܵܪܝܵܐ ܡܸܠܸ݂ܟ݂ ܐܲܠܵܗܵܐ ܟ݁ܬ݂ܵܒ݂ܹ̈ܐ",
        status: "live",
      },
      {
        title: "Kashida on Idiqlat (cursive Syriac)",
        description:
          "Native U+0640 tatweel between joining letters — same mechanism as Arabic. Idiqlat is a proper connected Syriac hand.",
        text: "ܒܪܹܫܝـــܬ ܒـــܪܐ ܐܲܠـــܵܗܵܐ",
        font: "stretchidiqlat",
        status: "live",
      },
      {
        title: "Widening on Nohadra (block-style)",
        description:
          "Nohadra Sapna/Amedia don't join like a cursive script. Instead we widen individual letters via U+2060 (Word Joiner) trigger, keeping their block character. 10 stretchable letters.",
        text: "ܐ⁠⁠⁠ܒ⁠⁠⁠ܘ ܗ⁠⁠⁠ܘܝ ܡ⁠⁠⁠ܘܝ",
        font: "stretchnohadrasapna",
        status: "live",
      },
      {
        title: "Three script traditions side-by-side",
        description:
          "Same phrase (\"our Lord\") in Estrangela, Serto (Western), Madnhaya (Eastern). Font swap only — the underlying Unicode is identical.",
        text: "ܡܪܢ · ܡܪܢ · ܡܪܢ",
        status: "live",
      },
      {
        title: "Non-connectors — 8 right-only joiners",
        description:
          "Syriac has 8 letters (ܐ ܕ ܗ ܘ ܙ ܨ ܪ ܬ) that connect only on their right side. Kashida after these letters would be visually wrong — the stretch build skips tatweel-insertion after them.",
        text: "ܐܒ ܕܡ ܗܝ ܘܢ ܙܟ ܨܪ ܪܙ ܬܡ",
        status: "live",
      },
      {
        title: "ZWNJ (U+200C) — stop the join",
        description:
          "Same Unicode as Arabic: insert U+200C between two joining Syriac letters to force them to render as isolated forms. Useful for explaining letterform variants in pedagogical contexts. The stretch fonts also use U+2060 (Word Joiner) as their WIDENING trigger; the two zero-width codepoints do opposite things.",
        text: "ܡܪܝܐ  ·  ܡ‌ܪ‌ܝ‌ܐ",
        status: "live",
      },
    ],
  },
  {
    section: "Ethiopic (Amharic / Ge'ez / Tigrinya)",
    scriptId: "ethiopic",
    items: [
      {
        title: "Seven vowel orders of a single consonant",
        description:
          "Every Ethiopic consonant has 7 fidels: 1st=ä, 2nd=u, 3rd=i, 4th=ā (long a), 5th=ē, 6th=ə (schwa), 7th=o. Shown here for ba (በ series).",
        text: "በ ቡ ቢ ባ ቤ ብ ቦ",
        status: "live",
      },
      {
        title: "Ge'ez preserves ḫ (ኀ) and ḍ (ፀ)",
        description:
          "Two Proto-Semitic phonemes that merged in Hebrew/Syriac/Arabic (partially) but stayed distinct in Ge'ez — like Ugaritic. The converter respects this.",
        text: "ኀብ ኁ ኂ ኃ ኄ ኅ ኆ  ·  ፀ ፁ ፂ ፃ ፄ ፅ ፆ",
        status: "live",
      },
      {
        title: "Ethiopic punctuation & numerals",
        description:
          "Word divider ፡ (U+1361), section divider ። (U+1362), question mark ፧ (U+1367). Numerals ፩–፲ (1–10) — an independent number system that doesn't use positional notation.",
        text: "አንድ፡ሁለት፡ሶስት፡  ፩ ፪ ፫ ፬ ፭ ፮ ፯ ፰ ፱ ፲",
        status: "live",
      },
      {
        title: "Word-divider justification",
        description:
          "Ge'ez manuscript convention for column justification: repeat the ፡ (U+1361) word-divider between words to fill a line. Distinct from Arabic tatweel — Ethiopic fidels are block-style, so widening happens between words rather than inside letters. Auto-justify now supports this: switch to Ethiopic, load a multi-line sample, click auto-justify text.",
        text: "አንድ፡፡፡ሁለት፡፡፡ሶስት፡፡፡አራት",
        status: "live",
      },
      {
        title: "Ge'ez calligraphic letter widening",
        description:
          "Semitic Stretch Noto Serif Ethiopic — a custom Ge'ez font that widens the horizontal decorative strokes of 5 consonant series (መ ጠ ሠ ሐ ወ) × all 7 vowel orders, matching the calligraphic tradition of illuminated Ge'ez manuscripts (14th–19th c.). 560 total glyph variants. Trigger is U+2060 (Word Joiner) clustered after the fidel — the auto-justify button uses this whenever the Semitic Stretch Ethiopic font is active.",
        text: "መ⁠⁠⁠ ጠ⁠⁠⁠ ሠ⁠⁠⁠ ሐ⁠⁠⁠ ወ⁠⁠⁠",
        font: "stretchethiopic",
        status: "live",
      },
      {
        title: "Vowel-order picker (proposed)",
        description:
          "Click a consonant → dropdown of its 7 fidels for quick correction. Useful when you know the consonant but need to pick the vowel — same interaction as niqqud picker for Hebrew.",
        text: "ንጉሥ · click ን → { ነ ኑ ኒ ና ኔ ን ኖ }",
        status: "proposed",
      },
      {
        title: "Labiovelar variants (proposed)",
        description:
          "Ethiopic has labiovelar (kw / gw / qw / hw) variants that Unicode encodes at scattered offsets (U+1247–U+124F, U+1288–U+128F, U+12B0–U+12B7, U+1310–U+1317). Not currently handled by the converter — would require special-casing during reverse lookup.",
        text: "ቈ ቊ ቋ ቌ ቍ  ·  ኈ ኊ ኋ ኌ ኍ  ·  ኰ ኲ ኳ ኴ ኵ  ·  ጐ ጒ ጓ ጔ ጕ",
        status: "proposed",
      },
      {
        title: "Amharic-only palatalized additions (proposed)",
        description:
          "Amharic added ሸ (šä), ቸ (čä), ኘ (ñä), ዠ (žä), ጀ (jä), ጨ (č̣ä) beyond the Ge'ez inventory. The converter currently folds šä into š but ignores the rest — could expand for Amharic-source text.",
        text: "ሸ ቸ ኘ ዠ ጀ ጨ",
        status: "proposed",
      },
    ],
  },
  {
    section: "Ancient scripts",
    scriptId: "paleo",
    items: [
      {
        title: "Paleo-Hebrew (Phoenician block)",
        description:
          "The pre-exilic Hebrew script, encoded in the Phoenician Unicode block (U+10900–U+10915). Same 22-letter order as square Hebrew.",
        text: "\u{10900}\u{10901}\u{10902} \u{10903}\u{10904}\u{10905} \u{10906}\u{10907}\u{10908}",
        status: "live",
      },
      {
        title: "Samaritan Hebrew",
        description:
          "Descendant of Paleo-Hebrew still used by the Samaritan community. Continuous tradition since c. 1000 BCE.",
        text: "ࠀࠁࠂ ࠃࠄࠅ ࠆࠇࠈ",
        status: "live",
      },
      {
        title: "Imperial Aramaic",
        description:
          "Chancery script of the Achaemenid empire (c. 500 BCE). Descendant of Phoenician, ancestor of Syriac + Hebrew square.",
        text: "\u{10840}\u{10841}\u{10842} \u{10843}\u{10844}\u{10845} \u{10846}\u{10847}\u{10848}",
        status: "live",
      },
      {
        title: "Ugaritic — 30-letter cuneiform abjad",
        description:
          "Alphabetic cuneiform from Ras Shamra (c. 1400 BCE). Preserves Proto-Semitic distinctions lost elsewhere: ṯ ḏ ḫ ḍ ẓ ġ + three alef variants (ʾa ʾi ʾu).",
        text: "\u{10380}\u{10381}\u{10382}\u{10383}\u{10384}\u{10385}\u{10386}\u{10387}\u{10388}\u{10389}",
        status: "live",
      },
      {
        title: "Old South Arabian musnad",
        description:
          "Monumental script of Sabaean / Minaean inscriptions (c. 900 BCE). Distinct from later Arabic — has ~29 letters including preserved Proto-Semitic phonemes.",
        text: "𐩠𐩡𐩢𐩣𐩤𐩥",
        status: "live",
      },
      {
        title: "Akkadian cuneiform CV syllables",
        description:
          "Sumerian-derived syllabary used for Akkadian (c. 2500 BCE onward). CV / VC / CVC signs — hundreds of glyphs, we ship the Noto Cuneiform font.",
        text: "𒀭 𒂗 𒆠 𒌷 𒈗",
        status: "live",
      },
    ],
  },
];

// Default landing state: Hebrew + our custom stretch font, with the ל in
// שלום already elongated (5 × U+E010 after ל) so first-time visitors
// immediately see what the tool does.
const DEFAULT_SCRIPT = "hebrew";
const DEFAULT_FONT = "stretch";
// Genesis 1:1 sans niqqud, kashida-stretched into a 3-line justified column.
// Stretches placed after stretchable letters only (ה / ר) so GSUB consumes
// the U+05C6 triggers — otherwise they fall back to a visible dot glyph.
const DEFAULT_TEXT =
  "בראשית ברא אלה" + HEBREW_STRETCH.repeat(2) + "ים\n" +
  "את ה" + HEBREW_STRETCH.repeat(5) + "שמים\n" +
  "ואת האר" + HEBREW_STRETCH.repeat(8) + "ץ";

// Quick-load samples for Hebrew / stretch fonts. Each demonstrates a
// different feature of the kashida system. All use real Hebrew with
// stretches (U+05C6) pre-placed at scribally appropriate positions.
const SX = HEBREW_STRETCH;
const HEBREW_SAMPLES: { label: string; text: string; hint: string }[] = [
  {
    label: "שלום",
    text: "שָׁל" + SX.repeat(5) + "וֹם",
    hint: "Basic stretch — lamed widens via 5 kashida triggers",
  },
  {
    label: "Genesis 1:1 (justified column)",
    text:
      "בְּרֵאשִׁית בָּרָא אֱלֹהִ" + SX.repeat(2) + "ים\n" +
      "אֵת הַ" + SX.repeat(5) + "שָּׁמַיִם\n" +
      "וְאֵת הָאָר" + SX.repeat(8) + "ֶץ",
    hint: "Multi-line — kashida-stretched ה / ר to justify each row to the left margin (Torah-scribal style)",
  },
  {
    label: "Judeo-Arabic (Maimonides)",
    text:
      "דלאלת אלחאירין\n" +
      "אלחמד ללّה רבّ אלעאלמין",
    hint: "Arabic written in Hebrew letters with Arabic combining marks (shaddah)",
  },
  {
    label: "Psalms 1 (poetry)",
    text:
      "אַשְׁרֵי הָאִ" + SX.repeat(3) + "ישׁ\n" +
      "אֲשֶׁר לֹא הָלַךְ בַּעֲצַת רְשָׁעִים\n" +
      "וּבְדֶרֶךְ חַטָּאִים לֹא עָמָד\n" +
      "וּבְמוֹשַׁב לֵצִים לֹא יָשָׁב",
    hint: "Biblical poetry — stretched first line as a parashah opener",
  },
];

// Peshitta samples for the Syriac script. Broken into short lines so
// auto-justify has room to add stretches on ܒ ܕ ܪ ܬ. Without newlines
// the single-line width already exceeds a normal column, and auto-justify
// (which fills whitespace to a target width) has nothing to fill.
const SYRIAC_SAMPLES: { label: string; text: string; hint: string }[] = [
  {
    label: "ܐܠܗܐ",
    text: "ܐܠܗܐ",
    hint: "Basic stretch target — press + after ܕ / ܪ / ܒ / ܬ to widen",
  },
  {
    label: "Peshitta Genesis 1:1 (column)",
    text:
      "ܒܪܝܫܝܬ\n" +
      "ܒܪܐ ܐܠܗܐ\n" +
      "ܝܬ ܫܡܝܐ\n" +
      "ܘܝܬ ܐܪܥܐ",
    hint: "Multi-line short lines — auto-justify stretches ܒ ܕ ܪ ܬ to fill each row to the column width",
  },
  {
    label: "ܐܒܘܢ ܕܒܫܡܝܐ",
    text:
      "ܐܒܘܢ\n" +
      "ܕܒܫܡܝܐ",
    hint: "Lord's Prayer opener — short lines with room to stretch",
  },
];

// Arabic samples — all secular literary / civil text (not Qur'anic).
const ARABIC_SAMPLES: { label: string; text: string; hint: string }[] = [
  {
    label: "Genesis 1:1 (Van Dyck)",
    text:
      "فِي الْبَدْءِ خَلَقَ اللهُ\n" +
      "السَّمَاوَاتِ\n" +
      "وَالأَرْضَ",
    hint: "Van Dyck Arabic Bible — 19th-century Arabic Christian translation. Multi-line for auto-justify.",
  },
  {
    label: "Al-Mutanabbi (classical poem)",
    text:
      "الْخَيْلُ وَاللَّيْلُ وَالْبَيْدَاءُ تَعْرِفُنِي\n" +
      "وَالسَّيْفُ وَالرُّمْحُ وَالْقِرْطَاسُ وَالْقَلَمُ",
    hint: "Al-Mutanabbi (10th c.) — 'The horses, the night, and the desert know me; as do the sword, the spear, the parchment, and the pen.' Secular boasting verse.",
  },
  {
    label: "محمد بن سلمان",
    text: "مُحَمَّدُ بْنُ سَلْمَانَ\n" +
          "بْنُ عَبْدِ الْعَزِيزِ\n" +
          "آلِ سُعُودٍ",
    hint: "Full name of the Crown Prince of Saudi Arabia — long civil / political phrase, multi-line for justification.",
  },
];

const ETHIOPIC_SAMPLES: { label: string; text: string; hint: string }[] = [
  {
    label: "Genesis 1:1 (Ge'ez)",
    text:
      "በቀዳሚ፡ገብረ፡እግዚአብሔር\n" +
      "ሰማየ፡ወምድረ",
    hint: "Ge'ez Genesis 1:1 — 'In the beginning God created heaven and earth.' Multi-line for auto-justify with ፡ repetition.",
  },
  {
    label: "Amharic greeting",
    text:
      "ሰላም፡ለሁ፡ወዳጆቼ\n" +
      "እንደምን፡አላችሁ",
    hint: "Amharic — 'Peace to you my friends; how are you all.'",
  },
  {
    label: "Ge'ez numerals",
    text: "፩ ፪ ፫ ፬ ፭ ፮ ፯ ፰ ፱ ፲ ፳ ፴ ፵ ፶",
    hint: "Ethiopic numerals 1-10, 20, 30, 40, 50. Independent number system (no positional notation).",
  },
];

export function FontLab() {
  const [scriptId, setScriptId] = useState(DEFAULT_SCRIPT);
  const script = SCRIPTS.find((s) => s.id === scriptId)!;
  const [fontId, setFontId] = useState<string>(DEFAULT_FONT);
  // When the script changes, snap to its first font — EXCEPT don't clobber
  // the one-time default we chose (DEFAULT_SCRIPT + DEFAULT_FONT) on first
  // mount. We track a mounted flag to distinguish "user changed script"
  // from "component just loaded".
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setFontId(script.fonts[0].id);
  }, [script]);
  const font = script.fonts.find((f) => f.id === fontId) ?? script.fonts[0];

  // Similar: start with the pre-stretched "שָׁלוֹם" for the Hebrew+stretch
  // default. On subsequent script changes, fall through to the script's
  // own sample text.
  const [text, setText] = useState(DEFAULT_TEXT);
  const [convertWarnings, setConvertWarnings] = useState<string[]>([]);
  const sampleAppliedRef = useRef(false);
  useEffect(() => {
    if (!sampleAppliedRef.current) { sampleAppliedRef.current = true; return; }
    setText(script.sample);
  }, [script]);

  const [fontSize, setFontSize] = useState(96);
  const [colors, setColors] = useState<string[]>([]);
  const [fontReady, setFontReady] = useState(false);
  const [stripMarks, setStripMarks] = useState(false);
  const [otFeatures, setOtFeatures] = useState({
    liga: true, calt: true, salt: false, dlig: false,
    jalt: false,
    ss01: false, ss02: false, ss03: false, ss04: false,
  });
  // Per-cluster wide-letter toggle for Hebrew. Stores the set of cluster
  // indices where jalt (justification alternates) should apply. Non-joining
  // scripts only — wrapping a span breaks Arabic/Syriac shaping.
  const [wideClusters, setWideClusters] = useState<Set<number>>(new Set());
  // Auto-justify target column width in pixels. Default matches a typical
  // scribal column. User can tune before clicking the button.
  const [justifyWidthPx, setJustifyWidthPx] = useState<number>(680);
  const [bgGuide, setBgGuide] = useState<GuideMode>("none");
  const [fontMetrics, setFontMetrics] = useState<FontMetrics | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Our Semitic-Stretch fonts (Hebrew and Syriac) support a real kashida-
  // style extender via U+05C6 insertion, indefinite widening. Other fonts
  // fall back to per-letter jalt substitution.
  const hebrewStretchActive = script.id === "hebrew" && font.id.startsWith("stretch");
  const syriacStretchActive = script.id === "syriac" && font.id.startsWith("stretch");
  // Nohadra is block-style non-cursive Syriac. Its stretchable letters
  // (ܒ ܕ ܪ ܬ) widen via our per-letter GSUB ligature, which requires N
  // triggers CLUSTERED after the letter — the same insertion pattern the
  // Hebrew fonts use. Cursive Syriac fonts (Noto Sans Syriac etc.) use
  // the Arabic-style tatweel-between-letters approach instead.
  const nohadraStretchActive = script.id === "syriac" && font.id.startsWith("stretchnohadra");
  const ethiopicStretchActive = script.id === "ethiopic" && font.id === "stretchethiopic";
  const stretchFontActive = hebrewStretchActive || syriacStretchActive || ethiopicStretchActive;
  const supportsKashida = script.id === "arabic" || (script.id === "syriac" && !syriacStretchActive) || stretchFontActive;
  const supportsWideHebrew = script.id === "hebrew";
  // Hebrew (non-stretch font): widening via jalt is per-letter via OT feature.
  const supportsJaltWiden = script.id === "hebrew" && !hebrewStretchActive;

  // Apply scripts-specific text transforms before grapheme split.
  const displayText = useMemo(() => {
    return stripMarks ? stripDiacritics(text, script.id) : text;
  }, [text, script.id, stripMarks]);
  const clusters = useMemo(() => graphemes(displayText), [displayText]);

  // CSS font-feature-settings string for the active OT feature set.
  const fontFeatureSettings = useMemo(() => {
    const entries = Object.entries(otFeatures).map(([k, v]) => `'${k}' ${v ? 1 : 0}`);
    return entries.join(", ");
  }, [otFeatures]);

  // Load the chosen font (inject @font-face).
  useEffect(() => {
    let cancelled = false;
    setFontReady(false);
    setFontMetrics(null);
    ensureFontLoaded(font.family, font.file).then(() => {
      if (!cancelled) setFontReady(true);
    });
    loadFontMetrics(font.file).then((m) => {
      if (!cancelled) setFontMetrics(m);
    });
    return () => { cancelled = true; };
  }, [font.family, font.file]);

  // Re-justify the demo per font: whenever the stretch font changes and the
  // current text already contains stretches, recompute the U+05C6 counts so
  // the sample fits the column at the new font's metrics. Without this,
  // switching from Semitic Stretch FreeMono (step 600) to Nachlieli
  // (step ~165) leaves the demo looking wildly over- or under-stretched.
  //
  // AND if the user swaps to a NON-stretch font (David Libre, Solitreo,
  // Rashi, etc.), strip every U+05C6 — those fonts have no ligature that
  // consumes them, so they'd render as a literal "c" glyph in the preview.
  const lastJustifiedFontRef = useRef<string>("");
  useEffect(() => {
    if (!fontReady) return;
    // Hebrew stretch uses U+05C6, Syriac stretch uses U+2060 Word Joiner
    // as the widening trigger (Nohadra needs Common-script codepoint).
    const trigger = syriacStretchActive ? SYRIAC_WIDENING : HEBREW_STRETCH;
    if (!text.includes(trigger)) return;
    if (!stretchFontActive) {
      // Non-stretch font active but text still has extenders — strip them.
      setText((prev) => prev.replace(/[׆⁠]/g, ""));
      lastJustifiedFontRef.current = "";
      return;
    }
    if (lastJustifiedFontRef.current === font.family) return;
    lastJustifiedFontRef.current = font.family;
    // Defer to next frame so bbox measurement uses the freshly-loaded font.
    requestAnimationFrame(() => {
      setText((prev) => {
        if (!prev.includes(trigger)) return prev;
        // Nohadra: cluster tatweels on stretchable letters (Hebrew-style).
        // Cursive Syriac: distribute between joining letters (Arabic-style).
        if (nohadraStretchActive) {
          return autoJustifySemitic(
            prev, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
            SYRIAC_STRETCHABLE, SYRIAC_WIDENING,
          );
        }
        if (syriacStretchActive) {
          return autoJustifyArabic(prev, justifyWidthPx, font.family, fontSize, fontFeatureSettings);
        }
        return autoJustifySemitic(
          prev, justifyWidthPx, font.family, fontSize,
          fontFeatureSettings,
          HEBREW_STRETCHABLE,
          trigger,
        );
      });
    });
    // Intentionally omit `text` from deps so this only fires on font change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font.family, fontReady, stretchFontActive]);

  // Reset palette + wide-set when the cluster count changes.
  useEffect(() => {
    // Start every letter in a single ink colour. Users who want the
    // rainbow can click "Reset palette".
    setColors(clusters.map(() => DEFAULT_INK));
    setWideClusters((prev) => {
      // Preserve entries that are still in-range; drop anything past new end.
      const next = new Set<number>();
      for (const i of prev) if (i < clusters.length) next.add(i);
      return next;
    });
  }, [clusters.length]);

  // --- Kashida interactions ----------------------------------------------

  /** Insert one stretch character at current cursor position. For
   *  Arabic/Syriac that's U+0640 between connecting letters; for Hebrew
   *  with our stretch font it's U+E010 after a top-stroke Hebrew letter.
   *
   *  Skips over combining marks (niqqud, harakat, Syriac vowels) when
   *  looking for the "effective" previous/next characters — otherwise
   *  typing kashida in vocalized text like بِسْمِ or בְּרֵאשִׁית never
   *  finds a connecting letter because the cursor is after a mark. */
  const insertKashida = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;

    // Walk backwards past combining marks to find the effective prev.
    const markRe = /\p{M}/u;
    let prev = "";
    for (let i = pos - 1; i >= 0; i--) {
      if (!markRe.test(text[i])) { prev = text[i]; break; }
    }
    if (!prev) return;
    // And forwards past combining marks for the effective next.
    let next = "";
    for (let i = pos; i < text.length; i++) {
      if (!markRe.test(text[i])) { next = text[i]; break; }
    }

    if (stretchFontActive) {
      // Hebrew stretch fonts use U+05C6; Syriac stretch fonts use U+2060
      // Word Joiner as the widening trigger (Common script — stays in the
      // Syriac shaping run, whereas U+05C6 is script=Hebrew and would
      // split the run and prevent the ligature firing). U+0640 tatweel
      // stays available separately for baseline bridging.
      const trigger = syriacStretchActive ? SYRIAC_WIDENING : HEBREW_STRETCH;
      const prevIsSemiticStretchable = /[֐-׿܀-ݏ]/.test(prev);
      if (!prevIsSemiticStretchable && prev !== HEBREW_STRETCH && prev !== SYRIAC_WIDENING) return;
      const updated = text.slice(0, pos) + trigger + text.slice(pos);
      setText(updated);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos + 1, pos + 1);
      });
      return;
    }

    // Arabic / Syriac kashida. prev must be a connecting letter; next
    // must be another connecting letter or another tatweel (so we're
    // extending a seam, not dangling at word-end).
    if (!canTakeKashidaAfter(prev) && prev !== TATWEEL) return;
    if (next && !canTakeKashidaAfter(next) && next !== TATWEEL) return;
    const updated = text.slice(0, pos) + TATWEEL + text.slice(pos);
    setText(updated);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos + 1, pos + 1);
    });
  }, [text, stretchFontActive]);

  /** Generic single-char insertion at cursor — used by Arabic-mark
   *  buttons (shaddah / tanwin). Combining marks attach to the preceding
   *  character automatically once they're in the text. */
  const insertAtCursor = useCallback((ch: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const updated = text.slice(0, pos) + ch + text.slice(pos);
    setText(updated);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos + ch.length, pos + ch.length);
    });
  }, [text]);

  /** Add the mark at cursor if it isn't already in the current grapheme
   *  cluster; otherwise remove the existing instance from that cluster.
   *  Lets each mark button serve double-duty (add + remove) without a
   *  separate "remove" UI. The "current cluster" is the one ending at
   *  or before the cursor — found by walking back through any combining
   *  marks until we hit a base character, then walking forward through
   *  marks again. */
  const toggleMarkAtCursor = useCallback((markChar: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const markRe = /\p{M}/u;
    let baseStart = pos;
    while (baseStart > 0 && markRe.test(text[baseStart - 1])) baseStart--;
    let clusterEnd = pos;
    while (clusterEnd < text.length && markRe.test(text[clusterEnd])) clusterEnd++;
    const idx = text.indexOf(markChar, baseStart);
    if (idx >= 0 && idx < clusterEnd) {
      const updated = text.slice(0, idx) + text.slice(idx + 1);
      setText(updated);
      requestAnimationFrame(() => {
        ta.focus();
        const newPos = pos > idx ? pos - 1 : pos;
        ta.setSelectionRange(newPos, newPos);
      });
    } else {
      const updated = text.slice(0, pos) + markChar + text.slice(pos);
      setText(updated);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos + markChar.length, pos + markChar.length);
      });
    }
  }, [text]);

  /** Remove one stretch character before the cursor, if present. Skips
   *  over any combining marks so "remove kashida" works whether the
   *  cursor is right after the tatweel or after a vowel that followed
   *  a tatweel-extended letter. */
  const removeKashida = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    if (pos <= 0) return;
    const target = hebrewStretchActive ? HEBREW_STRETCH : TATWEEL;
    const markRe = /\p{M}/u;
    let idx = -1;
    for (let i = pos - 1; i >= 0; i--) {
      if (markRe.test(text[i])) continue;
      if (text[i] === target) { idx = i; break; }
      return; // hit a non-mark non-target character before finding one
    }
    if (idx < 0) return;
    const updated = text.slice(0, idx) + text.slice(idx + 1);
    setText(updated);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = pos > idx ? pos - 1 : pos;
      ta.setSelectionRange(newPos, newPos);
    });
  }, [text, stretchFontActive]);

  /** Cluster index at (or immediately before) the given character position
   *  in `text`. Handles multi-char grapheme clusters by walking from start
   *  and counting. Pass the textarea's selectionStart. */
  const clusterIndexAtCharPos = useCallback((charPos: number): number => {
    const source = displayText;
    let consumed = 0;
    for (let i = 0; i < clusters.length; i++) {
      const clusterLen = clusters[i].length;
      consumed += clusterLen;
      if (consumed > charPos) return i;       // cursor inside this cluster
      if (consumed === charPos && i === clusters.length - 1) return i;
    }
    // Cursor past end → last cluster (or -1 if empty).
    void source;
    return clusters.length - 1;
  }, [clusters, displayText]);

  /** Toggle Hebrew jalt on the cluster at cursor. `+` turns it on; `-` off. */
  const toggleJaltAtCursor = useCallback((on: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Use the position JUST BEFORE the cursor — users typically want to
    // widen the letter they've just typed.
    const pos = Math.max(0, ta.selectionStart - 1);
    const idx = clusterIndexAtCharPos(pos);
    if (idx < 0) return;
    setWideClusters((prev) => {
      const next = new Set(prev);
      if (on) next.add(idx); else next.delete(idx);
      return next;
    });
    // Ensure the jalt feature itself is enabled in the stack (otherwise
    // individual spans can't get the substitution).
    if (on) setOtFeatures((f) => f.jalt ? f : { ...f, jalt: true });
  }, [clusterIndexAtCharPos]);

  // Keyboard handler: + / - in kashida-capable scripts insert/remove tatweel;
  // in Hebrew toggle jalt on the nearest cluster.
  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (supportsKashida) {
      if (e.key === "+" || e.key === "=") { e.preventDefault(); insertKashida(); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); removeKashida(); return; }
    } else if (supportsJaltWiden) {
      if (e.key === "+" || e.key === "=") { e.preventDefault(); toggleJaltAtCursor(true); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); toggleJaltAtCursor(false); return; }
    }
  };

  // --- SVG download ------------------------------------------------------

  const onDownload = async () => {
    try {
      const res = await fetch(`/fonts/${font.file}`);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const dataUri = `data:font/ttf;base64,${b64}`;

      // Measure the rendered preview to size the SVG 1:1.
      const previewEl = previewRef.current;
      const rect = previewEl ? previewEl.getBoundingClientRect() : { width: 800, height: 120 };
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);

      // Inline CSS-per-letter via classes so the RTL flow isn't disrupted
      // by inline fill on each tspan. Stretch extenders inherit the
      // preceding letter's color so the overlap region paints seamlessly.
      const downloadColors = effectiveColors(clusters, colors);
      const classRules = clusters
        .map((_, i) => {
          const fill = `.l${i}{fill:${downloadColors[i] ?? "#111827"}}`;
          const wide = wideClusters.has(i) && supportsJaltWiden
            ? `.w${i}{font-feature-settings:'jalt' 1;}`
            : "";
          return fill + wide;
        })
        .join("");
      const tspans = clusters
        .map((g, i) => {
          const cls = wideClusters.has(i) && supportsJaltWiden ? `l${i} w${i}` : `l${i}`;
          return `<tspan class="${cls}">${escapeXml(g)}</tspan>`;
        })
        .join("");

      // For RTL, the logical-first character goes to the right edge; using
      // text-anchor="end" + x=width-pad keeps the text right-aligned. Unicode
      // bidi on the raw characters handles visual order.
      const pad = 24;
      const xCoord = script.dir === "rtl" ? width - pad : pad;
      const anchor = script.dir === "rtl" ? "end" : "start";
      const baselineY = height - pad;

      const featStyle = `text{font-feature-settings:${fontFeatureSettings.replace(/"/g, "'")};}`;
      const svg =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<defs><style type="text/css">` +
        `@font-face{font-family:"EmbeddedFont";src:url("${dataUri}") format("truetype");}` +
        featStyle +
        classRules +
        `</style></defs>` +
        `<text x="${xCoord}" y="${baselineY}" font-family="EmbeddedFont" font-size="${fontSize}" text-anchor="${anchor}">${tspans}</text>` +
        `</svg>`;

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `semitic-font-lab-${script.id}-${font.id}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Download failed — see console.");
    }
  };

  // Coach-marks state. Auto-show on first visit; user can re-open via the
  // Help button. Persisted under "fontlab.tour.seen.v1" so a future tour
  // (v2 etc.) can be re-shown if we change steps materially.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("fontlab.tour.seen.v1")) {
      setTourOpen(true);
    }
  }, []);
  const closeTour = () => {
    setTourOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("fontlab.tour.seen.v1", "1");
    }
  };

  return (
    <div>
      {tourOpen && script.id === "hebrew" && (
        <CoachMarks onClose={closeTour} />
      )}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="text-xs px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
          title="Show the stretch-Hebrew tour"
        >
          ? How to stretch Hebrew letters
        </button>
      </div>
      <section className="mb-4 bg-white border border-neutral-200 rounded-lg p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label id="fl-script-select" className="block">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Script</span>
            <select
              suppressHydrationWarning
              className="mt-1 block w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
            >
              {/* Living / modern script order: Arabic → Assyrian (Syriac)
                  → Amharic → Hebrew. Then an "Ancient scripts" optgroup
                  bundling the historical inscription scripts together. */}
              {(["arabic", "syriac", "ethiopic", "hebrew"] as const).map((id) => {
                const s = SCRIPTS.find((x) => x.id === id);
                return s ? <option key={s.id} value={s.id}>{s.label}</option> : null;
              })}
              <optgroup label="Ancient scripts">
                {SCRIPTS.filter((s) => !["arabic", "syriac", "ethiopic", "hebrew"].includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
              </optgroup>
            </select>
          </label>
          <div id="fl-font-select" className="block">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Font</span>
            <FontPicker
              fonts={script.fonts}
              value={fontId}
              onChange={setFontId}
              sampleText={PICKER_SAMPLE[script.id] ?? script.sample.slice(0, 20)}
              dir={script.dir}
            />
          </div>
        </div>

        {CONVERTIBLE[script.id] && (() => {
          const runConversion = (targetConv: ConvertScript) => {
            const from = CONVERTIBLE[script.id];
            const r = convert(text, from, targetConv);
            setText(r.output);
            setConvertWarnings(r.warnings);
            setScriptId(CONVERT_TO_FONTLAB[targetConv]);
          };
          const modernTargets = CONVERT_MODERN.filter((s) => s !== CONVERTIBLE[script.id]);
          const ancientTargets = CONVERT_ANCIENT.filter((s) => s !== CONVERTIBLE[script.id]);
          return (
            <div className="mt-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-500 uppercase tracking-wider">Convert to</span>
                {modernTargets.map((targetConv) => (
                  <button
                    key={targetConv}
                    type="button"
                    onClick={() => runConversion(targetConv)}
                    className="px-2.5 py-1 rounded border border-neutral-400 bg-white hover:bg-neutral-100 font-medium"
                    title={`Convert current text from ${CONVERT_LABELS[CONVERTIBLE[script.id]]} to ${CONVERT_LABELS[targetConv]}`}
                  >
                    {CONVERT_LABELS[targetConv]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-400 uppercase tracking-wider">Ancient</span>
                {ancientTargets.map((targetConv) => (
                  <button
                    key={targetConv}
                    type="button"
                    onClick={() => runConversion(targetConv)}
                    className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-white text-[11px]"
                    title={`Convert current text from ${CONVERT_LABELS[CONVERTIBLE[script.id]]} to ${CONVERT_LABELS[targetConv]}`}
                  >
                    {CONVERT_LABELS[targetConv]}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        {convertWarnings.length > 0 && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded p-2">
            <div className="font-semibold text-amber-900 mb-1">Conversion notes</div>
            <ul className="list-disc ml-4 space-y-0.5 text-amber-900">
              {convertWarnings.map((w, i) => (<li key={i}>{w}</li>))}
            </ul>
            <button
              type="button"
              onClick={() => setConvertWarnings([])}
              className="mt-1 text-[10px] text-amber-800 underline hover:no-underline"
            >
              dismiss
            </button>
          </div>
        )}

        {(script.id === "hebrew" || script.id === "syriac" || script.id === "arabic" || script.id === "ethiopic") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-500 uppercase tracking-wider">Samples</span>
            {(script.id === "hebrew" ? HEBREW_SAMPLES
              : script.id === "syriac" ? SYRIAC_SAMPLES
              : script.id === "ethiopic" ? ETHIOPIC_SAMPLES
              : ARABIC_SAMPLES).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  const wantJustify = s.text.includes(HEBREW_STRETCH) || s.text.includes(TATWEEL);
                  const clean = s.text.replace(/[׆ـ⁠]/g, "");
                  const stretchable = script.id === "syriac" ? SYRIAC_STRETCHABLE : HEBREW_STRETCHABLE;
                  const trigger = script.id === "syriac" ? TATWEEL : HEBREW_STRETCH;
                  // Sample expects stretch but user isn't on a stretch font
                  // — flip to the default stretch font so the demo shows.
                  let targetFont = font;
                  const stretchFontId = script.id === "syriac" ? "stretchsyriac" : DEFAULT_FONT;
                  if (wantJustify && !fontId.startsWith("stretch") && script.id !== "arabic") {
                    setFontId(stretchFontId);
                    targetFont = script.fonts.find((f) => f.id === stretchFontId) ?? font;
                  }
                  const stretchActive = fontId.startsWith("stretch");
                  if (wantJustify || stretchActive || script.id === "syriac" || script.id === "arabic") {
                    // Auto-justify per font so every stretch font's demo fits
                    // the target column width. Syriac (non-Nohadra) and
                    // Arabic use tatweel-between-letters; Nohadra uses
                    // widening-clustered-on-stretchable-letters; Hebrew
                    // uses U+05C6 clustered on stretchable letters.
                    ensureFontLoaded(targetFont.family, targetFont.file).then(() => {
                      requestAnimationFrame(() => {
                        const isNohadra = script.id === "syriac" && targetFont.id.startsWith("stretchnohadra");
                        if (isNohadra) {
                          setText(autoJustifySemitic(
                            clean, justifyWidthPx, targetFont.family, fontSize,
                            fontFeatureSettings, SYRIAC_STRETCHABLE, SYRIAC_WIDENING,
                          ));
                        } else if (script.id === "syriac" || script.id === "arabic") {
                          setText(autoJustifyArabic(
                            clean, justifyWidthPx, targetFont.family, fontSize, fontFeatureSettings,
                          ));
                        } else {
                          setText(autoJustifySemitic(
                            clean, justifyWidthPx, targetFont.family, fontSize,
                            fontFeatureSettings, stretchable, trigger,
                          ));
                        }
                      });
                    });
                  } else {
                    setText(clean);
                  }
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                title={s.hint}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">
            Text source
            <span className="ml-2 normal-case tracking-normal text-neutral-500/80">
              — edit here; the coloured SVG preview below reflects it
            </span>
          </span>
          <div id="fl-textarea" className="relative">
            <textarea
              suppressHydrationWarning
              ref={textareaRef}
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded"
              rows={2}
              dir={script.dir}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              style={{
                fontFamily: font.family,
                fontSize: "22px",
                lineHeight: 1.5,
                fontFeatureSettings,
              }}
            />
          </div>
          {supportsKashida && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <button
                type="button"
                onClick={insertKashida}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                title={hebrewStretchActive
                  ? "Insert a Hebrew stretch segment (U+E010) at the cursor. Each press adds one segment; multiple segments chain into a continuous extender."
                  : "Insert a kashida / tatweel at the cursor, if the preceding letter can accept one (keyboard: +)"}
              >
                {hebrewStretchActive ? "+ extend" : "+ kashida"}
              </button>
              <button
                type="button"
                onClick={removeKashida}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                title="Remove one extender immediately before the cursor (keyboard: −)"
              >
                {hebrewStretchActive ? "− shorten" : "− kashida"}
              </button>
              <span className="text-neutral-500">
                in text: use <kbd className="px-1 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono">+</kbd> / <kbd className="px-1 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono">−</kbd> keys
                {hebrewStretchActive && <> · press multiple times to widen indefinitely</>}
              </span>
            </div>
          )}
          {/* Plain Nohadra fonts are block-style non-cursive with no
              widening ligature — auto-justify would only insert baseline
              tatweel blocks (image 50 "railroad" pattern). Hide the
              button and steer the user to the Semitic Stretch variants. */}
          {(stretchFontActive || script.id === "arabic" || script.id === "ethiopic" ||
            (script.id === "syriac" && font.id !== "nohadrasapna" && font.id !== "nohadraamedia")) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <button
                type="button"
                disabled={!fontReady}
                onClick={() => {
                  // Routing:
                  //  - Nohadra (block-style, non-cursive): CLUSTER tatweels
                  //    after stretchable letters so the per-letter widening
                  //    ligature fires cleanly (Hebrew-style path).
                  //  - Cursive Syriac + Arabic: distribute tatweels between
                  //    joining letters so the font's own tatweel glyph
                  //    bridges the joins.
                  //  - Ethiopic: repeat ፡ (U+1361 word-divider) between
                  //    words to fill the line. Classical Ge'ez manuscript
                  //    convention; no cursive joining to stretch.
                  //  - Hebrew: cluster U+05C6 on stretchable letters.
                  if (nohadraStretchActive) {
                    setText(
                      autoJustifySemitic(
                        text, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
                        SYRIAC_STRETCHABLE, SYRIAC_WIDENING,
                      ),
                    );
                  } else if (script.id === "arabic" || script.id === "syriac") {
                    setText(
                      autoJustifyArabic(
                        text, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
                      ),
                    );
                  } else if (script.id === "ethiopic") {
                    // Stretch font active: cluster U+2060 after stretchable
                    // fidels so the per-fidel GSUB widening ligature fires
                    // (Hebrew-style path). Plain font: repeat ፡ dividers
                    // between words as the classical Ge'ez tradition.
                    // Stretch font active: try letter-widening first (fires
                    // the per-fidel GSUB ligature). If the text has NO
                    // stretchable fidels (መ ጠ ሠ ሐ ወ in any vowel order),
                    // fall back to word-divider ፡ repetition so we still
                    // produce visible justification.
                    const hasStretchable = font.id === "stretchethiopic" &&
                      Array.from(text).some((ch) => ETHIOPIC_STRETCHABLE.has(ch));
                    if (hasStretchable) {
                      setText(
                        autoJustifySemitic(
                          text, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
                          ETHIOPIC_STRETCHABLE, SYRIAC_WIDENING, "ltr",
                        ),
                      );
                    } else {
                      setText(
                        autoJustifyEthiopic(
                          text, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
                        ),
                      );
                    }
                  } else {
                    setText(
                      autoJustifySemitic(
                        text, justifyWidthPx, font.family, fontSize, fontFeatureSettings,
                        HEBREW_STRETCHABLE, HEBREW_STRETCH,
                      ),
                    );
                  }
                }}
                className="px-2.5 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 font-semibold accent-showcase"
                title={
                  script.id === "arabic" || script.id === "syriac"
                    ? "Inserts tatweels (U+0640) between joining letters so each line reaches the target column width. Distributes evenly across every valid joining seam, capped at 12 per position."
                    : "Modifies the text source above: places kashidas (U+05C6) on stretchable letters so each line reaches the target column width."
                }
              >
                auto-justify text ▸
              </button>
              <label className="flex items-center gap-1">
                width:
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={10}
                  value={justifyWidthPx}
                  onChange={(e) => setJustifyWidthPx(Math.max(100, Number(e.target.value) || 680))}
                  className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-xs font-mono"
                />
                px
              </label>
              <button
                type="button"
                onClick={() => {
                  // Strip whichever trigger the current script uses. Hebrew =
                  // U+05C6, Syriac and Arabic = U+0640 tatweel.
                  setText(text.replace(/[׆ـ⁠]/g, ""));
                }}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600"
                title="Remove every stretch trigger from the text (U+05C6 for Hebrew, U+0640 tatweel for Syriac / Arabic)"
              >
                clear stretches
              </button>
              {script.id === "hebrew" && (
                <button
                  type="button"
                  onClick={() => {
                    // Strip Hebrew niqqud + te'amim from the text source (all
                    // Mn / cantillation marks in U+0591–U+05C7). Useful when a
                    // font like Hillel CLM doesn't have niqqud glyphs and the
                    // marks render as empty boxes.
                    setText(text.replace(/[֑-ׇ]/g, ""));
                  }}
                  className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600"
                  title="Remove all Hebrew niqqud (vowel points) and te'amim (cantillation marks) from the text source"
                >
                  clear niqqud
                </button>
              )}
              <span className="text-neutral-500 text-[11px]">
                one-click column justification — {script.id === "arabic" || script.id === "syriac"
                  ? "tatweels placed between joining letters"
                  : "kashidas placed on ד ה ל ם ר ת"}
              </span>
            </div>
          )}
          {hebrewStretchActive && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <span className="text-neutral-500 uppercase tracking-wider">Arabic marks</span>
              {[
                { ch: "ّ", label: "shaddah" },
                { ch: "ً", label: "fathatan" },
                { ch: "ٌ", label: "dammatan" },
                { ch: "ٍ", label: "kasratan" },
                { ch: "ْ", label: "sukun" },
                { ch: "̈", label: "two dots" },  // U+0308 — for Heh → ة
              ].map(({ ch, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleMarkAtCursor(ch)}
                  className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                  title={`Toggle U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")} ${label}: adds it to the letter at the cursor, or removes it if already present`}
                >
                  {ch} <span className="text-[10px] text-neutral-500 font-sans font-normal">{label}</span>
                </button>
              ))}
            </div>
          )}
          {supportsJaltWiden && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
              <button
                type="button"
                onClick={() => toggleJaltAtCursor(true)}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                title="Widen the letter before the cursor using the font's jalt (justification alternate) glyph. Best with Taamey Frank, Keter YG, Keter Aram Tsova, Shofar."
              >
                + widen
              </button>
              <button
                type="button"
                onClick={() => toggleJaltAtCursor(false)}
                className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                title="Revert the letter before the cursor to its normal width."
              >
                − narrow
              </button>
              <span className="text-neutral-500">
                in text: use <kbd className="px-1 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono">+</kbd> / <kbd className="px-1 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono">−</kbd> keys ·
                {wideClusters.size > 0 && <> <b>{wideClusters.size}</b> letter{wideClusters.size === 1 ? "" : "s"} widened</>}
              </span>
            </div>
          )}
        </label>

        {script.id === "hebrew" && (
          <HebrewOnScreenKeyboard
            onPress={insertAtCursor}
            onToggleMark={toggleMarkAtCursor}
            onBackspace={() => {
              const ta = textareaRef.current;
              if (!ta) return;
              const pos = ta.selectionStart;
              if (pos <= 0) return;
              setText(text.slice(0, pos - 1) + text.slice(pos));
              requestAnimationFrame(() => {
                ta.focus();
                ta.setSelectionRange(pos - 1, pos - 1);
              });
            }}
            onClear={() => {
              setText("");
              requestAnimationFrame(() => textareaRef.current?.focus());
            }}
            onStretch={hebrewStretchActive ? insertKashida : undefined}
            onShorten={hebrewStretchActive ? removeKashida : undefined}
            font={font}
            fontReady={fontReady}
          />
        )}

        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 uppercase tracking-wider">Size</span>
            <input
              type="range" min={32} max={240} step={4}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
            <span className="font-mono text-neutral-600">{fontSize}px</span>
          </label>

          <label
            className="flex items-center gap-2 text-xs cursor-pointer"
            title={
              script.id === "hebrew"
                ? "Remove niqqud / te'amim. Useful with Solitreo and other cursive fonts that don't include vowel-point glyphs."
                : script.id === "arabic"
                ? "Remove harakat + Quranic marks."
                : script.id === "syriac"
                ? "Remove Syriac vowels + diacritics."
                : "Remove combining marks."
            }
          >
            <input
              type="checkbox"
              checked={stripMarks}
              onChange={(e) => setStripMarks(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-neutral-500 uppercase tracking-wider">
              {script.id === "hebrew"
                ? "No niqqud"
                : script.id === "arabic"
                ? "No harakat"
                : script.id === "syriac"
                ? "No diacritics"
                : "Strip marks"}
            </span>
          </label>

          <span className="ml-auto text-xs text-neutral-500">
            {fontReady ? `loaded: ${font.label}` : "loading font…"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
          <span className="text-neutral-500 uppercase tracking-wider">Guides</span>
          {fontMetrics && bgGuide !== "none" && (
            <span className="ml-auto order-2 sm:order-none text-[10px] font-mono text-neutral-500">
              asc {fontMetrics.ascent.toFixed(2)}em ·
              desc {fontMetrics.descent.toFixed(2)}em ·
              x-height {fontMetrics.xHeight ? `${fontMetrics.xHeight.toFixed(2)}em` : "n/a"} ·
              cap {fontMetrics.capHeight ? `${fontMetrics.capHeight.toFixed(2)}em` : "n/a"}
            </span>
          )}
          {(["none", "baselines", "all lines", "grid"] as const).map((label) => {
            const g: GuideMode =
              label === "none" ? "none"
              : label === "baselines" ? "baselines"
              : label === "all lines" ? "all"
              : "grid";
            return (
              <button
                key={label}
                type="button"
                onClick={() => setBgGuide(g)}
                className={`px-2 py-0.5 rounded border ${
                  bgGuide === g
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                }`}
                title={
                  g === "none" ? "No background lines"
                  : g === "baselines" ? "One baseline per row (notebook paper)"
                  : g === "all" ? "Top + dashed midline + baseline per row (scribal-practice sheet)"
                  : "All horizontal lines plus vertical rules — full grid paper"
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-neutral-600">
          <span className="text-neutral-500 uppercase tracking-wider">OpenType</span>
          {(["liga", "calt", "salt", "dlig", "jalt", "ss01", "ss02", "ss03", "ss04"] as const).map((feat) => (
            <label key={feat} className="flex items-center gap-1 cursor-pointer" title={
              feat === "liga" ? "Standard ligatures (e.g. Arabic lam-alef)" :
              feat === "calt" ? "Contextual alternates (connected-form variants)" :
              feat === "salt" ? "Stylistic alternates (alternate glyph shapes)" :
              feat === "dlig" ? "Discretionary ligatures (decorative multi-letter joins)" :
              feat === "jalt" ? "Justification alternates — WIDE letter variants the font author drew for line justification. Horizontal strokes extend while vertical sides stay the same weight. Works on Culmus fonts (Taamey Frank, Keter YG, Keter Aram Tsova, Shofar)." :
              feat === "ss01" ? "Stylistic Set 1 — often wider/fancier letter forms (varies per font)" :
              feat === "ss02" ? "Stylistic Set 2 — often alternate historical forms" :
              feat === "ss03" ? "Stylistic Set 3 — varies per font" :
              "Stylistic Set 4 — varies per font"
            }>
              <input
                type="checkbox"
                checked={otFeatures[feat]}
                onChange={(e) => setOtFeatures((prev) => ({ ...prev, [feat]: e.target.checked }))}
                className="w-3.5 h-3.5"
              />
              <code className="font-mono">{feat}</code>
            </label>
          ))}
        </div>
      </section>

      {/* Preview is plain HTML so the browser's native text shaping runs
          across all scripts (Hebrew niqqud positioning, Arabic joining,
          Syriac marks) correctly. Each grapheme is one <span> with its
          own color — the paint is on top of shaped glyphs. */}
      <section className="mb-4 bg-white border border-neutral-200 rounded-lg p-4 overflow-x-auto">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-neutral-500">
          <span>
            Coloured SVG preview
            <span className="ml-2 normal-case tracking-normal text-neutral-500/80">
              — read-only render of the text source above
            </span>
          </span>
          <span className="font-mono lowercase tracking-normal">read-only</span>
        </div>
        <div
          ref={previewRef}
          className="inline-block w-full"
          style={{
            fontFamily: font.family,
            fontSize: `${fontSize}px`,
            lineHeight: 1.4,
            direction: script.dir,
            textAlign: script.dir === "rtl" ? "right" : "left",
            padding: "24px",
            minHeight: `${fontSize * 1.4 + 48}px`,
            fontFeatureSettings,
            whiteSpace: "pre-wrap",
            ...guideBackground(bgGuide, fontSize, fontMetrics),
          }}
        >
          {(() => {
            // IMPORTANT: the browser shapes text within each DOM node
            // independently. If we emit one <span> per grapheme cluster,
            // the base letter and its trailing stretch-extenders (U+E010)
            // land in different spans and the GSUB `liga` that turns
            // (lam + N×U+E010) into lamed_sN NEVER FIRES, because HarfBuzz
            // never sees them in the same shaping run. So we glue each
            // base letter together with its following extenders into one
            // span — they share a color anyway (see effectiveColors).
            const rendered = effectiveColors(clusters, colors);
            type Group = { text: string; color: string; isWide: boolean; key: number };
            const groups: Group[] = [];
            for (let i = 0; i < clusters.length; i++) {
              const g = clusters[i];
              // Extenders (U+E010 / tatweel) attach to the preceding group
              // so the letter and its extenders shape as one run — required
              // for the `liga` GSUB rule (letter + N×U+E010 → letter_sN) to
              // fire. Without this grouping each cluster would be its own
              // <span>, splitting the shaping run and killing the ligature.
              if (isStretchExtender(g) && groups.length > 0) {
                groups[groups.length - 1].text += g;
                continue;
              }
              groups.push({
                text: g,
                color: rendered[i] ?? "#111827",
                isWide: wideClusters.has(i),
                key: i,
              });
            }
            return groups.map((grp) => {
              const style: React.CSSProperties = { color: grp.color };
              if (grp.isWide && supportsJaltWiden) {
                style.fontFeatureSettings = "'jalt' 1";
              }
              return (
                <span key={grp.key} style={style}>{grp.text}</span>
              );
            });
          })()}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-neutral-500 font-mono">
            {clusters.length} grapheme cluster{clusters.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={onDownload}
            disabled={!fontReady}
            className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            ↓ Download SVG (font embedded)
          </button>
        </div>
      </section>

      {clusters.length > 0 && (
        <section id="fl-colors" className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="text-sm font-semibold text-neutral-700">
              Per-letter colors
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                Combining marks stay attached to their base letter.
                {supportsWideHebrew && " Click ⇿ on a letter to toggle its wide (Torah-scribal) form."}
              </span>
            </h3>
            <BulkColorControls
              onApplyAll={(c) => setColors(clusters.map(() => c))}
              onReset={() => setColors(clusters.map((_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]))}
            />
          </div>
          {/* In RTL scripts the grid flows right-to-left so swatches appear
              in the same visual order as the displayed word (first cluster
              on the right, matching how the reader scans). */}
          <div dir={script.dir} className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {clusters.map((g, i) => {
              // Stretch extenders (U+05C6 / tatweel) inherit the preceding
              // letter's color via effectiveColors and visually merge with
              // it, so they shouldn't get their own swatch — that would
              // look like an empty slot in the middle of a stretched word.
              if (isStretchExtender(g)) return null;
              // Two widening paths, distinct:
              //   · jalt (typographic, glyph-level): Hebrew letters that the
              //     font has a wide alternate glyph for. Toggled via the
              //     wideClusters set.
              //   · U+FB21-28 (Unicode wide presentation forms): swap the
              //     character itself for a different codepoint.
              const jaltWide = wideClusters.has(i);
              const canBeCodepointWide =
                supportsWideHebrew && (g in HEBREW_WIDE || g in HEBREW_WIDE_INVERSE);
              const isCodepointWide = g in HEBREW_WIDE_INVERSE;
              const toggleJalt = () => {
                setWideClusters((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  return next;
                });
                setOtFeatures((f) => f.jalt ? f : { ...f, jalt: true });
              };
              const toggleWide = () => {
                // Find the i-th matching char in original `text` and flip it.
                let found = -1;
                let count = -1;
                const base = HEBREW_WIDE_INVERSE[g] ?? g;
                const wide = HEBREW_WIDE[base];
                if (!wide) return;
                const targets = new Set([base, wide]);
                for (let j = 0; j < text.length; j++) {
                  if (targets.has(text[j])) {
                    count++;
                    if (count === i) {
                      found = j;
                      break;
                    }
                  }
                }
                // Fallback: count clusters in text that produced a cluster
                // grouping equivalent. For simple Hebrew base letters this
                // 1:1 mapping is typically fine.
                if (found < 0) {
                  // Last-resort: try matching by grapheme index directly
                  // (works when strip-marks isn't altering cluster count).
                  const clustersOfText = graphemes(text);
                  if (clustersOfText[i] === g || clustersOfText[i] === (HEBREW_WIDE_INVERSE[g] ?? "")) {
                    // Reconstruct the position
                    let pos = 0;
                    for (let k = 0; k < i; k++) pos += clustersOfText[k].length;
                    found = pos;
                  }
                }
                if (found < 0) return;
                const newChar = isCodepointWide ? base : wide;
                setText(text.slice(0, found) + newChar + text.slice(found + 1));
              };
              return (
                <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded border bg-neutral-50 relative ${jaltWide ? "border-amber-400 ring-1 ring-amber-300" : "border-neutral-200"}`}>
                  <span
                    className="text-2xl leading-none"
                    dir={script.dir}
                    style={{
                      fontFamily: font.family,
                      fontFeatureSettings: jaltWide ? `${fontFeatureSettings}, 'jalt' 1` : fontFeatureSettings,
                    }}
                  >
                    {g === " " ? "␣" : g === TATWEEL ? "ـ" : g}
                  </span>
                  <input
                    type="color"
                    value={colors[i] ?? "#000000"}
                    onChange={(e) => {
                      setColors((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      });
                    }}
                    className="w-full h-6 cursor-pointer"
                    aria-label={`Color for character ${g}`}
                  />
                  {supportsJaltWiden && (
                    <button
                      type="button"
                      onClick={toggleJalt}
                      className={`absolute top-1 left-1 text-[10px] font-mono w-5 h-5 rounded border ${
                        jaltWide
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-white border-neutral-300 text-neutral-500 hover:border-amber-400"
                      }`}
                      title={jaltWide ? "Widened via jalt — click to revert. Works best in Taamey Frank, Keter YG, Keter Aram Tsova, Shofar." : "Widen this letter using the font's justification-alternate glyph (jalt). Keyboard: place cursor after this letter and press +"}
                    >
                      ⇿
                    </button>
                  )}
                  {canBeCodepointWide && (
                    <button
                      type="button"
                      onClick={toggleWide}
                      className={`absolute top-1 right-1 text-[10px] font-mono w-5 h-5 rounded border ${
                        isCodepointWide
                          ? "bg-sky-500 text-white border-sky-600"
                          : "bg-white border-neutral-300 text-neutral-500 hover:border-sky-400"
                      }`}
                      title={isCodepointWide ? "Using Unicode wide presentation form (U+FB21–28) — click to revert" : "Swap to Unicode wide presentation form (U+FB21–28). Distinct from jalt — changes the actual codepoint."}
                    >
                      ↔
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Showcase
        onLoad={(item, sectionScriptId) => {
          setScriptId(sectionScriptId);
          setText(item.text);
          if (item.font) {
            const fontOverride = SCRIPTS.find((s) => s.id === sectionScriptId)?.fonts.find((f) => f.id === item.font);
            if (fontOverride) setFontId(fontOverride.id);
          }
          requestAnimationFrame(() => textareaRef.current?.focus());
        }}
      />
    </div>
  );
}

function Showcase({ onLoad }: {
  onLoad: (item: ShowcaseItem, scriptId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (name: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
        // Preload every font referenced by this section's items so the
        // in-card previews actually render with the right glyphs (e.g.
        // Taamey Frank CLM for te'amim). Without this, the browser
        // falls back to system fonts that don't have cantillation.
        //
        // Also preload Amiri (Arabic) as a cross-script fallback — the
        // Judeo-Arabic item on Hebrew and the Hebrew-niqqud-on-Arabic
        // item both mix scripts, and the primary font typically only
        // supports one. Preloading Amiri means Arabic marks (shadda,
        // sukun, harakat) always have a font to fall back to.
        const sec = SHOWCASE.find((s) => s.section === name);
        if (sec) {
          const script = SCRIPTS.find((s) => s.id === sec.scriptId);
          const targetFonts = new Set<string>();
          for (const item of sec.items) {
            const fontId = item.font ?? script?.fonts[0]?.id;
            if (fontId) targetFonts.add(fontId);
          }
          for (const fid of targetFonts) {
            const f = script?.fonts.find((x) => x.id === fid);
            if (f) ensureFontLoaded(f.family, f.file);
          }
          const amiri = SCRIPTS.find((s) => s.id === "arabic")?.fonts.find((f) => f.id === "amiri");
          if (amiri) ensureFontLoaded(amiri.family, amiri.file);
        }
      }
      return next;
    });
  };
  return (
    <section className="mt-4 bg-white border border-neutral-200 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">Feature showcase</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cross-script experiments and script-specific features — click any card to load it into the editor above.
          </p>
        </div>
        <span className="text-neutral-500 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {SHOWCASE.map((sec) => {
            const sectionOpen = openSections.has(sec.section);
            return (
              <div key={sec.section} className="border border-neutral-200 rounded">
                <button
                  type="button"
                  onClick={() => toggleSection(sec.section)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left bg-neutral-50 hover:bg-neutral-100 rounded-t"
                  aria-expanded={sectionOpen}
                >
                  <span className="text-sm font-medium text-neutral-800">{sec.section}</span>
                  <span className="text-xs text-neutral-500">
                    {sec.items.length} {sec.items.length === 1 ? "item" : "items"}
                    <span className="ml-2 text-neutral-400">{sectionOpen ? "▼" : "▶"}</span>
                  </span>
                </button>
                {sectionOpen && (
                  <ul className="p-2 space-y-2">
                    {sec.items.map((item, i) => {
                      const script = SCRIPTS.find((s) => s.id === sec.scriptId);
                      return (
                        <li key={i} className="border border-neutral-100 rounded p-3 hover:border-neutral-300 transition">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div className="text-sm font-medium text-neutral-800">{item.title}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                              item.status === "live" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                              item.status === "experimental" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                              "bg-neutral-100 text-neutral-600 border border-neutral-300"
                            }`}>{item.status}</span>
                          </div>
                          <div
                            className="text-2xl my-2 leading-normal text-neutral-900"
                            dir={script?.dir ?? "rtl"}
                            style={{
                              // Font stack: primary (item.font or section's default) → Amiri
                              // fallback for Arabic harakat/shadda (needed for the cross-script
                              // Judeo-Arabic + Hebrew-niqqud-on-Arabic items) → system-ui.
                              fontFamily: item.font
                                ? `"${script?.fonts.find((f) => f.id === item.font)?.family ?? ""}", "FL_Amiri", system-ui`
                                : `"${script?.fonts[0]?.family ?? ""}", "FL_Amiri", system-ui`,
                            }}
                          >
                            {item.text}
                          </div>
                          <p className="text-xs text-neutral-600 leading-snug mb-2">{item.description}</p>
                          <button
                            type="button"
                            onClick={() => onLoad(item, sec.scriptId)}
                            className="text-xs px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
                          >
                            Load into editor →
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BulkColorControls({
  onApplyAll,
  onReset,
}: {
  onApplyAll: (color: string) => void;
  onReset: () => void;
}) {
  const [color, setColor] = useState("#111827");
  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-8 h-7 rounded cursor-pointer"
        aria-label="Bulk color"
      />
      <button
        type="button"
        onClick={() => onApplyAll(color)}
        className="px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100"
      >
        Apply to all
      </button>
      <button
        type="button"
        onClick={onReset}
        className="px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100"
      >
        Reset palette
      </button>
    </div>
  );
}

// Letters that have a stretch variant in our SemiticStretch* fonts. Any
// of these followed by U+05C6 trigger(s) gets substituted to a wider
// glyph by the GSUB liga rule. Highlighted in the on-screen keyboard so
// users know which keys can be stretched.
const STRETCHABLE = new Set(["ד", "ה", "ל", "ם", "ר", "ת"]);

// Which letters our stretch fonts widen. Hebrew: ד ה ל ם ר ת.
// Syriac (Nohadra): ܐ ܒ ܕ ܗ ܘ ܡ ܣ ܪ ܫ ܬ — expanded from the original 4
// so Peshitta lines have several stretchable positions per row.
const HEBREW_STRETCHABLE = new Set(["ד", "ה", "ל", "ם", "ר", "ת"]);
const SYRIAC_STRETCHABLE = new Set(["ܐ", "ܒ", "ܕ", "ܗ", "ܘ", "ܡ", "ܣ", "ܪ", "ܫ", "ܬ"]);
// Ethiopic: 5 Ge'ez consonant series × 7 vowel orders each = 35 fidels.
// The stretch build widens the horizontal decorative strokes of each.
const ETHIOPIC_STRETCHABLE = new Set<string>();
for (const base of [0x1218, 0x1220, 0x1210, 0x1320, 0x12C8]) {
  for (let order = 0; order < 7; order++) {
    ETHIOPIC_STRETCHABLE.add(String.fromCodePoint(base + order));
  }
}

// Auto-justify: given a paragraph, a target column width in px, and the
// active font settings, place U+05C6 stretches on scribally-appropriate
// letters to make each line's rendered width close the deficit to the
// target width. Font-agnostic — measures pixels-per-stretch-level from the
// live DOM rather than reading per-font UPM/step config.
//
// Distribution policy: split the deficit evenly across every stretchable
// position in the line, capping any single letter at MAX_LEVELS (16) to
// avoid triggering the overflow-chain machinery on any one glyph. If the
// cap is hit before the deficit closes, we accept the residual gap.
/** Auto-justify Arabic — inserts tatweels (U+0640) between joining
 *  letters so each line reaches the target column width. Same shape as
 *  autoJustifySemitic but uses tatweel and finds positions BETWEEN two
 *  Arabic letters where the previous one is left-joining. */
function autoJustifyArabic(
  text: string,
  targetWidthPx: number,
  fontFamily: string,
  fontSizePx: number,
  featureSettings: string,
): string {
  const TATWEEL = "ـ";
  const MAX_PER_POSITION = 12;

  const scratch = document.createElement("div");
  scratch.style.cssText =
    `position:absolute;visibility:hidden;top:-9999px;left:-9999px;` +
    `font:${fontSizePx}px "${fontFamily}";` +
    `font-feature-settings:${featureSettings};` +
    `direction:rtl;white-space:nowrap;`;
  document.body.appendChild(scratch);
  try {
    const measure = (s: string): number => {
      scratch.textContent = s;
      return scratch.getBoundingClientRect().width;
    };
    // "Joining letter" here means Arabic OR Syriac — both scripts use the
    // Arabic-style tatweel-between-letters justification path. Restricting
    // to only the Arabic block would silently make Syriac auto-justify a
    // no-op, since Syriac letters would fail the `next` test.
    const isJoiningLetter = (ch: string): boolean => {
      const cp = ch.charCodeAt(0);
      return (cp >= 0x0621 && cp <= 0x064A)   // Arabic
          || (cp >= 0x066E && cp <= 0x06D3)   // Arabic Supplement
          || (cp >= 0x0712 && cp <= 0x072F);  // Syriac letters
    };
    const isCombiningMark = (ch: string): boolean => /\p{M}/u.test(ch);

    const lines = text.split("\n");
    const out = lines.map((line) => {
      const clean = line.replace(new RegExp(TATWEEL, "g"), "");
      if (!clean.trim()) return line;
      const natural = measure(clean);
      const deficit = targetWidthPx - natural;
      if (deficit <= 1) return clean;

      // Find positions BETWEEN two connecting letters. Insertion index i
      // means: insert BEFORE clean[i]. So prev = clean[i-1], next = clean[i].
      // Skip combining marks: walk back to find effective prev letter.
      const positions: number[] = [];
      for (let i = 1; i < clean.length; i++) {
        let prevIdx = i - 1;
        while (prevIdx >= 0 && isCombiningMark(clean[prevIdx])) prevIdx--;
        if (prevIdx < 0) continue;
        const prev = clean[prevIdx];
        const next = clean[i];
        if (canTakeKashidaAfter(prev) && isJoiningLetter(next)) {
          positions.push(i);
        }
      }
      if (positions.length === 0) return clean;

      // Measure pxPerLevel by inserting 8 tatweels at a mid-line position.
      const testPos = positions[Math.floor(positions.length / 2)];
      const testStr = clean.slice(0, testPos) + TATWEEL.repeat(8) + clean.slice(testPos);
      const pxPerLevel = (measure(testStr) - natural) / 8;
      if (pxPerLevel <= 0.1) return clean;

      const totalLevels = Math.max(0, Math.round(deficit / pxPerLevel));
      const per = Math.floor(totalLevels / positions.length);
      const remainder = totalLevels - per * positions.length;
      const distribution = positions.map((_, i) =>
        Math.min(MAX_PER_POSITION, per + (i < remainder ? 1 : 0)),
      );

      let result = clean;
      for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        const count = distribution[i];
        if (count > 0) {
          result = result.slice(0, pos) + TATWEEL.repeat(count) + result.slice(pos);
        }
      }
      return result;
    });
    return out.join("\n");
  } finally {
    document.body.removeChild(scratch);
  }
}

// Ethiopic auto-justify: repeat the ፡ word-divider (U+1361) between
// words to fill the line. Modelled on the classical Ge'ez manuscript
// tradition of widening/repeating dividers for column justification.
// Non-cursive script — this is inter-word widening, not intra-letter.
//
// Approach:
//   1. Split each line by whitespace + existing ፡ into words.
//   2. For each gap, measure how many extra ፡ fit before hitting target.
//   3. Distribute extras across gaps evenly.
function autoJustifyEthiopic(
  text: string,
  targetWidthPx: number,
  fontFamily: string,
  fontSizePx: number,
  featureSettings: string,
): string {
  const DIVIDER = "፡"; // ETHIOPIC WORDSPACE
  const MAX_PER_GAP = 8;
  const scratch = document.createElement("div");
  scratch.style.cssText =
    `position:absolute;visibility:hidden;top:-9999px;left:-9999px;` +
    `font:${fontSizePx}px "${fontFamily}";` +
    `font-feature-settings:${featureSettings};` +
    `white-space:nowrap;`;
  document.body.appendChild(scratch);
  try {
    const measure = (s: string): number => {
      scratch.textContent = s;
      return scratch.getBoundingClientRect().width;
    };
    const out = text.split("\n").map((line) => {
      // Strip any existing dividers we added on a prior justify pass so
      // repeated clicks don't compound. Preserve single ፡ between words
      // that already had one (Ethiopic native usage).
      const collapsed = line.replace(new RegExp(`${DIVIDER}+`, "g"), DIVIDER);
      if (!collapsed.trim()) return line;
      const natural = measure(collapsed);
      const deficit = targetWidthPx - natural;
      if (deficit <= 1) return collapsed;
      // Gap positions = every whitespace or ፡ character where we can
      // insert additional dividers.
      const positions: number[] = [];
      for (let i = 0; i < collapsed.length; i++) {
        const ch = collapsed[i];
        if (ch === " " || ch === "\t" || ch === DIVIDER) positions.push(i + 1);
      }
      if (positions.length === 0) return collapsed;
      // Calibrate: 4 extra dividers at mid-line → pxPerLevel.
      const testPos = positions[Math.floor(positions.length / 2)];
      const test = collapsed.slice(0, testPos) + DIVIDER.repeat(4) + collapsed.slice(testPos);
      const pxPerLevel = (measure(test) - natural) / 4;
      if (pxPerLevel <= 0.1) return collapsed;
      const total = Math.max(0, Math.round(deficit / pxPerLevel));
      const per = Math.floor(total / positions.length);
      const rem = total - per * positions.length;
      const dist = positions.map((_, i) => Math.min(MAX_PER_GAP, per + (i < rem ? 1 : 0)));
      let result = collapsed;
      for (let i = positions.length - 1; i >= 0; i--) {
        const n = dist[i];
        if (n > 0) result = result.slice(0, positions[i]) + DIVIDER.repeat(n) + result.slice(positions[i]);
      }
      return result;
    });
    return out.join("\n");
  } finally {
    document.body.removeChild(scratch);
  }
}

function autoJustifySemitic(
  text: string,
  targetWidthPx: number,
  fontFamily: string,
  fontSizePx: number,
  featureSettings: string,
  stretchable: Set<string>,
  stretchChar: string = "׆",
  direction: "rtl" | "ltr" = "rtl",
): string {
  const STRETCH = stretchChar;
  const MAX_LEVELS_PER_LETTER = 16;

  const scratch = document.createElement("div");
  scratch.style.cssText =
    `position:absolute;visibility:hidden;top:-9999px;left:-9999px;` +
    `font:${fontSizePx}px "${fontFamily}";` +
    `font-feature-settings:${featureSettings};` +
    `direction:${direction};white-space:nowrap;`;
  document.body.appendChild(scratch);
  try {
    const measure = (s: string): number => {
      scratch.textContent = s;
      return scratch.getBoundingClientRect().width;
    };

    const lines = text.split("\n");
    const out = lines.map((line) => {
      // Strip any existing stretches so we start from a clean baseline.
      const clean = line.replace(new RegExp(STRETCH, "g"), "");
      if (!clean.trim()) return line;

      const natural = measure(clean);
      const deficit = targetWidthPx - natural;
      if (deficit <= 1) return clean;

      const positions: number[] = [];
      for (let i = 0; i < clean.length; i++) {
        if (stretchable.has(clean[i])) positions.push(i);
      }
      if (positions.length === 0) return clean;

      // Sample any stretchable letter in this line to compute px per level.
      const letter = clean[positions[positions.length - 1]];
      const SAMPLE_LEVELS = 8;
      const pxPerLevel =
        (measure(letter + STRETCH.repeat(SAMPLE_LEVELS)) - measure(letter)) / SAMPLE_LEVELS;
      if (pxPerLevel <= 0.1) return clean;

      const totalLevels = Math.max(0, Math.round(deficit / pxPerLevel));
      const per = Math.floor(totalLevels / positions.length);
      const remainder = totalLevels - per * positions.length;
      const distribution = positions.map((_, i) =>
        Math.min(MAX_LEVELS_PER_LETTER, per + (i < remainder ? 1 : 0)),
      );

      // Insert from last position backwards so earlier positions stay valid.
      let result = clean;
      for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        const count = distribution[i];
        if (count > 0) {
          result = result.slice(0, pos + 1) + STRETCH.repeat(count) + result.slice(pos + 1);
        }
      }
      return result;
    });
    return out.join("\n");
  } finally {
    document.body.removeChild(scratch);
  }
}

// --- Coach marks --------------------------------------------------------

type TourStep = {
  targetId: string;
  title: string;
  body: string;
  placement?: "top" | "bottom";
};

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "fl-font-select",
    title: "1. Pick a stretch-capable font",
    body: "Any 'Semitic Stretch …' font supports kashida-style widening of six letters: ד ה ל ם ר ת. The other Hebrew fonts are available too but only widen via per-letter jalt.",
    placement: "bottom",
  },
  {
    targetId: "fl-textarea",
    title: "2. Type your text here",
    body: "Type Hebrew normally, or use the on-screen keyboard below. Each grapheme cluster (letter + niqqud) becomes one colorable unit.",
    placement: "bottom",
  },
  {
    targetId: "fl-keyboard",
    title: "3. Stretchable letters are highlighted",
    body: "ד ה ל ם ר ת glow amber in the keyboard — those are the six letters that can be widened by inserting kashida triggers after them.",
    placement: "top",
  },
  {
    targetId: "fl-stretch-btn",
    title: "4. Tap ✚ stretch to widen",
    body: "After typing a stretchable letter, tap ✚ — it inserts a U+05C6 trigger and our font's GSUB ligature swaps in a wider glyph. Tap again for more stretch (up to 16 levels). Keyboard shortcut: the + key.",
    placement: "top",
  },
  {
    targetId: "fl-colors",
    title: "5. Color each letter, then download",
    body: "Each cluster gets its own swatch (in reading order). Pick colors, then hit Download SVG to export — the font is embedded so the SVG renders identically anywhere.",
    placement: "top",
  },
];

function CoachMarks({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const current = TOUR_STEPS[step];

  // Re-measure the target on step change, scroll, and resize.
  useEffect(() => {
    function measure() {
      const el = document.getElementById(current.targetId);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      // Wait for the smooth-scroll to settle before measuring.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
      });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [current.targetId]);

  // Position the tooltip near the target. Default below; flip above if
  // there isn't room and the step prefers it.
  const placement = current.placement ?? "bottom";
  const tooltipStyle: React.CSSProperties = rect
    ? placement === "top"
      ? { top: rect.top - 12, left: rect.left + rect.width / 2, transform: "translate(-50%, -100%)" }
      : { top: rect.bottom + 12, left: rect.left + rect.width / 2, transform: "translate(-50%, 0)" }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  // Spotlight: dim everything except the target's bounding box. Built as a
  // 4-rect overlay rather than CSS clip-path so it works in every browser.
  const spotlight = rect ? (
    <>
      <div className="fixed inset-x-0 top-0 bg-black/60 pointer-events-auto" style={{ height: rect.top - 6 }} />
      <div className="fixed inset-x-0 bg-black/60 pointer-events-auto" style={{ top: rect.bottom + 6, bottom: 0 }} />
      <div className="fixed bg-black/60 pointer-events-auto" style={{ top: rect.top - 6, left: 0, width: rect.left - 6, height: rect.height + 12 }} />
      <div className="fixed bg-black/60 pointer-events-auto" style={{ top: rect.top - 6, left: rect.right + 6, right: 0, height: rect.height + 12 }} />
      <div className="fixed pointer-events-none border-2 border-amber-300 rounded-lg shadow-[0_0_0_4px_rgba(252,211,77,0.3)]"
           style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} />
    </>
  ) : (
    <div className="fixed inset-0 bg-black/60" />
  );

  return (
    <div className="fixed inset-0 z-50">
      {spotlight}
      <div
        className="fixed z-10 max-w-sm bg-white border border-neutral-300 rounded-lg shadow-2xl p-4"
        style={tooltipStyle}
      >
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
          Step {step + 1} of {TOUR_STEPS.length}
        </div>
        <h4 className="font-semibold text-base mb-1">{current.title}</h4>
        <p className="text-sm text-neutral-700 mb-3">{current.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 text-neutral-500 hover:text-neutral-800"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-sm px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100"
              >
                ← Back
              </button>
            )}
            {step < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="text-sm px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-sm px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Got it ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const HEBREW_KEY_ROWS: string[][] = [
  ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"],
  ["כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר"],
  ["ש", "ת", "ך", "ם", "ן", "ף", "ץ"],
];

// Niqqud + cantillation row. Each is a combining mark — clicking inserts
// the codepoint at the cursor; it attaches to the preceding letter.
const HEBREW_NIQQUD: { ch: string; label: string }[] = [
  { ch: "ַ", label: "patah" },
  { ch: "ָ", label: "qamatz" },
  { ch: "ֵ", label: "tzere" },
  { ch: "ֶ", label: "segol" },
  { ch: "ִ", label: "hiriq" },
  { ch: "ֹ", label: "holam" },
  { ch: "ֻ", label: "qubutz" },
  { ch: "ְ", label: "sheva" },
  { ch: "ּ", label: "dagesh" },
  { ch: "ׁ", label: "shin-dot" },
  { ch: "ׂ", label: "sin-dot" },
];

function HebrewOnScreenKeyboard({
  onPress, onToggleMark, onBackspace, onClear, onStretch, onShorten, font, fontReady,
}: {
  onPress: (ch: string) => void;
  onToggleMark: (ch: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onStretch?: () => void;
  onShorten?: () => void;
  font: { family: string };
  fontReady: boolean;
}) {
  const [open, setOpen] = useState(true);
  const fontStyle = fontReady ? { fontFamily: font.family } : undefined;
  return (
    <div id="fl-keyboard" className="mt-3 border border-neutral-300 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-xs"
      >
        <span className="uppercase tracking-wider text-neutral-600">
          ⌨ Hebrew keyboard
          <span className="ml-2 normal-case text-neutral-500">
            tap letters to type · highlighted letters can be stretched
          </span>
        </span>
        <span className="font-mono text-neutral-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div dir="rtl" className="p-3 bg-neutral-50 space-y-1.5">
          {HEBREW_KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center flex-wrap">
              {row.map((ch) => {
                const isStretchable = STRETCHABLE.has(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onPress(ch); }}
                    title={isStretchable ? `${ch} — stretchable letter (press ✚ after typing)` : ch}
                    className={`min-w-10 h-11 px-2 rounded border text-2xl leading-none transition ${
                      isStretchable
                        ? "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200"
                        : "bg-white border-neutral-300 hover:bg-neutral-100"
                    }`}
                    style={fontStyle}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex gap-1 justify-center flex-wrap pt-1.5 border-t border-neutral-200">
            {HEBREW_NIQQUD.map(({ ch, label }) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onToggleMark(ch); }}
                title={`${label} — click to add to the letter at the cursor; click again to remove`}
                className="min-w-10 h-9 px-2 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-lg"
                style={fontStyle}
              >
                <span className="text-neutral-400">◌</span>{ch}
              </button>
            ))}
          </div>
          <div className="flex gap-1 justify-center flex-wrap pt-1.5 border-t border-neutral-200">
            {onStretch && (
              <button
                id="fl-stretch-btn"
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onStretch(); }}
                title="Stretch the letter just typed (inserts U+05C6 trigger). Tap again to extend further. Keyboard: + key."
                className="px-3 h-10 rounded border-2 border-emerald-500 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 font-semibold text-sm"
              >
                ✚ stretch
              </button>
            )}
            {onShorten && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onShorten(); }}
                title="Shorten by one stretch level. Keyboard: − key."
                className="px-3 h-10 rounded border-2 border-rose-400 bg-rose-50 text-rose-900 hover:bg-rose-100 font-semibold text-sm"
              >
                − shorten
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPress(" "); }}
              title="Space"
              className="min-w-32 h-10 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-sm"
            >
              ␣ space
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onBackspace(); }}
              title="Delete the character before the cursor"
              className="min-w-12 h-10 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-base"
            >
              ⌫
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onClear(); }}
              title="Clear the textarea"
              className="px-3 h-10 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs"
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
