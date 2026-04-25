"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
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
    id: "hebrew", label: "Hebrew (square)", dir: "rtl",
    sample: "בְּרֵאשִׁית בָּרָא אֱלֹהִים",
    fonts: [
      { id: "sans",       label: "Noto Sans Hebrew",   file: "NotoSansHebrew.ttf", family: "FL_NotoSansHebrew" },
      { id: "serif",      label: "Noto Serif Hebrew",  file: "NotoSerifHebrew.ttf", family: "FL_NotoSerifHebrew",
        note: "stylistic sets ss01–ss20 + cv01–cv20 character variants" },
      { id: "frankruhl",  label: "Frank Ruhl Libre",   file: "FrankRuhlLibre.ttf", family: "FL_FrankRuhlLibre",
        note: "classical revival; cv01–cv22 character variants" },
      { id: "davidlibre", label: "David Libre",        file: "DavidLibre-Regular.ttf", family: "FL_DavidLibre",
        note: "digital revival of David; Jerusalem style" },
      { id: "heebo",      label: "Heebo",              file: "Heebo.ttf", family: "FL_Heebo",
        note: "modern Israeli sans" },
      { id: "assistant",  label: "Assistant",          file: "Assistant.ttf", family: "FL_Assistant",
        note: "SIL OFL modern sans" },
      { id: "alef",       label: "Alef",               file: "Alef-Regular.ttf", family: "FL_Alef",
        note: "modern Israeli geometric sans" },
      { id: "miriam",     label: "Miriam Libre",       file: "MiriamLibre-Regular.ttf", family: "FL_Miriam",
        note: "clean modern Hebrew sans" },
      { id: "stretch",    label: "Semitic Stretch Hebrew", file: "SemiticStretchHebrew.ttf", family: "FL_StretchHebrew",
        note: "custom derivative of Frank Ruhl Libre (OFL). Supports true kashida-like widening via +/- keys" },
      { id: "stretchketer", label: "Semitic Stretch Keter Aram Tsova", file: "SemiticStretchKeterAramTsova.ttf", family: "FL_StretchKeterAram",
        note: "custom derivative of Keter Aram Tsova (Culmus, GPL). Same kashida-like widening as Semitic Stretch Hebrew, but with Aleppo-codex letterforms" },
      { id: "taameyfrank",label: "Taamey Frank CLM",   file: "TaameyFrankCLM-Medium.ttf", family: "FL_TaameyFrank",
        note: "Culmus / Yoram Gnat (GPL). jalt + salt + niqqud + te'amim positioning" },
      { id: "keteryg",    label: "Keter YG",           file: "KeterYG-Medium.ttf", family: "FL_KeterYG",
        note: "Culmus (GPL). jalt + salt for proper wide forms" },
      { id: "keteram",    label: "Keter Aram Tsova",   file: "KeterAramTsova.ttf", family: "FL_KeterAram",
        note: "Culmus (GPL), scholarly. jalt + salt with Aleppo-codex letter shapes" },
      { id: "shofar",     label: "Shofar",             file: "ShofarRegular.ttf", family: "FL_Shofar",
        note: "Culmus (GPL). Karaitic-inspired; calt + jalt + salt" },
      { id: "rashi",      label: "Noto Rashi Hebrew",  file: "NotoRashiHebrew.ttf", family: "FL_NotoRashi",
        note: "semi-cursive, medieval commentary style" },
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
    id: "syriac", label: "Syriac", dir: "rtl",
    sample: "ܒܪܝܫܝܬ ܒܪܐ ܐܠܗܐ",
    fonts: [
      { id: "sans",  label: "Noto Sans Syriac",  file: "NotoSansSyriac.ttf", family: "FL_NotoSansSyriac" },
      { id: "serif", label: "Noto Serif Syriac (Estrangela-leaning)", file: "NotoSerifSyriac.ttf", family: "FL_NotoSerifSyriac" },
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
    id: "ethiopic", label: "Ethiopic (Ge'ez, Amharic, Tigrinya)", dir: "ltr",
    sample: "በስመ አብ ወወልድ",
    fonts: [
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

const DEFAULT_COLORS = [
  "#111827", "#dc2626", "#d97706", "#059669", "#2563eb",
  "#7c3aed", "#db2777", "#0891b2", "#65a30d", "#ea580c",
];

// --- Kashida / tatweel ----------------------------------------------------

const TATWEEL = "ـ";
// Our Hebrew-stretch trigger. U+05C6 (Hebrew Punctuation Nun Hafukha) is
// script=Hebrew, so browsers keep it in the same shaping run as surrounding
// Hebrew letters and our GSUB `liga` rule (letter + N × U+05C6 → letter_sN)
// actually fires. We previously used U+E010 (PUA) but browsers segment PUA
// into a separate script-Unknown run, which silently broke the substitution.
const HEBREW_STRETCH = "׆";

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
  // Syriac block (all letters in the basic Syriac range can generally accept
  // a following tatweel; Noto Syriac fonts render them as stretched joins)
  if (cp >= 0x0712 && cp <= 0x072F) return true;
  return false;
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
  hebrew: /[֑-ׇ]/g,          // niqqud + te'amim + cantillation
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

// Default landing state: Hebrew + our custom stretch font, with the ל in
// שלום already elongated (5 × U+E010 after ל) so first-time visitors
// immediately see what the tool does.
const DEFAULT_SCRIPT = "hebrew";
const DEFAULT_FONT = "stretch";
const DEFAULT_TEXT = "שָׁל" + HEBREW_STRETCH.repeat(5) + "וֹם";

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // The Hebrew stretch font supports a REAL kashida-style extender via
  // U+E010 insertion, indefinite widening. Other Hebrew fonts fall back
  // to per-letter jalt substitution.
  const hebrewStretchActive = script.id === "hebrew" && (font.id === "stretch" || font.id === "stretchketer");
  const supportsKashida = script.id === "arabic" || script.id === "syriac" || hebrewStretchActive;
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
    ensureFontLoaded(font.family, font.file).then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => { cancelled = true; };
  }, [font.family, font.file]);

  // Reset palette + wide-set when the cluster count changes.
  useEffect(() => {
    setColors(clusters.map((_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]));
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

    if (hebrewStretchActive) {
      const prevIsHebrew = /[֐-׿]/.test(prev);
      if (!prevIsHebrew && prev !== HEBREW_STRETCH) return;
      const updated = text.slice(0, pos) + HEBREW_STRETCH + text.slice(pos);
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
  }, [text, hebrewStretchActive]);

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
  }, [text, hebrewStretchActive]);

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

  return (
    <div>
      <section className="mb-4 bg-white border border-neutral-200 rounded-lg p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Script</span>
            <select
              className="mt-1 block w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
            >
              {SCRIPTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Font</span>
            <select
              className="mt-1 block w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
              value={fontId}
              onChange={(e) => setFontId(e.target.value)}
            >
              {script.fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}{f.note ? ` — ${f.note}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">Text</span>
          <div className="relative">
            <textarea
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
          {hebrewStretchActive && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <span className="text-neutral-500 uppercase tracking-wider">Arabic marks</span>
              {[
                { ch: "ّ", label: "shaddah" },
                { ch: "ً", label: "fathatan" },
                { ch: "ٌ", label: "dammatan" },
                { ch: "ٍ", label: "kasratan" },
              ].map(({ ch, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => insertAtCursor(ch)}
                  className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono font-semibold"
                  title={`Insert U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")} ${label} at the cursor — combining mark, attaches to the preceding Hebrew letter`}
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
            <span className="text-neutral-500 uppercase tracking-wider">Strip marks</span>
          </label>

          <span className="ml-auto text-xs text-neutral-500">
            {fontReady ? `loaded: ${font.label}` : "loading font…"}
          </span>
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
        <section className="bg-white border border-neutral-200 rounded-lg p-4">
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {clusters.map((g, i) => {
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
    </div>
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
