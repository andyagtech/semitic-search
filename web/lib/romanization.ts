// Romanization → native script for search input.
// TypeScript port of src/semitic_search/romanization.py — keep in sync.

export const BUCKWALTER_TO_ARABIC: Record<string, string> = {
  "'": "\u0621",
  "|": "\u0622",
  ">": "\u0623",
  "&": "\u0624",
  "<": "\u0625",
  "}": "\u0626",
  A: "\u0627",
  b: "\u0628",
  p: "\u0629",
  t: "\u062A",
  v: "\u062B",
  j: "\u062C",
  H: "\u062D",
  x: "\u062E",
  d: "\u062F",
  "*": "\u0630",
  r: "\u0631",
  z: "\u0632",
  s: "\u0633",
  $: "\u0634",
  S: "\u0635",
  D: "\u0636",
  T: "\u0637",
  Z: "\u0638",
  E: "\u0639",
  g: "\u063A",
  _: "\u0640",
  f: "\u0641",
  q: "\u0642",
  k: "\u0643",
  l: "\u0644",
  m: "\u0645",
  n: "\u0646",
  h: "\u0647",
  w: "\u0648",
  Y: "\u0649",
  y: "\u064A",
  F: "\u064B",
  N: "\u064C",
  K: "\u064D",
  a: "\u064E",
  u: "\u064F",
  i: "\u0650",
  "~": "\u0651",
  o: "\u0652",
};

export function buckwalterToArabic(text: string): string {
  return Array.from(text)
    .map((ch) => BUCKWALTER_TO_ARABIC[ch] ?? ch)
    .join("");
}

// Hebrew SBL-ish: consonantal skeleton only (vowels dropped).
const HE_DIGRAPHS: [string, string][] = [
  ["sh", "\u05E9\u05C1"],
  ["SH", "\u05E9\u05C1"],
  ["Sh", "\u05E9\u05C1"],
  ["š", "\u05E9\u05C1"],
  ["ś", "\u05E9\u05C2"],
  ["S", "\u05E9\u05C2"],
  ["ts", "\u05E6"],
  ["tz", "\u05E6"],
  ["ṣ", "\u05E6"],
  ["ch", "\u05D7"],
  ["ḥ", "\u05D7"],
  ["kh", "\u05DB"],
  ["ṭ", "\u05D8"],
  ["ʿ", "\u05E2"],
];

const HE_SINGLES: Record<string, string> = {
  "'": "\u05D0",
  b: "\u05D1",
  v: "\u05D1",
  g: "\u05D2",
  d: "\u05D3",
  h: "\u05D4",
  w: "\u05D5",
  z: "\u05D6",
  x: "\u05D7",
  T: "\u05D8",
  y: "\u05D9",
  k: "\u05DB",
  l: "\u05DC",
  m: "\u05DE",
  n: "\u05E0",
  s: "\u05E1",
  "`": "\u05E2",
  p: "\u05E4",
  f: "\u05E4",
  c: "\u05E6",
  q: "\u05E7",
  r: "\u05E8",
  t: "\u05EA",
};

const HE_DROPPED = new Set("aeiouAEIOU");

const HE_FINALS: Record<string, string> = {
  "\u05DB": "\u05DA",
  "\u05DE": "\u05DD",
  "\u05E0": "\u05DF",
  "\u05E4": "\u05E3",
  "\u05E6": "\u05E5",
};

function applyHebrewFinals(text: string): string {
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const isLast = i === chars.length - 1 || /\s/.test(chars[i + 1]);
    if (isLast && HE_FINALS[chars[i]]) {
      chars[i] = HE_FINALS[chars[i]];
    }
  }
  return chars.join("");
}

export function romanizedToHebrew(text: string): string {
  let i = 0;
  const out: string[] = [];
  while (i < text.length) {
    let matched = false;
    for (const [src, dst] of HE_DIGRAPHS) {
      if (text.startsWith(src, i)) {
        out.push(dst);
        i += src.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = text[i++];
    if (HE_DROPPED.has(ch)) continue;
    out.push(HE_SINGLES[ch] ?? ch);
  }
  return applyHebrewFinals(out.join(""));
}

export type RomanizationScheme = "buckwalter" | "sbl-he";

export function toNative(text: string, scheme: RomanizationScheme): string {
  if (scheme === "buckwalter") return buckwalterToArabic(text);
  if (scheme === "sbl-he") return romanizedToHebrew(text);
  throw new Error(`Unknown scheme: ${scheme}`);
}

// Strip script-specific combining marks (niqqud, shin dots, harakat) so prefix
// queries against the unvocalized `word` column actually match.
const _STRIP_RANGES: Array<[number, number]> = [
  [0x064b, 0x065f],  // Arabic harakat
  [0x0670, 0x0670],  // Arabic dagger alef
  [0x06d6, 0x06ed],  // Arabic misc combining
  [0x0591, 0x05c7],  // Hebrew niqqud + cantillation + shin/sin dots
  [0x0730, 0x074a],  // Syriac points
];

export function stripCombining(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (_STRIP_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) continue;
    out += ch;
  }
  return out;
}

// Detect script of the first strong letter — used to pick a default `lang` in
// native-script mode.
export type Script =
  | "arabic"
  | "hebrew"
  | "syriac"
  | "ethiopic"
  | "ugaritic"
  | "cuneiform"
  | "osa"
  | "phoenician"
  | "latin"
  | "other";

export function detectScript(text: string): Script {
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x077f) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff)) return "arabic";
    if ((cp >= 0x0590 && cp <= 0x05ff) || (cp >= 0xfb1d && cp <= 0xfb4f)) return "hebrew";
    if (cp >= 0x0700 && cp <= 0x074f) return "syriac";
    if ((cp >= 0x1200 && cp <= 0x137f) || (cp >= 0x2d80 && cp <= 0x2ddf)) return "ethiopic";
    // Ugaritic cuneiform (U+10380–1039F) and cuneiform proper (U+12000–123FF / U+12400–1247F) for Akkadian
    if (cp >= 0x10380 && cp <= 0x1039f) return "ugaritic";
    if (cp >= 0x12000 && cp <= 0x1247f) return "cuneiform";
    // Old South Arabian (U+10A60–10A7F) and Phoenician (U+10900–1091F) for future langs
    if (cp >= 0x10a60 && cp <= 0x10a7f) return "osa";
    if (cp >= 0x10900 && cp <= 0x1091f) return "phoenician";
    if (/[a-zA-Z]/.test(ch)) return "latin";
  }
  return "other";
}

export const SCRIPT_TO_LANG: Record<Script, string | null> = {
  arabic: "ar",
  hebrew: "he",
  syriac: "syc",
  ethiopic: "am", // shared by am / ti / gez — default to Amharic, user can switch
  ugaritic: "ug",
  cuneiform: "akk",
  osa: "osa",
  phoenician: "phn",
  latin: null,
  other: null,
};
