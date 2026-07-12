// Cross-script conversion for Semitic alphabets.
//
// All 22-letter Northwest Semitic abjads (Hebrew, Syriac, Phoenician /
// Paleo-Hebrew, Samaritan, Imperial Aramaic) share the same alphabet
// order and can be converted 1:1 by consonantal slot. Arabic keeps the
// same 22 core slots plus 6 that historically merged in NW Semitic
// (ṯ / ḏ / ḫ / ḍ / ẓ / ġ), and Ugaritic keeps ~30 including those.
//
// Conversion pipeline:
//   input glyph → common-slot ID (Latin transliteration letter)
//               → target glyph
//
// Warnings are emitted whenever the target script forces a merge
// (target has no equivalent slot) or when going from a 22-letter
// source to a richer target and picking one of several historical
// possibilities.

export type Script =
  | "he"        // Hebrew square (22 letters + 5 finals)
  | "syr"       // Syriac (22 letters, cursive)
  | "ar"        // Arabic (28 letters — 22 + 6 extras)
  | "eth"       // Ge'ez / Ethiopic syllabary (~28 consonants × 7 vowel orders)
  | "paleo"     // Phoenician / Paleo-Hebrew block (22 letters)
  | "samaritan" // Samaritan block (22 letters)
  | "aramaic"   // Imperial Aramaic block (22 letters)
  | "ugaritic"; // Ugaritic cuneiform (30 letters)

export const SCRIPT_LABELS: Record<Script, string> = {
  he: "Hebrew",
  syr: "Syriac",
  ar: "Arabic",
  eth: "Ethiopic (Ge'ez)",
  paleo: "Paleo-Hebrew / Phoenician",
  samaritan: "Samaritan",
  aramaic: "Imperial Aramaic",
  ugaritic: "Ugaritic",
};

// Living/modern scripts — shown first in the converter UI. Ancient
// scripts get grouped separately.
export const MODERN_SCRIPTS: Script[] = ["he", "syr", "ar", "eth"];
export const ANCIENT_SCRIPTS: Script[] = ["paleo", "samaritan", "aramaic", "ugaritic"];

// Common-Semitic slot IDs. The 22 core slots are the NW-Semitic abjad;
// the 6 extras (ṯ ḏ ḫ ḍ ẓ ġ) exist in Arabic + Ugaritic and were merged
// with their closest partner in Hebrew/Syriac/Aramaic/Phoenician.
export type Slot =
  | "ʾ" | "b" | "g" | "d" | "h" | "w" | "z" | "ḥ" | "ṭ" | "y"
  | "k" | "l" | "m" | "n" | "s" | "ʿ" | "p" | "ṣ" | "q" | "r"
  | "š" | "t"
  | "ṯ" | "ḏ" | "ḫ" | "ḍ" | "ẓ" | "ġ";

