"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// One point in a glyph — x, y are in font units (UPM 1000 for Frank Ruhl).
type Pt = { x: number; y: number; onCurve: boolean };
// One contour — array of points.
type Contour = Pt[];
// One glyph — a name, contours, xMin/yMin/xMax/yMax bounds, unitsPerEm.
type Glyph = {
  name: string;
  contours: Contour[];
  bounds: { xMin: number; yMin: number; xMax: number; yMax: number };
  upem: number;
  advance: number;
};

// Fonts we can load. Each entry: display label + .ttf file path (relative
// to /public). The list mirrors the stretch-debug picker for consistency.
// stretchable = codepoint set of letters that widen in this font (undef
// for source fonts, which have no stretch variants).
type FontEntry = { id: string; label: string; file: string; stretchable?: Set<number> };
const BASE_CPS = [0x05D3, 0x05D4, 0x05DC, 0x05DD, 0x05E8, 0x05EA];
// bet, het, tet, yod, finalkaf, kaf, finalpe, pe, tzade, qof
const COMPLEX_10_CPS = [0x05D1, 0x05D7, 0x05D8, 0x05D9, 0x05DA, 0x05DB, 0x05E3, 0x05E4, 0x05E6, 0x05E7];
const withComplexCps = () => new Set([...BASE_CPS, ...COMPLEX_10_CPS]);
const FONTS: FontEntry[] = [
  { id: "stretch-hebrew", label: "Semitic Stretch Hebrew (Frank Ruhl)", file: "SemiticStretchHebrew-v2.ttf",
    stretchable: new Set([...BASE_CPS, ...COMPLEX_10_CPS, 0x05D0, 0x05E2, 0x05E9]) },
  { id: "stretch-noto-sans-heb", label: "Semitic Stretch Noto Sans Hebrew", file: "SemiticStretchNotoSansHebrew.ttf",
    // pe/finalpe skipped in Noto Sans
    stretchable: new Set([...BASE_CPS, 0x05D1, 0x05D7, 0x05D8, 0x05D9, 0x05DA, 0x05DB, 0x05E6, 0x05E7]) },
  { id: "stretch-noto-serif-heb",label: "Semitic Stretch Noto Serif Hebrew", file: "SemiticStretchNotoSerifHebrew.ttf", stretchable: withComplexCps() },
  { id: "stretch-gladia",        label: "Semitic Stretch Gladia CLM",       file: "SemiticStretchGladiaCLM.ttf",       stretchable: withComplexCps() },
  { id: "stretch-keter",         label: "Semitic Stretch Keter Aram Tsova", file: "SemiticStretchKeterAramTsova.ttf",  stretchable: withComplexCps() },
  { id: "stretch-hillel",        label: "Semitic Stretch Hillel CLM",       file: "SemiticStretchHillelCLM.ttf",       stretchable: withComplexCps() },
  { id: "stretch-shofar",        label: "Semitic Stretch Shofar",           file: "SemiticStretchShofar.ttf",          stretchable: withComplexCps() },
  { id: "stretch-freemono",      label: "Semitic Stretch FreeMono",         file: "SemiticStretchFreeMono.ttf",        stretchable: withComplexCps() },
  { id: "stretch-nachlieli",     label: "Semitic Stretch Nachlieli CLM",    file: "SemiticStretchNachlieliCLM.ttf",    stretchable: withComplexCps() },
  { id: "stretch-miriammono",    label: "Semitic Stretch Miriam Mono CLM",  file: "SemiticStretchMiriamMonoCLM.ttf",   stretchable: withComplexCps() },
  { id: "stretch-ezrasil",       label: "Semitic Stretch Ezra SIL SR",      file: "SemiticStretchEzraSIL.ttf",         stretchable: withComplexCps() },
  { id: "stretch-stam",          label: "Semitic Stretch Stam Ashkenaz",    file: "SemiticStretchStamAshkenazCLM.ttf", stretchable: withComplexCps() },
  { id: "stretch-shlomo",        label: "Semitic Stretch Shlomo SemiStam",  file: "SemiticStretchShlomoSemiStam.ttf",  stretchable: withComplexCps() },
  // Rashi — tzade skipped
  { id: "stretch-rashi",         label: "Semitic Stretch Rashi",            file: "SemiticStretchRashi.ttf",
    stretchable: new Set([...BASE_CPS, 0x05D1, 0x05D7, 0x05D8, 0x05D9, 0x05DA, 0x05DB, 0x05E3, 0x05E4, 0x05E7]) },
  // Source fonts (no widening variants)
  { id: "frank-ruhl-src",        label: "Frank Ruhl (source)",              file: "FrankRuhlLibre.ttf" },
  { id: "noto-sans-heb-src",     label: "Noto Sans Hebrew (source)",        file: "NotoSansHebrew.ttf" },
  { id: "noto-serif-heb-src",    label: "Noto Serif Hebrew (source)",       file: "NotoSerifHebrew.ttf" },
  { id: "gladia-src",            label: "Gladia CLM (source)",              file: "GladiaCLM-Bold.ttf" },
];

// A letter in a script — codepoint, short name matching the build-script
// glyph naming, and the character for the chip display.
type LetterEntry = { cp: number; name: string; ch: string };

// Hebrew letters. `name` must match the build-script's letter name so we
// can find the widened variant `{name}_s{N}` by glyph-name lookup.
const HEBREW_LETTERS: LetterEntry[] = [
  { cp: 0x05D0, name: "aleph",      ch: "א" },
  { cp: 0x05D1, name: "bet",        ch: "ב" },
  { cp: 0x05D2, name: "gimel",      ch: "ג" },
  { cp: 0x05D3, name: "dalet",      ch: "ד" },
  { cp: 0x05D4, name: "he",         ch: "ה" },
  { cp: 0x05D5, name: "vav",        ch: "ו" },
  { cp: 0x05D6, name: "zayin",      ch: "ז" },
  { cp: 0x05D7, name: "het",        ch: "ח" },
  { cp: 0x05D8, name: "tet",        ch: "ט" },
  { cp: 0x05D9, name: "yod",        ch: "י" },
  { cp: 0x05DA, name: "finalkaf",   ch: "ך" },
  { cp: 0x05DB, name: "kaf",        ch: "כ" },
  { cp: 0x05DC, name: "lamed",      ch: "ל" },
  { cp: 0x05DD, name: "finalmem",   ch: "ם" },
  { cp: 0x05DE, name: "mem",        ch: "מ" },
  { cp: 0x05DF, name: "finalnun",   ch: "ן" },
  { cp: 0x05E0, name: "nun",        ch: "נ" },
  { cp: 0x05E1, name: "samekh",     ch: "ס" },
  { cp: 0x05E2, name: "ayin",       ch: "ע" },
  { cp: 0x05E3, name: "finalpe",    ch: "ף" },
  { cp: 0x05E4, name: "pe",         ch: "פ" },
  { cp: 0x05E5, name: "finaltsadi", ch: "ץ" },
  { cp: 0x05E6, name: "tzade",      ch: "צ" },
  { cp: 0x05E7, name: "qof",        ch: "ק" },
  { cp: 0x05E8, name: "resh",       ch: "ר" },
  { cp: 0x05E9, name: "shin",       ch: "ש" },
  { cp: 0x05EA, name: "tav",        ch: "ת" },
];

// Syriac letters, in Unicode alphabetical order. Names match the
// build-script (alaph, beth, gamal, dalath, he, waw, ..., taw).
const SYRIAC_LETTERS: LetterEntry[] = [
  { cp: 0x0710, name: "alaph",   ch: "ܐ" },
  { cp: 0x0712, name: "beth",    ch: "ܒ" },
  { cp: 0x0713, name: "gamal",   ch: "ܓ" },
  { cp: 0x0715, name: "dalath",  ch: "ܕ" },
  { cp: 0x0717, name: "he",      ch: "ܗ" },
  { cp: 0x0718, name: "waw",     ch: "ܘ" },
  { cp: 0x0719, name: "zayn",    ch: "ܙ" },
  { cp: 0x071A, name: "heth",    ch: "ܚ" },
  { cp: 0x071B, name: "teth",    ch: "ܛ" },
  { cp: 0x071D, name: "yodh",    ch: "ܝ" },
  { cp: 0x071F, name: "kaph",    ch: "ܟ" },
  { cp: 0x0720, name: "lamadh",  ch: "ܠ" },
  { cp: 0x0721, name: "mim",     ch: "ܡ" },
  { cp: 0x0722, name: "nun",     ch: "ܢ" },
  { cp: 0x0723, name: "semkath", ch: "ܣ" },
  { cp: 0x0725, name: "e",       ch: "ܥ" },
  { cp: 0x0726, name: "pe",      ch: "ܦ" },
  { cp: 0x0728, name: "sadhe",   ch: "ܨ" },
  { cp: 0x0729, name: "qaph",    ch: "ܩ" },
  { cp: 0x072A, name: "rish",    ch: "ܪ" },
  { cp: 0x072B, name: "shin",    ch: "ܫ" },
  { cp: 0x072C, name: "taw",     ch: "ܬ" },
];

