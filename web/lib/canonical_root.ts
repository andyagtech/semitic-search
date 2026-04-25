// Map any Semitic-script root string ("ك ت ب", "כ-ת-ב", "ܟ ܬ ܒ", "ከ ተ በ"...)
// to a canonical phonetic key ("k t b") so we can look up the corresponding
// /roots/[slug] feature page. TypeScript port of src/semitic_search/canonical_root.py —
// keep in sync. We only need the common consonant mappings here, not the full
// transliteration (latin fallback etc.).

const AR: Record<string, string> = {
  "ا": "ʾ", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "g",
  "ح": "ḥ", "خ": "ḫ", "د": "d", "ذ": "ḏ", "ر": "r",
  "ز": "z", "س": "s", "ش": "š", "ص": "ṣ", "ض": "ḍ",
  "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "ġ", "ف": "f",
  "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ء": "ʾ",
  "أ": "ʾ", "إ": "ʾ", "آ": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
  "ى": "y", "ة": "h",
};

const HE: Record<string, string> = {
  "א": "ʾ", "ב": "b", "ג": "g", "ד": "d", "ה": "h",
  "ו": "w", "ז": "z", "ח": "ḥ", "ט": "ṭ", "י": "y",
  "כ": "k", "ך": "k", "ל": "l", "מ": "m", "ם": "m",
  "נ": "n", "ן": "n", "ס": "s", "ע": "ʿ", "פ": "f",
  "ף": "f", "צ": "ṣ", "ץ": "ṣ", "ק": "q", "ר": "r",
  "ש": "š", "ת": "t",
};

const SYC: Record<string, string> = {
  "ܐ": "ʾ", "ܒ": "b", "ܓ": "g", "ܕ": "d", "ܗ": "h",
  "ܘ": "w", "ܙ": "z", "ܚ": "ḥ", "ܛ": "ṭ", "ܝ": "y",
  "ܟ": "k", "ܠ": "l", "ܡ": "m", "ܢ": "n", "ܣ": "s",
  "ܥ": "ʿ", "ܦ": "f", "ܨ": "ṣ", "ܩ": "q", "ܪ": "r",
  "ܫ": "š", "ܬ": "t",
};

// Ethiopic: each row of 8 codepoints = one consonant (first-form).
const GEZ_ROWS: Array<[number, string]> = [
  [0x1200, "h"], [0x1208, "l"], [0x1210, "ḥ"], [0x1218, "m"],
  [0x1220, "ś"], [0x1228, "r"], [0x1230, "s"], [0x1238, "š"],
  [0x1240, "q"], [0x1260, "b"], [0x1270, "t"], [0x1278, "č"],
  [0x1280, "ḫ"], [0x1290, "n"], [0x12A0, "ʾ"], [0x12A8, "k"],
  [0x12C8, "w"], [0x12D0, "ʿ"], [0x12D8, "z"], [0x12E8, "y"],
  [0x12F0, "d"], [0x1308, "g"], [0x1320, "ṭ"], [0x1338, "ṣ"],
  [0x1348, "f"], [0x1350, "p"],
];

function charToPhoneme(ch: string): string | null {
  if (ch === "#") return "w";  // CAMeL's weak-slot marker
  if (AR[ch]) return AR[ch];
  if (HE[ch]) return HE[ch];
  if (SYC[ch]) return SYC[ch];
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1200 && cp <= 0x137A) {
    const rowStart = Math.floor((cp - 0x1200) / 8) * 8 + 0x1200;
    const hit = GEZ_ROWS.find(([s]) => s === rowStart);
    if (hit) return hit[1];
  }
  // Ugaritic / Phoenician / OSA: use the native character as its own phoneme
  // since we already normalize on the server side — a canonical fallback.
  if (cp >= 0x10380 && cp <= 0x1039D) return String.fromCodePoint(cp);
  if (cp >= 0x10900 && cp <= 0x10915) return String.fromCodePoint(cp);
  if (cp >= 0x10A60 && cp <= 0x10A7C) return String.fromCodePoint(cp);
  return null;
}

/** Return canonical phonetic key, or null if the root can't be mapped. */
export function canonical(root: string): string | null {
  const tokens = root.replace(/-/g, " ").split(/\s+/).filter(Boolean);
  const phonemes: string[] = [];
  for (const token of tokens) {
    for (const ch of token) {
      const p = charToPhoneme(ch);
      if (p) phonemes.push(p);
    }
  }
  if (phonemes.length < 2) return null;
  return phonemes.join(" ");
}

/** Turn a canonical key like "k t b" into the URL slug "k-t-b". */
export function canonicalSlug(root: string): string | null {
  const c = canonical(root);
  return c ? c.replace(/ /g, "-") : null;
}