// Slot → glyph per script. Absent entries mean the script has no
// distinct symbol for this slot; see MERGE_TARGET for the fallback.
const SLOT_TO_GLYPH: Record<Script, Partial<Record<Slot, string>>> = {
  he: {
    "ʾ": "א", b: "ב", g: "ג", d: "ד", h: "ה", w: "ו", z: "ז", "ḥ": "ח",
    "ṭ": "ט", y: "י", k: "כ", l: "ל", m: "מ", n: "נ", s: "ס", "ʿ": "ע",
    p: "פ", "ṣ": "צ", q: "ק", r: "ר", "š": "ש", t: "ת",
  },
  syr: {
    "ʾ": "ܐ", b: "ܒ", g: "ܓ", d: "ܕ", h: "ܗ", w: "ܘ", z: "ܙ", "ḥ": "ܚ",
    "ṭ": "ܛ", y: "ܝ", k: "ܟ", l: "ܠ", m: "ܡ", n: "ܢ", s: "ܣ", "ʿ": "ܥ",
    p: "ܦ", "ṣ": "ܨ", q: "ܩ", r: "ܪ", "š": "ܫ", t: "ܬ",
  },
  ar: {
    "ʾ": "ا", b: "ب", g: "ج", d: "د", h: "ه", w: "و", z: "ز", "ḥ": "ح",
    "ṭ": "ط", y: "ي", k: "ك", l: "ل", m: "م", n: "ن", s: "س", "ʿ": "ع",
    p: "ف", "ṣ": "ص", q: "ق", r: "ر", "š": "ش", t: "ت",
    "ṯ": "ث", "ḏ": "ذ", "ḫ": "خ", "ḍ": "ض", "ẓ": "ظ", "ġ": "غ",
  },
  paleo: {
    "ʾ": "\u{10900}", b: "\u{10901}", g: "\u{10902}", d: "\u{10903}",
    h: "\u{10904}", w: "\u{10905}", z: "\u{10906}", "ḥ": "\u{10907}",
    "ṭ": "\u{10908}", y: "\u{10909}", k: "\u{1090A}", l: "\u{1090B}",
    m: "\u{1090C}", n: "\u{1090D}", s: "\u{1090E}", "ʿ": "\u{1090F}",
    p: "\u{10910}", "ṣ": "\u{10911}", q: "\u{10912}", r: "\u{10913}",
    "š": "\u{10914}", t: "\u{10915}",
  },
  samaritan: {
    "ʾ": "\u{0800}", b: "\u{0801}", g: "\u{0802}", d: "\u{0803}",
    h: "\u{0804}", w: "\u{0805}", z: "\u{0806}", "ḥ": "\u{0807}",
    "ṭ": "\u{0808}", y: "\u{0809}", k: "\u{080A}", l: "\u{080B}",
    m: "\u{080C}", n: "\u{080D}", s: "\u{080E}", "ʿ": "\u{080F}",
    p: "\u{0810}", "ṣ": "\u{0811}", q: "\u{0812}", r: "\u{0813}",
    "š": "\u{0814}", t: "\u{0815}",
  },
  aramaic: {
    "ʾ": "\u{10840}", b: "\u{10841}", g: "\u{10842}", d: "\u{10843}",
    h: "\u{10844}", w: "\u{10845}", z: "\u{10846}", "ḥ": "\u{10847}",
    "ṭ": "\u{10848}", y: "\u{10849}", k: "\u{1084A}", l: "\u{1084B}",
    m: "\u{1084C}", n: "\u{1084D}", s: "\u{1084E}", "ʿ": "\u{1084F}",
    p: "\u{10850}", "ṣ": "\u{10851}", q: "\u{10852}", r: "\u{10853}",
    "š": "\u{10854}", t: "\u{10855}",
  },
  ugaritic: {
    "ʾ": "\u{10380}", b: "\u{10381}", g: "\u{10382}", "ḫ": "\u{10383}",
    d: "\u{10384}", h: "\u{10385}", w: "\u{10386}", z: "\u{10387}",
    "ḥ": "\u{10388}", "ṭ": "\u{10389}", y: "\u{1038A}", k: "\u{1038B}",
    "š": "\u{1038C}", l: "\u{1038D}", m: "\u{1038E}", "ḏ": "\u{1038F}",
    n: "\u{10390}", "ẓ": "\u{10391}", s: "\u{10392}", "ʿ": "\u{10393}",
    p: "\u{10394}", "ṣ": "\u{10395}", q: "\u{10396}", r: "\u{10397}",
    "ṯ": "\u{10398}", "ġ": "\u{10399}", t: "\u{1039A}",
  },
  // Ge'ez / Ethiopic is a syllabary — each consonant has 7 vowel-order
  // fidels. We emit the 6th-order (ə) form to represent a "vowel-less"
  // consonant skeleton, which matches how Ethiopian Semiticists cite
  // consonant roots. Slot → 6th-order fidel; reverse lookup walks all
  // seven orders per series (see ETHIOPIC_SERIES).
  eth: {
    "ʾ": "እ",   // ETHIOPIC SYLLABLE GLOTTAL E   (U+12A5, from አ series)
    b: "ብ",     // ETHIOPIC SYLLABLE BE          (U+1265, from በ)
    g: "ግ",     // ETHIOPIC SYLLABLE GE          (U+130D, from ገ)
    d: "ድ",     // ETHIOPIC SYLLABLE DE          (U+12F5, from ደ)
    h: "ህ",     // ETHIOPIC SYLLABLE HE          (U+1205, from ሀ)
    w: "ው",     // ETHIOPIC SYLLABLE WE          (U+12CD, from ወ)
    z: "ዝ",     // ETHIOPIC SYLLABLE ZE          (U+12DD, from ዘ)
    "ḥ": "ሕ",   // ETHIOPIC SYLLABLE HHE         (U+1215, from ሐ)
    "ṭ": "ጥ",   // ETHIOPIC SYLLABLE THE         (U+1325, from ጠ)
    y: "ይ",     // ETHIOPIC SYLLABLE YE          (U+12ED, from የ)
    k: "ክ",     // ETHIOPIC SYLLABLE KE          (U+12AD, from ከ)
    l: "ል",     // ETHIOPIC SYLLABLE LE          (U+120D, from ለ)
    m: "ም",     // ETHIOPIC SYLLABLE ME          (U+121D, from መ)
    n: "ን",     // ETHIOPIC SYLLABLE NE          (U+1295, from ነ)
    s: "ስ",     // ETHIOPIC SYLLABLE SE          (U+1235, from ሰ)
    "ʿ": "ዕ",   // ETHIOPIC SYLLABLE PHARYNGEAL E (U+12ED, from ዐ)
    p: "ፍ",     // ETHIOPIC SYLLABLE FE          (U+134D, from ፈ; Ge'ez uses f for foreign p)
    "ṣ": "ጽ",   // ETHIOPIC SYLLABLE TSE         (U+133D, from ጸ)
    q: "ቅ",     // ETHIOPIC SYLLABLE QE          (U+1245, from ቀ)
    r: "ር",     // ETHIOPIC SYLLABLE RE          (U+122D, from ረ)
    "š": "ሽ",   // ETHIOPIC SYLLABLE SHE (Amharic) (U+123D, from ሸ)
    t: "ት",     // ETHIOPIC SYLLABLE TE          (U+1275, from ተ)
    // Ge'ez preserves ḫ (ኀ series) and ḍ (ፀ series) — like Ugaritic.
    "ḫ": "ኅ",   // ETHIOPIC SYLLABLE XE          (U+1285, from ኀ)
    "ḍ": "ፅ",   // ETHIOPIC SYLLABLE TZE         (U+1345, from ፀ)
    // ṯ, ḏ, ẓ, ġ merge — no independent series in Ge'ez.
  },
};