// Assyrian fonts — stretch derivatives + source counterparts. Noto Sans
// Syriac ships in source form only (widening abandoned after positional-
// form geometry proved too complex to tune per-letter).
const SYRIAC_FONTS: FontEntry[] = [
  { id: "ramsina",       label: "Semitic Stretch Ramsina",             file: "SemiticStretchRamsina.ttf",
    stretchable: new Set([0x0710, 0x0712, 0x0713, 0x0717, 0x071A, 0x071B, 0x071F, 0x0720, 0x0722, 0x0725, 0x0726, 0x072C]) },
  { id: "noto-sans",     label: "Noto Sans Syriac",                    file: "NotoSansSyriac.ttf" },
  { id: "nohadra-sapna", label: "Semitic Stretch Nohadra Sapna",       file: "SemiticStretchNohadraSapna.ttf",
    stretchable: new Set([0x0710, 0x0712, 0x0715, 0x0717, 0x0718, 0x0721, 0x0723, 0x072A, 0x072B, 0x072C]) },
  { id: "nohadra-amedia",label: "Semitic Stretch Nohadra Amedia",      file: "SemiticStretchNohadraAmedia.ttf",
    stretchable: new Set([0x0710, 0x0712, 0x0715, 0x0717, 0x0718, 0x0721, 0x0723, 0x072A, 0x072B, 0x072C]) },
  { id: "ramsina-src",   label: "Ramsina (source)",                    file: "Ramsina-Regular.ttf" },
  { id: "nohadra-sapna-src", label: "Nohadra Sapna (source)",          file: "NohadraSyriacSapna.ttf" },
];

// Which scripts the anatomy tool supports. Each script defines its own
// letter set, font list, default codepoint, and stretch-trigger char.
// A script that has positional forms (cursive Syriac) also shows the
// init/medi/fina toggle.
type ScriptEntry = {
  id: "hebrew" | "syriac";
  label: string;
  letters: LetterEntry[];
  fonts: FontEntry[];
  defaultCp: number;
  stretchTrigger: string;
  hasPositionalForms: boolean;
  chipFontFamily: string;
};
const SCRIPTS: ScriptEntry[] = [
  { id: "hebrew",  label: "Hebrew",           letters: HEBREW_LETTERS, fonts: FONTS,
    defaultCp: 0x05E2, stretchTrigger: "׆", hasPositionalForms: false,
    chipFontFamily: "'Frank Ruhl Libre', serif" },
  { id: "syriac", label: "Assyrian", letters: SYRIAC_LETTERS, fonts: SYRIAC_FONTS,
    defaultCp: 0x0715, stretchTrigger: "܍", hasPositionalForms: true,
    chipFontFamily: "'Estrangelo Edessa', 'Noto Sans Syriac', serif" },
];

// Positional forms a cursive Syriac letter can take. Isolated = no
// suffix; the other three append to the glyph name (uni0712 →
// uni0712.init, beth_s3 → beth.init_s3). Not every letter has all four
// — right-joining letters only have isolated and .fina.
type PositionalForm = "isol" | "init" | "medi" | "fina";
const POSITIONAL_FORMS: Array<{ id: PositionalForm; label: string; description: string }> = [
  { id: "isol", label: "isolated", description: "Standalone letter, no joining neighbours" },
  { id: "init", label: "initial",  description: "First letter of a joining run (joins to next)" },
  { id: "medi", label: "medial",   description: "Middle of a joining run (joins both sides)" },
  { id: "fina", label: "final",    description: "End of a joining run (joins to previous)" },
];

// A rainbow of contour colours. Contour 0 is charcoal so the outer body
// reads as the "letter"; sub-contours get accent hues so they pop.
const CONTOUR_COLOURS = [
  "#1f2937", // 0: outer body
  "#dc2626", // 1: red
  "#059669", // 2: emerald
  "#7c3aed", // 3: violet
  "#d97706", // 4: amber
  "#0891b2", // 5: cyan
];

// Preset swatches shown next to the custom colour picker for one-click
// contour tinting.
const COLOUR_SWATCHES = [
  "#1f2937", "#dc2626", "#059669", "#7c3aed", "#d97706", "#0891b2",
  "#111827", "#f43f5e", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4",
  "#0ea5e9", "#a855f7", "#eab308", "#22c55e", "#ef4444", "#e11d48",
];

// U+05C6 is the Hebrew widening trigger — legacy per-script constant
// kept for the small stretch preview strip below the anatomy canvas.
// The active script's trigger is chosen dynamically inside the component.
const HEBREW_STRETCH_TRIG = "׆";

// Cache a parsed opentype.js Font per file. Keyed by file path since the
// stretch font might get re-uploaded during dev — a manual reload will
// bypass the cache via Ctrl-Shift-R.
type FontObj = { unitsPerEm: number; glyphs: { length: number; get(i: number): unknown }; charToGlyph(s: string): unknown };
const fontCache = new Map<string, FontObj>();

async function loadFont(file: string): Promise<FontObj> {
  const cached = fontCache.get(file);
  if (cached) return cached;
  const opentype = await import("opentype.js");
  const buf = await (await fetch(`/fonts/${file}`)).arrayBuffer();
  const font = opentype.parse(buf) as unknown as FontObj;
  fontCache.set(file, font);
  return font;
}

// Cache extracted geometry per (file, lookup-key). The lookup key is
// `cp:${cp}` for base glyphs or `name:${name}` for stretched variants.
type GlyphCache = Map<string, Glyph>;
const glyphCaches = new Map<string, GlyphCache>();

// Convert an opentype.js Glyph object into our Glyph struct with
// raw contour points (preserving on/off-curve flags — those are how
// TrueType encodes quadratic Bezier corners).
//
// opentype.js gotcha: TrueType glyphs are LAZY-parsed. `.points` is
// only populated on first access to `.path` (see line 3815 in
// opentype.js:  parseGlyph is called from inside the path lazy getter).
// If we read `.points` before touching `.path`, it comes back undefined
// and we fall through to `getPath()` — which returns SVG-convention
// y-DOWN commands (opentype.js:3491, `p.moveTo(x, y + -cmd.y)`). Result:
// the glyph rendered upside-down. Force the lazy parse first, then
// read `.points` in raw y-up TTF space. `.path.commands` are also
// y-up (only getPath negates), which is what our fallback uses.
function extractGlyph(font: FontObj, otGlyph: unknown): Glyph {
  const g = otGlyph as {
    points?: Array<{ x: number; y: number; onCurve: boolean; lastPointOfContour?: boolean }>;
    path: { commands: Array<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }> };
    getBoundingBox: () => { x1: number; y1: number; x2: number; y2: number };
    advanceWidth?: number;
    name?: string;
    unicode?: number;
  };
  // Trigger the lazy path parse — this populates g.points as a side
  // effect for simple TrueType glyphs. `pathCmds` is our y-up fallback
  // for composite glyphs or any glyph that skipped points population.
  const pathCmds = g.path.commands;
  const raw = g.points;
  const contours: Contour[] = [];
  if (raw && raw.length) {
    let current: Pt[] = [];
    for (const p of raw) {
      current.push({ x: p.x, y: p.y, onCurve: !!p.onCurve });
      if (p.lastPointOfContour) {
        contours.push(current);
        current = [];
      }
    }
    if (current.length) contours.push(current);
  } else {
    // Fallback: walk .path.commands (y-up TTF coords — getPath is what
    // negates for SVG, .path.commands do NOT).
    let current: Pt[] = [];
    for (const cmd of pathCmds) {
      if (cmd.type === "M") {
        if (current.length) contours.push(current);
        current = [{ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true }];
      } else if (cmd.type === "L") {
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "Q") {
        current.push({ x: cmd.x1 ?? 0, y: cmd.y1 ?? 0, onCurve: false });
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "C") {
        current.push({ x: cmd.x1 ?? 0, y: cmd.y1 ?? 0, onCurve: false });
        current.push({ x: cmd.x2 ?? 0, y: cmd.y2 ?? 0, onCurve: false });
        current.push({ x: cmd.x ?? 0, y: cmd.y ?? 0, onCurve: true });
      } else if (cmd.type === "Z") {
        if (current.length) contours.push(current);
        current = [];
      }
    }
    if (current.length) contours.push(current);
  }
  const bounds = g.getBoundingBox();
  return {
    name: g.name ?? "",
    contours,
    bounds: { xMin: bounds.x1, yMin: bounds.y1, xMax: bounds.x2, yMax: bounds.y2 },
    upem: font.unitsPerEm,
    advance: g.advanceWidth ?? bounds.x2,
  };
}