// Ethiopic reverse lookup: enumerate the 7 canonical fidels per
// consonant series so any character in the block resolves back to its
// slot. Series start = 1st-order (ä-vowel) code point.
const ETHIOPIC_SERIES: Array<{ slot: Slot; base: number }> = [
  { slot: "h",   base: 0x1200 },  // ሀ
  { slot: "l",   base: 0x1208 },  // ለ
  { slot: "ḥ",   base: 0x1210 },  // ሐ
  { slot: "m",   base: 0x1218 },  // መ
  { slot: "š",   base: 0x1220 },  // ሠ (Ge'ez śa, merged with š)
  { slot: "r",   base: 0x1228 },  // ረ
  { slot: "s",   base: 0x1230 },  // ሰ
  { slot: "š",   base: 0x1238 },  // ሸ (Amharic šä)
  { slot: "q",   base: 0x1240 },  // ቀ
  { slot: "b",   base: 0x1260 },  // በ
  { slot: "t",   base: 0x1270 },  // ተ
  { slot: "ḫ",   base: 0x1280 },  // ኀ
  { slot: "n",   base: 0x1290 },  // ነ
  { slot: "ʾ",   base: 0x12A0 },  // አ
  { slot: "k",   base: 0x12A8 },  // ከ
  { slot: "w",   base: 0x12C8 },  // ወ
  { slot: "ʿ",   base: 0x12D0 },  // ዐ
  { slot: "z",   base: 0x12D8 },  // ዘ
  { slot: "y",   base: 0x12E8 },  // የ
  { slot: "d",   base: 0x12F0 },  // ደ
  { slot: "g",   base: 0x1308 },  // ገ
  { slot: "ṭ",   base: 0x1320 },  // ጠ
  { slot: "ṣ",   base: 0x1338 },  // ጸ
  { slot: "ḍ",   base: 0x1340 },  // ፀ
  { slot: "p",   base: 0x1348 },  // ፈ (Ge'ez fä; treated as p for cross-script)
  { slot: "p",   base: 0x1350 },  // ፐ (labial pä — Amharic)
];

// Merge fallback for slots that don't exist in a target script.
const MERGE_TARGET: Record<Slot, Slot> = {
  "ʾ": "ʾ", b: "b", g: "g", d: "d", h: "h", w: "w", z: "z", "ḥ": "ḥ",
  "ṭ": "ṭ", y: "y", k: "k", l: "l", m: "m", n: "n", s: "s", "ʿ": "ʿ",
  p: "p", "ṣ": "ṣ", q: "q", r: "r", "š": "š", t: "t",
  "ṯ": "š", "ḏ": "z", "ḫ": "ḥ", "ḍ": "ṣ", "ẓ": "ṣ", "ġ": "ʿ",
};

// Inverse of SLOT_TO_GLYPH per script. Built once. For Ethiopic we
// also expand each consonant series across its 7 vowel-order fidels
// so any fidel resolves back to its consonant slot (the vowel is
// dropped during conversion).
const GLYPH_TO_SLOT: Record<Script, Record<string, Slot>> = (() => {
  const out = {} as Record<Script, Record<string, Slot>>;
  for (const script of Object.keys(SLOT_TO_GLYPH) as Script[]) {
    const m: Record<string, Slot> = {};
    for (const [slot, glyph] of Object.entries(SLOT_TO_GLYPH[script])) {
      if (glyph !== undefined) m[glyph] = slot as Slot;
    }
    out[script] = m;
  }
  // Ethiopic series expansion: base..base+6 → same slot.
  for (const { slot, base } of ETHIOPIC_SERIES) {
    for (let order = 0; order < 7; order++) {
      out.eth[String.fromCodePoint(base + order)] = slot;
    }
  }
  return out;
})();

// Hebrew final forms — collapsed to base for slot lookup, re-applied
// at word ends when target=he.
const HE_FINAL_TO_BASE: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};
const HE_BASE_TO_FINAL: Record<string, string> = {
  "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ",
};

// Ranges of combining marks stripped before slot lookup.
const STRIP_RANGES: Array<[number, number]> = [
  [0x0591, 0x05c7],
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06ed],
  [0x0730, 0x074a],
  [0x0816, 0x082d],
  [0x135d, 0x135f],  // Ethiopic combining marks
];
function stripMarks(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let strip = false;
    for (const [lo, hi] of STRIP_RANGES) {
      if (cp >= lo && cp <= hi) { strip = true; break; }
    }
    if (!strip) out.push(ch);
  }
  return out.join("");
}