async function loadGlyphByCp(file: string, cp: number): Promise<Glyph | null> {
  let cache = glyphCaches.get(file);
  if (!cache) { cache = new Map(); glyphCaches.set(file, cache); }
  const key = `cp:${cp}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const font = await loadFont(file);
  const otGlyph = font.charToGlyph(String.fromCodePoint(cp));
  if (!otGlyph) return null;
  const g = extractGlyph(font, otGlyph);
  cache.set(key, g);
  return g;
}

async function loadGlyphByName(file: string, name: string): Promise<Glyph | null> {
  let cache = glyphCaches.get(file);
  if (!cache) { cache = new Map(); glyphCaches.set(file, cache); }
  const key = `name:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const font = await loadFont(file);
  for (let i = 0; i < font.glyphs.length; i++) {
    const otG = font.glyphs.get(i) as { name?: string };
    if (otG?.name === name) {
      const g = extractGlyph(font, otG);
      cache.set(key, g);
      return g;
    }
  }
  return null;
}

// Load a font for CSS use so we can render live stretch previews with
// the real GSUB shaping. Family names are stamped per mount to defeat
// FontFace registry cache the same way stretch-debug does.
function useLoadStretchFontFace(fontFile: string, familyBase: string): { ready: boolean; family: string } {
  const [state, setState] = useState<{ ready: boolean; family: string }>({
    ready: false,
    family: familyBase,
  });
  useEffect(() => {
    const stamp = Date.now();
    const family = `${familyBase}_${stamp}`;
    const face = new FontFace(
      family,
      `url(/fonts/${fontFile}?v=${stamp}) format("truetype")`,
      { display: "block", unicodeRange: "U+0000-10FFFF" },
    );
    let cancelled = false;
    face.load().then((loaded) => {
      if (cancelled) return;
      document.fonts.add(loaded);
      setState({ ready: true, family });
    }).catch(() => {
      if (!cancelled) setState({ ready: true, family });
    });
    return () => { cancelled = true; document.fonts.delete(face); };
  }, [fontFile, familyBase]);
  return state;
}