function isWordBreak(ch: string | undefined): boolean {
  if (!ch) return true;
  return /[\s.,;:!?()\[\]{}"'׃־]/.test(ch);
}

// Ambiguity classes when converting from a 22-letter script to Arabic
// or Ugaritic: we pick the merge partner as default and surface a
// warning that the alternate(s) are historically possible.
const AMBIGUOUS_TO_RICH: Partial<Record<Script, Partial<Record<Slot, Slot[]>>>> = {
  ar: {
    "š": ["ṯ"], z: ["ḏ"], "ḥ": ["ḫ"], "ṣ": ["ḍ", "ẓ"], "ʿ": ["ġ"],
  },
  ugaritic: {
    "š": ["ṯ"], z: ["ḏ"], "ḥ": ["ḫ"], "ṣ": ["ḍ", "ẓ"], "ʿ": ["ġ"],
  },
};

export type ConvertResult = {
  output: string;
  warnings: string[];
};

export function convert(text: string, from: Script, to: Script): ConvertResult {
  if (from === to || !text) return { output: text, warnings: [] };

  const fromMap = GLYPH_TO_SLOT[from];
  const toGlyphs = SLOT_TO_GLYPH[to];
  const stripped = stripMarks(text);
  const chars = Array.from(stripped);
  const out: string[] = [];
  const warnings: string[] = [];
  const warnedMerges = new Set<string>();
  const warnedGuesses = new Set<string>();

  if (to === "eth" && from !== "eth") {
    warnings.push(
      "Ethiopic is a syllabary (every character carries a vowel); " +
      "used the 6th-order (ə) form as a consonant-skeleton placeholder. " +
      "Original vowels would need to be reconstructed for a natural reading.",
    );
  }

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const baseCh = from === "he" ? (HE_FINAL_TO_BASE[ch] ?? ch) : ch;
    const slot = fromMap[baseCh];
    if (slot === undefined) {
      out.push(ch);
      continue;
    }
    let targetSlot: Slot = slot;
    if (toGlyphs[targetSlot] === undefined) {
      const merged = MERGE_TARGET[targetSlot];
      if (merged !== targetSlot && !warnedMerges.has(targetSlot)) {
        warnedMerges.add(targetSlot);
        const srcGlyph = SLOT_TO_GLYPH.ar[targetSlot] ?? targetSlot;
        const mergedGlyph = toGlyphs[merged] ?? merged;
        warnings.push(
          `${SCRIPT_LABELS[to]} has no equivalent for ${srcGlyph} (${targetSlot}); ` +
          `merged with ${mergedGlyph} (${merged}) — lossy.`,
        );
      }
      targetSlot = merged;
    } else if (to === "ar" || to === "ugaritic") {
      const alt = AMBIGUOUS_TO_RICH[to]?.[targetSlot];
      if (alt && !warnedGuesses.has(targetSlot)) {
        warnedGuesses.add(targetSlot);
        const chosen = toGlyphs[targetSlot];
        const alts = alt.map((a) => toGlyphs[a] ?? a).join(" / ");
        warnings.push(
          `${SCRIPT_LABELS[from]} ${baseCh} → ${SCRIPT_LABELS[to]}: chose ${chosen}; ` +
          `historically could also be ${alts}.`,
        );
      }
    }
    let glyph = toGlyphs[targetSlot];
    if (!glyph) { out.push(ch); continue; }

    if (to === "he" && HE_BASE_TO_FINAL[glyph]) {
      if (isWordBreak(chars[i + 1])) glyph = HE_BASE_TO_FINAL[glyph];
    }
    out.push(glyph);
  }
  return { output: out.join(""), warnings };
}

// Best-effort script detection from a text sample. Returns the first
// script whose glyph range contains most of the letters.
export function detectScript(text: string): Script | null {
  const counts: Partial<Record<Script, number>> = {};
  const stripped = stripMarks(text);
  for (const ch of stripped) {
    for (const script of Object.keys(GLYPH_TO_SLOT) as Script[]) {
      if (GLYPH_TO_SLOT[script][ch] !== undefined) {
        counts[script] = (counts[script] ?? 0) + 1;
      }
    }
  }
  let best: Script | null = null;
  let bestCount = 0;
  for (const [script, n] of Object.entries(counts) as Array<[Script, number]>) {
    if (n > bestCount) { best = script; bestCount = n; }
  }
  return best;
}