export function LetterAnatomy() {
  // Read URL query params on mount so `?script=assyrian&font=ramsina&
  // letter=alaph` deep-links directly to a specific view. Params are
  // resolved against the script/font/letter tables; unknown values fall
  // back to sensible defaults. `assyrian` and `syriac` both map to the
  // same script id ("syriac" internally — kept because the letter data
  // is Syriac-script codepoints; UI label is "Assyrian").
  const initial = (() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return {
      script: p.get("script"),
      font: p.get("font"),
      letter: p.get("letter"),
    };
  })();
  const initialScript: "hebrew" | "syriac" = (() => {
    const s = initial?.script?.toLowerCase();
    if (s === "assyrian" || s === "syriac") return "syriac";
    if (s === "hebrew") return "hebrew";
    return "hebrew";
  })();
  const initialScriptDef = SCRIPTS.find((s) => s.id === initialScript)!;
  const initialFontIdx = (() => {
    const f = initial?.font?.toLowerCase();
    if (!f) return 0;
    const idx = initialScriptDef.fonts.findIndex(
      (fnt) => fnt.id.toLowerCase() === f || fnt.id.toLowerCase().endsWith("-" + f),
    );
    return idx >= 0 ? idx : 0;
  })();
  const initialCp = (() => {
    const l = initial?.letter?.toLowerCase();
    if (!l) return initialScriptDef.defaultCp;
    const match = initialScriptDef.letters.find(
      (L) => L.name.toLowerCase() === l || L.ch === l,
    );
    return match ? match.cp : initialScriptDef.defaultCp;
  })();

  // Script selector — Hebrew (default) or Assyrian. Switching scripts
  // resets the codepoint and font picker to the new script's defaults
  // so we never point at a glyph the wrong font doesn't have.
  const [scriptId, setScriptId] = useState<"hebrew" | "syriac">(initialScript);
  const script = SCRIPTS.find((s) => s.id === scriptId)!;
  // Positional-form toggle. Only meaningful for cursive Assyrian; ignored
  // for Hebrew (which has no init/medi/fina). Resets to isolated on
  // script switch.
  const [positionalForm, setPositionalForm] = useState<PositionalForm>("isol");
  // Font + codepoint pickers. Defaults come from the active script or
  // from URL params if provided.
  const [fontIdx, setFontIdx] = useState(initialFontIdx);
  const [cp, setCp] = useState(initialCp);
  const [stretchLevel, setStretchLevel] = useState(0);
  // Reset dependent pickers when script changes.
  const switchScript = (id: "hebrew" | "syriac") => {
    if (id === scriptId) return;
    const next = SCRIPTS.find((s) => s.id === id)!;
    setScriptId(id);
    setFontIdx(0);
    setCp(next.defaultCp);
    setStretchLevel(0);
    setPositionalForm("isol");
  };

  // Preview strip state — populated below after `cur` and `posSuffix` are
  // in scope.
  const [previewGlyphs, setPreviewGlyphs] = useState<(Glyph | null)[]>([]);

  // Reflect current selection back into the URL so it can be bookmarked
  // or shared. Uses replaceState — no navigation, no re-render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("script", scriptId === "syriac" ? "assyrian" : scriptId);
    const fontEntry = script.fonts[fontIdx];
    if (fontEntry) {
      // Strip a common prefix if present so URLs read "ramsina" not
      // "syr-stretch-ramsina" (backwards-compatible with our older ids).
      const slug = fontEntry.id.replace(/^syr-(stretch-)?/, "");
      params.set("font", slug);
    }
    const letterEntry = script.letters.find((L) => L.cp === cp);
    if (letterEntry) params.set("letter", letterEntry.name);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
  }, [scriptId, fontIdx, cp, script.fonts, script.letters]);

  // Loaded glyph geometry.
  const [glyph, setGlyph] = useState<Glyph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Partition preview sliders.
  const [xCutoff, setXCutoff] = useState<number | null>(null);
  const [barBottom, setBarBottom] = useState<number | null>(null);
  const [barTop, setBarTop] = useState<number | null>(null);
  const [showPointIndices, setShowPointIndices] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<{ ci: number; pi: number } | null>(null);

  // Contour selection + colour overrides. Clicking a contour selects
  // it; the sidebar exposes a colour picker + preset swatches.
  const [selectedContour, setSelectedContour] = useState<number | null>(null);
  const [contourColours, setContourColours] = useState<Record<number, string>>({});
  // Free-text labels per contour (e.g. "leading", "lower left"). Rendered
  // on the canvas near the contour's centroid when labels are toggled on.
  const [contourLabels, setContourLabels] = useState<Record<number, string>>({});
  const [showContourLabels, setShowContourLabels] = useState(true);
  // Per-contour translation (dx, dy) — lets you drag whole contours in
  // the "move contour" mode; also editable numerically in the sidebar.
  const [contourTranslations, setContourTranslations] = useState<Record<number, { dx: number; dy: number }>>({});
  // Per-point overrides (key = "ci-pi"), stored as absolute NEW (x,y).
  // Anything unlisted uses the natural coord from the loaded glyph.
  const [pointOverrides, setPointOverrides] = useState<Record<string, { x: number; y: number }>>({});
  // The currently-selected individual point — used for the sidebar edit
  // panel and highlighted on the canvas.
  const [selectedPoint, setSelectedPoint] = useState<{ ci: number; pi: number } | null>(null);
  // Interaction mode. "pan" keeps the old behaviour (drag pans the view,
  // click a contour to select). "contour" drags the whole selected
  // contour. "point" drags an individual point.
  const [dragMode, setDragMode] = useState<"pan" | "contour" | "point">("pan");
  // "Show original" overlays the natural, pre-edit paths and points as
  // a translucent ghost so you can see where things WERE relative to
  // your modifications.
  const [showOriginal, setShowOriginal] = useState(false);
  // Active drag target while the mouse is down in edit modes.
  const editDragRef = useRef<
    | { kind: "contour"; ci: number; startDx: number; startDy: number; startX: number; startY: number }
    | { kind: "point"; ci: number; pi: number; startX: number; startY: number; startOx: number; startOy: number }
    | null
  >(null);

  // View state — viewBox we maintain manually so wheel-zoom can zoom
  // around the cursor and drag can pan smoothly.
  type ViewBox = { x: number; y: number; w: number; h: number };
  const [view, setView] = useState<ViewBox | null>(null);
  const [baseView, setBaseView] = useState<ViewBox | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; startView: ViewBox; didMove: boolean } | null>(null);
  // Set true at mouseup when a pan actually moved. Persists until the
  // next mousedown so the click that follows a drag can be suppressed —
  // without this, releasing a pan over a contour would also select it.
  const wasPanningRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const cur = script.letters.find((l) => l.cp === cp);
  // Syriac positional-form suffix (empty for Hebrew or isolated).
  const posSuffix = script.hasPositionalForms && positionalForm !== "isol"
    ? `.${positionalForm}`
    : "";
  const glyphName = cur
    ? stretchLevel > 0
      ? `${cur.name}${posSuffix}_s${stretchLevel}`
      : `${cur.name}${posSuffix}`
    : "";

  // Live stretch font for the small text preview below the anatomy view.
  const { ready: cssFontReady, family: cssFontFamily } = useLoadStretchFontFace(
    script.fonts[fontIdx]?.file ?? script.fonts[0].file,
    `LA_StretchPreview_${scriptId}`,
  );

  // Preview strip: load all 17 widened variants for the current letter ×
  // form directly by glyph name, so we can render each as SVG. Bypasses
  // HarfBuzz shaping — for positional forms we'd need a ZWJ between
  // letter and triggers to force init/medi shaping, but that ZWJ then
  // breaks the widening ligature match.
  useEffect(() => {
    if (!cur) return;
    let cancelled = false;
    const file = script.fonts[fontIdx]?.file ?? script.fonts[0].file;
    const load = async () => {
      const out: (Glyph | null)[] = [];
      for (let n = 0; n <= 16; n++) {
        let name: string;
        if (n === 0) {
          if (posSuffix) {
            const cpHex = cp.toString(16).toUpperCase().padStart(4, "0");
            name = `uni${cpHex}${posSuffix}`;
          } else {
            const g = await loadGlyphByCp(file, cp);
            out.push(g);
            continue;
          }
        } else {
          name = `${cur.name}${posSuffix}_s${n}`;
        }
        try {
          const g = await loadGlyphByName(file, name);
          out.push(g);
        } catch {
          out.push(null);
        }
      }
      if (!cancelled) setPreviewGlyphs(out);
    };
    load();
    return () => { cancelled = true; };
  }, [cur, cp, posSuffix, fontIdx, script.fonts]);

  // Fit-to-glyph viewBox using the standard OpenType idiom: viewBox is
  // in flipped coords (y increases downward), then the content group
  // uses `scale(1, -1)` so the original font-up geometry renders upright.
  const computeBaseView = useCallback((g: Glyph): ViewBox => {
    const pad = 100;
    return {
      x: g.bounds.xMin - pad,
      y: -(g.bounds.yMax) - pad,
      w: (g.bounds.xMax - g.bounds.xMin) + 2 * pad,
      h: (g.bounds.yMax - g.bounds.yMin) + 2 * pad,
    };
  }, []);

  // Load whenever picker changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const file = script.fonts[fontIdx]?.file ?? script.fonts[0].file;
    // Load path:
    //   - stretched (level>0): always by glyph name — includes any positional suffix
    //   - base + isolated: by codepoint (works for every font that maps cp)
    //   - base + positional (Syriac only): by name uni{XXXX}{.init/.medi/.fina}
    let promise: Promise<Glyph | null>;
    if (stretchLevel > 0 && cur) {
      promise = loadGlyphByName(file, `${cur.name}${posSuffix}_s${stretchLevel}`);
    } else if (posSuffix) {
      const cpHex = cp.toString(16).toUpperCase().padStart(4, "0");
      promise = loadGlyphByName(file, `uni${cpHex}${posSuffix}`);
    } else {
      promise = loadGlyphByCp(file, cp);
    }
    promise
      .then((g) => {
        if (cancelled) return;
        setGlyph(g);
        if (g) {
          setXCutoff(Math.round((g.bounds.xMin + g.bounds.xMax) / 2));
          setBarBottom(g.bounds.yMin);
          setBarTop(g.bounds.yMax);
          const bv = computeBaseView(g);
          setBaseView(bv);
          setView(bv);
          setSelectedContour(null);
          setSelectedPoint(null);
          setContourColours({});
          setContourLabels({});
          setContourTranslations({});
          setPointOverrides({});
        } else {
          const cpHex = cp.toString(16).toUpperCase();
          setError(
            stretchLevel > 0
              ? `no glyph named ${cur?.name}${posSuffix}_s${stretchLevel} in this font`
              : posSuffix
                ? `no positional variant uni${cpHex.padStart(4, "0")}${posSuffix} in this font`
                : `no glyph for U+${cpHex}`,
          );
        }
      })
      .catch((e) => { console.error(e); if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scriptId, fontIdx, cp, stretchLevel, cur, posSuffix, script.fonts, computeBaseView]);

  // Reset view to the fit-to-glyph baseline.
  const resetView = useCallback(() => {
    if (baseView) setView(baseView);
  }, [baseView]);

  // Convert a client mouse event to viewBox coordinates. Uses the SVG's
  // getBoundingClientRect + current view so we can zoom around the
  // cursor's actual position.
  const clientToView = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!view || !svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      // preserveAspectRatio="xMidYMid meet" means the viewBox may be
      // scaled with letterboxing. Compute the effective drawing area.
      const scale = Math.min(rect.width / view.w, rect.height / view.h);
      const drawnW = view.w * scale;
      const drawnH = view.h * scale;
      const offsetX = (rect.width - drawnW) / 2;
      const offsetY = (rect.height - drawnH) / 2;
      const localX = clientX - rect.left - offsetX;
      const localY = clientY - rect.top - offsetY;
      return {
        x: view.x + localX / scale,
        y: view.y + localY / scale,
      };
    },
    [view],
  );

  // Wheel-to-zoom around cursor. Uses a native listener with
  // {passive:false} so we can preventDefault (React's synthetic wheel
  // is passive by default and can't cancel page scroll).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!view) return;
      e.preventDefault();
      const cursor = clientToView(e.clientX, e.clientY);
      if (!cursor) return;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      setView({
        x: cursor.x - (cursor.x - view.x) * factor,
        y: cursor.y - (cursor.y - view.y) * factor,
        w: view.w * factor,
        h: view.h * factor,
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [view, clientToView]);

  // Drag-to-pan. We defer setting `isPanning` until the mouse actually
  // moves, so a plain click on a contour still fires the select handler.
  const onSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!view) return;
    // left button only
    if (e.button !== 0) return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startView: view,
      didMove: false,
    };
    // Fresh interaction — allow the eventual click to select. (This
    // flag was set by the previous drag's mouseup, and we clear it
    // here so it doesn't leak past a single click's worth of
    // suppression.)
    wasPanningRef.current = false;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // 1) Edit drags (contour / point) take priority over pan.
      const ed = editDragRef.current;
      if (ed && svgRef.current && view) {
        const rect = svgRef.current.getBoundingClientRect();
        const scale = Math.min(rect.width / view.w, rect.height / view.h);
        const dxScreen = e.clientX - ed.startX;
        const dyScreen = e.clientY - ed.startY;
        // Screen-y is inverted vs font-y (we render inside scale(1,-1)).
        // Divide by scale to convert screen pixels → viewBox units.
        const dxFont = dxScreen / scale;
        const dyFont = -dyScreen / scale;
        if (ed.kind === "contour") {
          setContourTranslations((t) => ({
            ...t,
            [ed.ci]: {
              dx: Math.round(ed.startDx + dxFont),
              dy: Math.round(ed.startDy + dyFont),
            },
          }));
        } else {
          // point drag
          const key = `${ed.ci}-${ed.pi}`;
          setPointOverrides((o) => ({
            ...o,
            [key]: {
              x: Math.round(ed.startOx + dxFont),
              y: Math.round(ed.startOy + dyFont),
            },
          }));
        }
        return;
      }
      // 2) Pan drag (view mode default).
      const p = panRef.current;
      if (!p || !svgRef.current || !view) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!p.didMove && Math.hypot(dx, dy) < 4) return;
      p.didMove = true;
      setIsPanning(true);
      const rect = svgRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / p.startView.w, rect.height / p.startView.h);
      setView({
        x: p.startView.x - dx / scale,
        y: p.startView.y - dy / scale,
        w: p.startView.w,
        h: p.startView.h,
      });
    };
    const onUp = () => {
      // Suppress the click that follows a drag so it doesn't also fire
      // the selection handler on release. Same logic for edit drags.
      if (panRef.current?.didMove || editDragRef.current) wasPanningRef.current = true;
      panRef.current = null;
      editDragRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [view]);

  // Return the EFFECTIVE (x, y) for a point: natural coord + any
  // per-point override + the containing contour's translation. Used by
  // both path rendering and point rendering so a drag / numeric edit is
  // reflected everywhere at once.
  const effectivePt = useCallback(
    (ci: number, pi: number, natural: Pt): Pt => {
      const t = contourTranslations[ci];
      const o = pointOverrides[`${ci}-${pi}`];
      const bx = o?.x ?? natural.x;
      const by = o?.y ?? natural.y;
      return {
        x: bx + (t?.dx ?? 0),
        y: by + (t?.dy ?? 0),
        onCurve: natural.onCurve,
      };
    },
    [contourTranslations, pointOverrides],
  );

  // Build an SVG path from the contour points. Uses TrueType quadratic
  // semantics — pairs of off-curve points get an implicit ON-curve at
  // their midpoint. Rebuilds whenever translations or point overrides
  // change so drags update in real-time.
  const contourPaths: string[] = useMemo(() => {
    if (!glyph) return [];
    return glyph.contours.map((ctr, ci) => {
      if (!ctr.length) return "";
      const eff = ctr.map((p, pi) => effectivePt(ci, pi, p));
      let firstOn = eff[0].onCurve ? eff[0] : null;
      if (!firstOn) {
        const last = eff[eff.length - 1];
        if (last.onCurve) firstOn = last;
        else firstOn = { x: (eff[0].x + last.x) / 2, y: (eff[0].y + last.y) / 2, onCurve: true };
      }
      const parts: string[] = [`M ${firstOn.x} ${firstOn.y}`];
      for (let i = 0; i < eff.length; i++) {
        const cur2 = eff[i];
        const nxt = eff[(i + 1) % eff.length];
        if (cur2.onCurve) {
          if (nxt.onCurve) parts.push(`L ${nxt.x} ${nxt.y}`);
          continue;
        }
        const endpoint = nxt.onCurve ? nxt : { x: (cur2.x + nxt.x) / 2, y: (cur2.y + nxt.y) / 2 };
        parts.push(`Q ${cur2.x} ${cur2.y} ${endpoint.x} ${endpoint.y}`);
      }
      parts.push("Z");
      return parts.join(" ");
    });
  }, [glyph, effectivePt]);

  // Natural (pre-override) contour paths — rebuilt only when the glyph
  // changes, since these DON'T reflect user edits. Rendered as a
  // translucent underlay when "show original" is on.
  const naturalPaths: string[] = useMemo(() => {
    if (!glyph) return [];
    return glyph.contours.map((ctr) => {
      if (!ctr.length) return "";
      let firstOn = ctr[0].onCurve ? ctr[0] : null;
      if (!firstOn) {
        const last = ctr[ctr.length - 1];
        if (last.onCurve) firstOn = last;
        else firstOn = { x: (ctr[0].x + last.x) / 2, y: (ctr[0].y + last.y) / 2, onCurve: true };
      }
      const parts: string[] = [`M ${firstOn.x} ${firstOn.y}`];
      for (let i = 0; i < ctr.length; i++) {
        const cur2 = ctr[i];
        const nxt = ctr[(i + 1) % ctr.length];
        if (cur2.onCurve) {
          if (nxt.onCurve) parts.push(`L ${nxt.x} ${nxt.y}`);
          continue;
        }
        const endpoint = nxt.onCurve ? nxt : { x: (cur2.x + nxt.x) / 2, y: (cur2.y + nxt.y) / 2 };
        parts.push(`Q ${cur2.x} ${cur2.y} ${endpoint.x} ${endpoint.y}`);
      }
      parts.push("Z");
      return parts.join(" ");
    });
  }, [glyph]);

  // Centroid of each contour's EFFECTIVE points — used to place the
  // free-text section label when labels are toggled on.
  const contourCentroids: Array<{ x: number; y: number }> = useMemo(() => {
    if (!glyph) return [];
    return glyph.contours.map((ctr, ci) => {
      if (!ctr.length) return { x: 0, y: 0 };
      const eff = ctr.map((p, pi) => effectivePt(ci, pi, p));
      const sx = eff.reduce((a, p) => a + p.x, 0);
      const sy = eff.reduce((a, p) => a + p.y, 0);
      return { x: sx / eff.length, y: sy / eff.length };
    });
  }, [glyph, effectivePt]);

  // Classify each point by which INFIX partition it lands on.
  const partitionOf = (x: number, y: number): "shift" | "keep" | "outside" => {
    if (xCutoff === null || barBottom === null || barTop === null) return "outside";
    const inYRange = y >= barBottom && y <= barTop;
    if (!inYRange) return "keep";
    if (x < xCutoff) return "shift";
    return "keep";
  };

  const colourFor = (ci: number): string =>
    contourColours[ci] ?? CONTOUR_COLOURS[ci % CONTOUR_COLOURS.length];

  // Zoom controls used by the +/− buttons — same math as wheel but
  // centred on the viewBox centre.
  const zoomStep = (factor: number) => {
    if (!view) return;
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    setView({
      x: cx - (cx - view.x) * factor,
      y: cy - (cy - view.y) * factor,
      w: view.w * factor,
      h: view.h * factor,
    });
  };

  // Zoom % relative to base view — handy readout so it's clear how
  // deep we are.
  const zoomPct = view && baseView ? Math.round((baseView.w / view.w) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Script tabs */}
      <section className="bg-white border border-neutral-200 rounded-lg p-3">
        <div role="tablist" aria-label="Script" className="flex flex-wrap gap-1">
          {SCRIPTS.map((s) => {
            const active = s.id === scriptId;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => switchScript(s.id)}
                className={`px-4 py-1.5 rounded text-sm border transition ${
                  active
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                {s.label}
              </button>
            );
          })}
          {script.hasPositionalForms && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">form</span>
              <div role="tablist" aria-label="Positional form" className="flex gap-1">
                {POSITIONAL_FORMS.map((f) => {
                  const active = f.id === positionalForm;
                  return (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPositionalForm(f.id)}
                      title={f.description}
                      className={`px-3 py-1 rounded text-xs border transition ${
                        active
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Font + codepoint pickers */}
      <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-neutral-600">font</span>
            <select
              value={fontIdx}
              onChange={(e) => setFontIdx(parseInt(e.target.value, 10))}
              className="border border-neutral-300 rounded px-2 py-1 text-sm"
            >
              {script.fonts.map((f, i) => (
                <option key={f.id} value={i}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-neutral-600">stretch</span>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={stretchLevel}
              onChange={(e) => setStretchLevel(parseInt(e.target.value, 10))}
              className="w-40"
              disabled={script.fonts[fontIdx]?.stretchable === undefined}
            />
            <span className="w-14 tabular-nums text-neutral-500 text-xs">
              s{stretchLevel}
            </span>
          </label>
          <div className="ml-auto text-xs text-neutral-500">
            {loading ? "loading…" : glyph ? (
              <>
                <span className="font-mono">{glyph.name || glyphName}</span> —{" "}
                {glyph.contours.length} contours,{" "}
                {glyph.contours.reduce((s, c) => s + c.length, 0)} pts, upem={glyph.upem},
                bounds=({glyph.bounds.xMin},{glyph.bounds.yMin})..({glyph.bounds.xMax},{glyph.bounds.yMax})
              </>
            ) : (
              <span>no glyph</span>
            )}
            {error ? <span className="ml-3 text-red-600">error: {error}</span> : null}
          </div>
        </div>
        {/* Letter grid — click to select. Letters without a widening
            variant in the currently-loaded font are dimmed. RTL-scripts
            (Assyrian, Hebrew) render right-to-left so alaph lands in
            the upper-right — matches how native readers scan. */}
        <div
          dir="rtl"
          className={`grid gap-1 ${
            script.letters.length > 20 ? "grid-cols-9" : "grid-cols-11"
          }`}
        >
          {script.letters.map((L) => {
            const stretchable = script.fonts[fontIdx]?.stretchable;
            const hasStretch = !stretchable || stretchable.has(L.cp);
            return (
              <button
                key={L.cp}
                onClick={() => setCp(L.cp)}
                className={`text-2xl px-2 py-1 rounded border transition ${
                  cp === L.cp
                    ? "border-neutral-900 bg-neutral-100"
                    : hasStretch
                    ? "border-neutral-200 hover:bg-neutral-50"
                    : "border-neutral-100 bg-neutral-50 text-neutral-300"
                }`}
                title={
                  hasStretch
                    ? `${L.name} (U+${L.cp.toString(16).toUpperCase()})`
                    : `${L.name} — no widening variant in this font`
                }
              >
                <span style={{ fontFamily: script.chipFontFamily }}>{L.ch}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Partition sliders */}
      {glyph ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            INFIX partition preview
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">x_cutoff</span>
              <input
                type="range"
                min={glyph.bounds.xMin - 50}
                max={glyph.bounds.xMax + 50}
                step={1}
                value={xCutoff ?? 0}
                onChange={(e) => setXCutoff(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">{xCutoff}</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">bar_bot</span>
              <input
                type="range"
                min={glyph.bounds.yMin - 100}
                max={glyph.bounds.yMax + 100}
                step={1}
                value={barBottom ?? 0}
                onChange={(e) => setBarBottom(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">{barBottom}</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 text-neutral-600">bar_top</span>
              <input
                type="range"
                min={glyph.bounds.yMin - 100}
                max={glyph.bounds.yMax + 100}
                step={1}
                value={barTop ?? 0}
                onChange={(e) => setBarTop(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="w-14 text-right tabular-nums font-mono text-neutral-500">{barTop}</span>
            </label>
          </div>
          <div className="flex items-center gap-4 text-xs pt-2">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showPointIndices}
                onChange={(e) => setShowPointIndices(e.target.checked)}
              />
              <span>show point indices</span>
            </label>
            <span className="ml-auto text-neutral-500">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1 align-middle" />
              shift (stays via mono)
              <span className="inline-block w-3 h-3 rounded-full bg-rose-500 ml-4 mr-1 align-middle" />
              keep (translates right)
            </span>
          </div>
        </section>
      ) : null}

      {/* Canvas + point list */}
      {glyph && view ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* SVG canvas */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                <button
                  onClick={() => zoomStep(1 / 1.25)}
                  className="border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-50"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => zoomStep(1.25)}
                  className="border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-50"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={resetView}
                  className="border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-50"
                  title="Reset view"
                >
                  fit
                </button>
                <span className="tabular-nums text-neutral-500 ml-1">{zoomPct}%</span>
                {/* Interaction mode selector */}
                <div className="ml-3 flex rounded border border-neutral-300 overflow-hidden">
                  {(["pan", "contour", "point"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDragMode(m)}
                      className={`px-2 py-1 ${
                        dragMode === m
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                      title={
                        m === "pan"
                          ? "Pan/zoom the view"
                          : m === "contour"
                          ? "Drag whole contours"
                          : "Drag individual points"
                      }
                    >
                      {m === "pan" ? "pan" : m === "contour" ? "move shape" : "move pt"}
                    </button>
                  ))}
                </div>
                <label className="ml-3 flex items-center gap-1 text-neutral-600">
                  <input
                    type="checkbox"
                    checked={showContourLabels}
                    onChange={(e) => setShowContourLabels(e.target.checked)}
                  />
                  <span>labels</span>
                </label>
                <label className="ml-3 flex items-center gap-1 text-neutral-600">
                  <input
                    type="checkbox"
                    checked={showOriginal}
                    onChange={(e) => setShowOriginal(e.target.checked)}
                  />
                  <span>show original</span>
                </label>
                <span className="ml-auto text-neutral-500">
                  {dragMode === "pan"
                    ? "scroll = zoom · drag = pan · click a contour to select"
                    : dragMode === "contour"
                    ? "drag any contour to translate it · click to select"
                    : "drag any point to move it · click to select"}
                </span>
              </div>
              <svg
                ref={svgRef}
                viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
                className={`border border-neutral-200 bg-neutral-50 rounded w-full ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                style={{ aspectRatio: "5 / 4", display: "block", touchAction: "none" }}
                preserveAspectRatio="xMidYMid meet"
                onMouseDown={onSvgMouseDown}
              >
                <g transform="scale(1, -1)">
                  {/* Baseline (y=0) */}
                  <line
                    x1={-1e5}
                    x2={1e5}
                    y1={0}
                    y2={0}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  {barBottom !== null ? (
                    <line
                      x1={-1e5}
                      x2={1e5}
                      y1={barBottom}
                      y2={barBottom}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {barTop !== null ? (
                    <line
                      x1={-1e5}
                      x2={1e5}
                      y1={barTop}
                      y2={barTop}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {xCutoff !== null ? (
                    <line
                      x1={xCutoff}
                      x2={xCutoff}
                      y1={-1e5}
                      y2={1e5}
                      stroke="#ec4899"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {/* Show-original overlay: translucent ghost of the
                      pre-edit paths and points, drawn UNDER the live
                      shapes so the live ones stay clickable. */}
                  {showOriginal ? (
                    <g style={{ pointerEvents: "none" }}>
                      {glyph.contours.map((_, i) => (
                        <path
                          key={`orig-${i}`}
                          d={naturalPaths[i]}
                          fill="none"
                          stroke={colourFor(i)}
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          strokeOpacity={0.55}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                      {glyph.contours.flatMap((ctr, ci) =>
                        ctr.map((pt, pi) => {
                          const rBase = view.w / 120;
                          const r = rBase * 0.6;
                          return pt.onCurve ? (
                            <circle
                              key={`orig-p-${ci}-${pi}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={r}
                              fill="none"
                              stroke={colourFor(ci)}
                              strokeOpacity={0.6}
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                            />
                          ) : (
                            <rect
                              key={`orig-p-${ci}-${pi}`}
                              x={pt.x - r}
                              y={pt.y - r}
                              width={r * 2}
                              height={r * 2}
                              fill="none"
                              stroke={colourFor(ci)}
                              strokeOpacity={0.6}
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                            />
                          );
                        })
                      )}
                    </g>
                  ) : null}
                  {/* Each contour: fill + stroke. Click to select. */}
                  {glyph.contours.map((_, i) => {
                    const colour = colourFor(i);
                    const isSelected = selectedContour === i;
                    return (
                      <path
                        key={`c-${i}`}
                        d={contourPaths[i]}
                        fill={colour}
                        fillOpacity={isSelected ? 0.35 : 0.15}
                        stroke={colour}
                        strokeWidth={isSelected ? 3 : 1.5}
                        vectorEffect="non-scaling-stroke"
                        style={{ cursor: dragMode === "contour" ? "move" : "pointer" }}
                        onMouseDown={(e) => {
                          // In "contour" edit mode, mousedown on a contour
                          // starts a drag on IT — pre-empt the pan drag by
                          // stamping editDragRef before the pan handler
                          // reads it.
                          if (dragMode !== "contour") return;
                          e.stopPropagation();
                          const t = contourTranslations[i] ?? { dx: 0, dy: 0 };
                          editDragRef.current = {
                            kind: "contour", ci: i,
                            startDx: t.dx, startDy: t.dy,
                            startX: e.clientX, startY: e.clientY,
                          };
                          setSelectedContour(i);
                          setSelectedPoint(null);
                          wasPanningRef.current = false;
                        }}
                        onClick={(e) => {
                          // If we just finished a drag (pan OR edit),
                          // ignore the click so we don't also toggle
                          // selection.
                          if (wasPanningRef.current) return;
                          e.stopPropagation();
                          setSelectedContour((s) => (s === i ? null : i));
                          setSelectedPoint(null);
                        }}
                      />
                    );
                  })}
                  {/* Contour section labels (leading / lower-left / etc.). */}
                  {showContourLabels
                    ? glyph.contours.map((_, i) => {
                        const label = contourLabels[i];
                        if (!label) return null;
                        const c = contourCentroids[i];
                        const rBase = view.w / 120;
                        return (
                          <text
                            key={`lab-${i}`}
                            x={c.x}
                            y={c.y}
                            fontSize={rBase * 4}
                            fill={colourFor(i)}
                            fontFamily="ui-sans-serif, system-ui, sans-serif"
                            fontWeight={600}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ pointerEvents: "none" }}
                            transform={`scale(1, -1) translate(0, ${-2 * c.y})`}
                          >
                            {label}
                          </text>
                        );
                      })
                    : null}
                  {/* Points */}
                  {(() => {
                    let flatIdx = 0;
                    return glyph.contours.flatMap((ctr, ci) => {
                      const colour = colourFor(ci);
                      return ctr.map((rawPt, pi) => {
                        const pt = effectivePt(ci, pi, rawPt);
                        const part = partitionOf(pt.x, pt.y);
                        const fill = part === "shift" ? "#3b82f6" : part === "keep" ? "#ef4444" : "#a3a3a3";
                        const stroke = pt.onCurve ? colour : "#000";
                        const idx = flatIdx++;
                        const hovered = hoverPoint?.ci === ci && hoverPoint?.pi === pi;
                        const isSelectedPt = selectedPoint?.ci === ci && selectedPoint?.pi === pi;
                        const rBase = view.w / 120; // ≈ 7px at fit
                        const r = hovered || isSelectedPt ? rBase * 1.7 : rBase;
                        const cursorStyle = dragMode === "point" ? "move" : "default";
                        const onPtMouseDown = (e: React.MouseEvent) => {
                          if (dragMode !== "point") return;
                          e.stopPropagation();
                          editDragRef.current = {
                            kind: "point", ci, pi,
                            startX: e.clientX, startY: e.clientY,
                            startOx: pt.x - (contourTranslations[ci]?.dx ?? 0),
                            startOy: pt.y - (contourTranslations[ci]?.dy ?? 0),
                          };
                          setSelectedPoint({ ci, pi });
                          setSelectedContour(ci);
                          wasPanningRef.current = false;
                        };
                        const onPtClick = (e: React.MouseEvent) => {
                          if (wasPanningRef.current) return;
                          e.stopPropagation();
                          setSelectedPoint((s) => (s?.ci === ci && s?.pi === pi ? null : { ci, pi }));
                        };
                        return (
                          <g
                            key={`${ci}-${pi}`}
                            onMouseEnter={() => setHoverPoint({ ci, pi })}
                            onMouseLeave={() =>
                              setHoverPoint((h) => (h?.ci === ci && h?.pi === pi ? null : h))
                            }
                          >
                            {pt.onCurve ? (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={r}
                                fill={fill}
                                stroke={isSelectedPt ? "#000" : stroke}
                                strokeWidth={isSelectedPt ? 4 : hovered ? 3 : 1.5}
                                vectorEffect="non-scaling-stroke"
                                style={{ cursor: cursorStyle }}
                                onMouseDown={onPtMouseDown}
                                onClick={onPtClick}
                              />
                            ) : (
                              <rect
                                x={pt.x - r}
                                y={pt.y - r}
                                width={r * 2}
                                height={r * 2}
                                fill={fill}
                                stroke={isSelectedPt ? "#000" : stroke}
                                strokeWidth={isSelectedPt ? 4 : hovered ? 3 : 1.5}
                                vectorEffect="non-scaling-stroke"
                                style={{ cursor: cursorStyle }}
                                onMouseDown={onPtMouseDown}
                                onClick={onPtClick}
                              />
                            )}
                            {showPointIndices ? (
                              <text
                                x={pt.x + r * 2}
                                y={pt.y + r * 0.7}
                                fontSize={rBase * 3}
                                fill={colour}
                                fontFamily="ui-monospace, monospace"
                                style={{ pointerEvents: "none" }}
                                transform={`scale(1, -1) translate(0, ${-2 * pt.y})`}
                              >
                                {idx}
                              </text>
                            ) : null}
                          </g>
                        );
                      });
                    });
                  })()}
                </g>
              </svg>
            </div>

            {/* Right side: hover info + per-contour list + selection panel */}
            <aside className="w-full lg:w-72 shrink-0 space-y-4 text-sm">
              <div className="border border-neutral-200 rounded p-3">
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">hover</div>
                {hoverPoint && glyph.contours[hoverPoint.ci] ? (
                  (() => {
                    const p = glyph.contours[hoverPoint.ci][hoverPoint.pi];
                    let idx = 0;
                    for (let c = 0; c < hoverPoint.ci; c++) idx += glyph.contours[c].length;
                    idx += hoverPoint.pi;
                    return (
                      <div className="font-mono text-xs space-y-0.5">
                        <div>index {idx}</div>
                        <div>contour {hoverPoint.ci}, point {hoverPoint.pi}</div>
                        <div>({p.x}, {p.y})</div>
                        <div>{p.onCurve ? "ON-curve" : "off-curve"}</div>
                        <div>
                          partition:{" "}
                          <span className={
                            partitionOf(p.x, p.y) === "shift" ? "text-blue-600" :
                            partitionOf(p.x, p.y) === "keep" ? "text-rose-600" :
                            "text-neutral-500"
                          }>
                            {partitionOf(p.x, p.y)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-xs text-neutral-500">hover a point to see details</div>
                )}
              </div>

              <div className="border border-neutral-200 rounded p-3">
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  contours · label + translation
                </div>
                <ul className="text-xs font-mono space-y-2">
                  {glyph.contours.map((ctr, ci) => {
                    const xs = ctr.map((p) => p.x);
                    const ys = ctr.map((p) => p.y);
                    const isSel = selectedContour === ci;
                    const t = contourTranslations[ci] ?? { dx: 0, dy: 0 };
                    return (
                      <li key={ci} className={`rounded ${isSel ? "ring-1 ring-neutral-900" : ""}`}>
                        <button
                          onClick={() => setSelectedContour((s) => (s === ci ? null : ci))}
                          className={`w-full flex items-center gap-2 text-left px-1 py-0.5 rounded ${
                            isSel ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
                          }`}
                        >
                          <span
                            className="inline-block w-3 h-3 rounded shrink-0"
                            style={{ background: colourFor(ci) }}
                          />
                          <span>
                            {ci}: {ctr.length} pts, x=[{Math.min(...xs)},{Math.max(...xs)}], y=[{Math.min(...ys)},{Math.max(...ys)}]
                          </span>
                        </button>
                        <div className="px-1 pb-1 pt-1 space-y-1">
                          <input
                            type="text"
                            value={contourLabels[ci] ?? ""}
                            onChange={(e) =>
                              setContourLabels((L) => ({ ...L, [ci]: e.target.value }))
                            }
                            placeholder={`label (e.g. "leading")`}
                            className="w-full font-sans text-xs border border-neutral-300 rounded px-2 py-0.5"
                          />
                          <div className="flex items-center gap-1">
                            <span className="w-4 text-neutral-500">Δx</span>
                            <input
                              type="number"
                              value={t.dx}
                              onChange={(e) => {
                                const v = parseInt(e.target.value || "0", 10);
                                setContourTranslations((c) => ({ ...c, [ci]: { dx: v, dy: t.dy } }));
                              }}
                              className="w-16 tabular-nums text-xs border border-neutral-300 rounded px-1 py-0.5"
                            />
                            <span className="w-4 text-neutral-500">Δy</span>
                            <input
                              type="number"
                              value={t.dy}
                              onChange={(e) => {
                                const v = parseInt(e.target.value || "0", 10);
                                setContourTranslations((c) => ({ ...c, [ci]: { dx: t.dx, dy: v } }));
                              }}
                              className="w-16 tabular-nums text-xs border border-neutral-300 rounded px-1 py-0.5"
                            />
                            {(t.dx !== 0 || t.dy !== 0) ? (
                              <button
                                onClick={() =>
                                  setContourTranslations((c) => {
                                    const cp2 = { ...c };
                                    delete cp2[ci];
                                    return cp2;
                                  })
                                }
                                className="ml-auto text-[10px] text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-1.5 py-0.5"
                                title="Reset translation"
                              >
                                reset
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Selected-point edit panel: numeric x/y for the currently
                  selected control point (click one in "pan"/"point" mode
                  to select). Any change is reflected everywhere. */}
              {selectedPoint && glyph.contours[selectedPoint.ci]?.[selectedPoint.pi] ? (
                (() => {
                  const { ci, pi } = selectedPoint;
                  const key = `${ci}-${pi}`;
                  const natural = glyph.contours[ci][pi];
                  const override = pointOverrides[key];
                  // Show the raw override, not effective — user typed y is
                  // pre-translation. Applying is the same thing.
                  const shownX = override?.x ?? natural.x;
                  const shownY = override?.y ?? natural.y;
                  let flatIdx = 0;
                  for (let c = 0; c < ci; c++) flatIdx += glyph.contours[c].length;
                  flatIdx += pi;
                  return (
                    <div className="border border-neutral-200 rounded p-3">
                      <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                        point #{flatIdx} · c{ci} · p{pi}
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-xs">
                        <span className="w-4 text-neutral-500">x</span>
                        <input
                          type="number"
                          value={shownX}
                          onChange={(e) => {
                            const v = parseInt(e.target.value || "0", 10);
                            setPointOverrides((o) => ({ ...o, [key]: { x: v, y: shownY } }));
                          }}
                          className="flex-1 tabular-nums font-mono text-xs border border-neutral-300 rounded px-2 py-1"
                        />
                        <span className="w-4 text-neutral-500">y</span>
                        <input
                          type="number"
                          value={shownY}
                          onChange={(e) => {
                            const v = parseInt(e.target.value || "0", 10);
                            setPointOverrides((o) => ({ ...o, [key]: { x: shownX, y: v } }));
                          }}
                          className="flex-1 tabular-nums font-mono text-xs border border-neutral-300 rounded px-2 py-1"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <span>natural: ({natural.x}, {natural.y})</span>
                        {override ? (
                          <button
                            onClick={() =>
                              setPointOverrides((o) => {
                                const c = { ...o };
                                delete c[key];
                                return c;
                              })
                            }
                            className="ml-auto text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-0.5"
                          >
                            reset
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              ) : null}

              {/* Selection / colouring panel */}
              {selectedContour !== null ? (
                <div className="border border-neutral-200 rounded p-3">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                    contour {selectedContour} colour
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={colourFor(selectedContour)}
                      onChange={(e) =>
                        setContourColours((c) => ({ ...c, [selectedContour]: e.target.value }))
                      }
                      className="w-10 h-8 border border-neutral-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colourFor(selectedContour)}
                      onChange={(e) =>
                        setContourColours((c) => ({ ...c, [selectedContour]: e.target.value }))
                      }
                      className="flex-1 font-mono text-xs border border-neutral-300 rounded px-2 py-1"
                    />
                    <button
                      onClick={() =>
                        setContourColours((c) => {
                          const cp2 = { ...c };
                          delete cp2[selectedContour];
                          return cp2;
                        })
                      }
                      className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1"
                      title="Restore default palette colour"
                    >
                      reset
                    </button>
                  </div>
                  <div className="grid grid-cols-9 gap-1">
                    {COLOUR_SWATCHES.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setContourColours((c) => ({ ...c, [selectedContour]: s }))
                        }
                        className="w-6 h-6 rounded border border-neutral-300 hover:scale-110 transition"
                        style={{ background: s }}
                        title={s}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {cur ? (
                <div className="border border-neutral-200 rounded p-3">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">letter</div>
                  <div className="font-mono text-xs space-y-0.5">
                    <div>{cur.name}{stretchLevel > 0 ? ` · s${stretchLevel}` : ""}</div>
                    <div>U+{cp.toString(16).toUpperCase()}</div>
                    <div className="text-4xl mt-1" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
                      {cur.ch}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Changes log — everything the user has modified in this
                  session, with a copyable snippet for the point-overrides
                  (paste directly into the build-script config). */}
              {glyph ? (() => {
                const overrideEntries = Object.entries(pointOverrides);
                const labelEntries = Object.entries(contourLabels).filter(([, v]) => v);
                const colourEntries = Object.entries(contourColours);
                const transEntries = Object.entries(contourTranslations).filter(
                  ([, v]) => v && (v.dx !== 0 || v.dy !== 0),
                );
                const nothing =
                  overrideEntries.length + labelEntries.length +
                  colourEntries.length + transEntries.length === 0;
                // Build a Python-dict snippet for point_overrides_by_variant
                // targeting whatever variant we're viewing. Absolute
                // post-mono coords, one entry per overridden point.
                let snippet = "";
                if (overrideEntries.length > 0 && cur) {
                  // Convert (ci, pi) → flat point index.
                  const contourStarts: number[] = [0];
                  for (let c = 0; c < glyph.contours.length - 1; c++) {
                    contourStarts.push(contourStarts[c] + glyph.contours[c].length);
                  }
                  const parts = overrideEntries.map(([k, v]) => {
                    const [ciStr, piStr] = k.split("-");
                    const ci = parseInt(ciStr, 10);
                    const pi = parseInt(piStr, 10);
                    const flat = contourStarts[ci] + pi;
                    return `${flat}: (${v.x}, ${v.y})`;
                  });
                  snippet = `# aleph config → point_overrides_by_variant:\n${stretchLevel}: {${parts.join(", ")}},`;
                }
                return (
                  <div className="border border-neutral-200 rounded p-3">
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                      changes log
                    </div>
                    {nothing ? (
                      <div className="text-xs text-neutral-500">
                        no changes yet · drag a point / edit a translation / add a label
                      </div>
                    ) : (
                      <ul className="text-[11px] font-mono space-y-0.5 max-h-64 overflow-y-auto">
                        {labelEntries.map(([ci, label]) => (
                          <li key={`lab-${ci}`}>
                            <span style={{ color: colourFor(parseInt(ci, 10)) }}>C{ci}</span>{" "}
                            label = "{label}"
                          </li>
                        ))}
                        {colourEntries.map(([ci, col]) => (
                          <li key={`col-${ci}`}>
                            <span style={{ color: colourFor(parseInt(ci, 10)) }}>C{ci}</span>{" "}
                            colour = {col}
                          </li>
                        ))}
                        {transEntries.map(([ci, t]) => (
                          <li key={`t-${ci}`}>
                            <span style={{ color: colourFor(parseInt(ci, 10)) }}>C{ci}</span>{" "}
                            Δ = ({t.dx}, {t.dy})
                          </li>
                        ))}
                        {overrideEntries.map(([k, v]) => {
                          const [ciStr, piStr] = k.split("-");
                          const ci = parseInt(ciStr, 10);
                          const pi = parseInt(piStr, 10);
                          const nat = glyph.contours[ci]?.[pi];
                          // Flat point index for readability.
                          let flat = 0;
                          for (let c = 0; c < ci; c++) flat += glyph.contours[c].length;
                          flat += pi;
                          return (
                            <li key={`o-${k}`}>
                              <span style={{ color: colourFor(ci) }}>pt #{flat}</span>{" "}
                              (C{ci} P{pi}):{" "}
                              {nat ? `(${nat.x},${nat.y})` : "?"} → ({v.x},{v.y})
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {snippet ? (
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                          copy-paste for build-script:
                        </div>
                        <pre className="text-[10px] leading-tight bg-neutral-50 border border-neutral-200 rounded p-1 whitespace-pre-wrap break-all">
{snippet}
                        </pre>
                        <button
                          onClick={() => navigator.clipboard?.writeText(snippet)}
                          className="text-[10px] text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded px-2 py-0.5"
                        >
                          copy snippet
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })() : null}
            </aside>
          </div>
        </section>
      ) : null}

      {/* Live stretch preview strip — renders each widened variant
          directly from the font's glyph table (by name), so the strip
          reflects the SELECTED positional form (isolated/init/medi/fina)
          accurately. HarfBuzz text shaping can't produce this cleanly:
          for positional forms we'd need a ZWJ between letter and triggers,
          but that ZWJ then breaks the widening ligature. Direct SVG
          rendering bypasses both issues. */}
      {cur ? (
        <section className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-wider text-neutral-500">
            <span>
              stretch preview — {cur.name}
              {posSuffix ? <span className="font-mono">{posSuffix}</span> : null}
            </span>
            <span className="font-mono lowercase tracking-normal text-neutral-400">
              click a level to jump the anatomy view there
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 overflow-x-auto">
            {Array.from({ length: 17 }, (_, n) => {
              const g = previewGlyphs[n];
              const active = stretchLevel === n;
              // Fixed cell size — all variants render into the same box
              // so wider ones extend beyond and get clipped, giving a
              // visual sense of how much the letter grows at each level.
              const PREVIEW_W = 96;
              const PREVIEW_H = 96;
              return (
                <button
                  key={n}
                  onClick={() => setStretchLevel(n)}
                  className={`p-1 rounded ${
                    active
                      ? "bg-amber-100 ring-1 ring-amber-400"
                      : "hover:bg-neutral-100"
                  }`}
                  title={`s${n}${g ? "" : " (glyph not built)"}`}
                >
                  <div style={{ width: PREVIEW_W, height: PREVIEW_H }} className="flex items-end justify-end">
                    {g ? (() => {
                      const pad = 40;
                      const gw = g.bounds.xMax - g.bounds.xMin;
                      const gh = g.bounds.yMax - g.bounds.yMin;
                      const upem = g.upem || 1000;
                      // Scale so the base isolated form fits the cell;
                      // widened variants (with larger gw) will extend
                      // beyond the visible area — that's the point.
                      const scale = PREVIEW_H / (upem * 0.9);
                      const path = g.contours.map((c) => {
                        let d = "";
                        c.forEach((p, i) => {
                          d += (i === 0 ? "M" : "L") + p.x + " " + (-p.y);
                        });
                        return d + "Z";
                      }).join(" ");
                      // Right-align so widening extends leftward (RTL)
                      const originX = PREVIEW_W - pad;
                      const originY = PREVIEW_H - pad;
                      return (
                        <svg
                          width={PREVIEW_W}
                          height={PREVIEW_H}
                          viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
                          style={{ overflow: "visible" }}
                        >
                          <g
                            transform={`translate(${originX}, ${originY}) scale(${scale}) translate(${-g.bounds.xMax}, 0)`}
                          >
                            <path d={path} fill="#1f2937" fillRule="evenodd" />
                          </g>
                        </svg>
                      );
                    })() : (
                      <span className="text-[10px] text-neutral-300 font-mono">—</span>
                    )}
                  </div>
                  <span
                    className="block font-mono text-[10px] text-neutral-400 text-center mt-1"
                    style={{ fontFamily: "ui-monospace, monospace", fontSize: 10 }}
                  >
                    s{n}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
