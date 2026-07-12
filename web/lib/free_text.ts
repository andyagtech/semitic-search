// Free-text (Latin / Arabizi / romanized) → candidate Semitic-script queries.
//
// Rule-based: produces up to N candidates ordered by confidence. Arabizi
// digit conventions (2/3/5/6/7/8/9) unambiguously indicate Arabic; common
// SBL / academic transliteration schemes are folded into Hebrew and
// Syriac candidates.
//
// LLM fallback is handled in the /api/free_text route: it only fires
// when the rules produce zero candidates or the caller asks explicitly.

import { buckwalterToArabic, romanizedToHebrew } from "./romanization";

export type FreeTextCandidate = {
  script: "ar" | "he" | "syr";
  text: string;
  confidence: "high" | "medium" | "low";
  why: string;
};

// Arabizi digit → Arabic letter. These are the Franco-Arabe / "Arabic
// chat alphabet" conventions used across MSA/Egyptian/Levantine/Gulf.
const ARABIZI_DIGITS: Record<string, string> = {
  "2": "ء",   // hamza
  "3": "ع",   // ayn
  "4": "ذ",   // dhal (less common; some use it for ذ or غ)
  "5": "خ",   // kha (also 7')
  "6": "ط",   // taʾ marbuta / emphatic ta
  "7": "ح",   // ha
  "8": "غ",   // ghayn (also 3' or gh)
  "9": "ص",   // sad
};

// Arabizi digraphs — checked before single-letter mappings.
const ARABIZI_DIGRAPHS: [string, string][] = [
  ["3'", "غ"], ["gh", "غ"], ["Gh", "غ"], ["GH", "غ"],
  ["7'", "خ"], ["kh", "خ"], ["Kh", "خ"], ["KH", "خ"],
  ["9'", "ض"], ["dh", "ذ"], ["Dh", "ذ"], ["DH", "ذ"],
  ["6'", "ظ"], ["th", "ث"], ["Th", "ث"], ["TH", "ث"],
  ["sh", "ش"], ["Sh", "ش"], ["SH", "ش"],
  ["ch", "ش"], ["Ch", "ش"],
  ["aa", "ا"], ["ii", "ي"], ["ee", "ي"],
  ["uu", "و"], ["oo", "و"],
];

// Single Arabizi consonants (case-insensitive except emphatics). Capitals
// signal emphatics — same convention as Buckwalter.
const ARABIZI_CONSONANTS: Record<string, string> = {
  b: "ب", t: "ت", j: "ج", H: "ح", h: "ه", d: "د",
  r: "ر", z: "ز", s: "س", S: "ص", D: "ض", T: "ط", Z: "ظ",
  E: "ع", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن",
  w: "و", y: "ي",
  g: "ج", p: "ب", v: "ف",
  "'": "ء",
};
// Short vowels — Arabic script doesn't write these unless they carry
// harakat. Drop between consonants; keep at word start as a hamza-carrier
// alif (so "abibi" starts with ا rather than nothing).
const ARABIZI_SHORT_VOWELS = new Set(["a", "i", "u", "e", "o"]);

const ARABIZI_DIGIT_SET = /[234567892]/;

function arabiziToArabic(text: string): string {
  let i = 0;
  const out: string[] = [];
  let atWordStart = true;
  while (i < text.length) {
    // Digit-with-apostrophe digraphs first (3', 5', 6', 7', 8', 9').
    if (i + 1 < text.length && text[i + 1] === "'") {
      const pair = text.slice(i, i + 2);
      const hit = ARABIZI_DIGRAPHS.find(([s]) => s === pair);
      if (hit) { out.push(hit[1]); i += 2; atWordStart = false; continue; }
    }
    // Two-char digraphs (long vowels + letter digraphs like sh/kh/th).
    let matched = false;
    for (const [src, dst] of ARABIZI_DIGRAPHS) {
      if (text.startsWith(src, i) && src.length === 2 && !/[0-9']/.test(src)) {
        out.push(dst);
        i += src.length;
        matched = true;
        atWordStart = false;
        break;
      }
    }
    if (matched) continue;
    const ch = text[i++];
    if (ARABIZI_DIGITS[ch]) {
      out.push(ARABIZI_DIGITS[ch]); atWordStart = false; continue;
    }
    if (ARABIZI_CONSONANTS[ch]) {
      out.push(ARABIZI_CONSONANTS[ch]); atWordStart = false; continue;
    }
    const lc = ch.toLowerCase();
    if (ARABIZI_CONSONANTS[lc]) {
      out.push(ARABIZI_CONSONANTS[lc]); atWordStart = false; continue;
    }
    // Short vowel handling — drop unless at word start, in which case
    // emit alif so the word starts with a proper carrier.
    if (ARABIZI_SHORT_VOWELS.has(lc)) {
      if (atWordStart) { out.push("ا"); atWordStart = false; }
      continue;
    }
    if (/\s|[.,;:!?()\[\]{}"'-]/.test(ch)) {
      out.push(ch);
      atWordStart = true;
    }
  }
  return out.join("");
}

// Very small Syriac transliteration: same slot names as Hebrew but
// output Syriac glyphs. Handy for aramaicist input like "shlama".
const SYR_DIGRAPHS: [string, string][] = [
  ["sh", "ܫ"], ["Sh", "ܫ"], ["SH", "ܫ"], ["š", "ܫ"],
  ["ch", "ܟ"], ["kh", "ܟ"], ["ḥ", "ܚ"], ["ṭ", "ܛ"],
  ["ṣ", "ܨ"], ["ts", "ܨ"], ["ʿ", "ܥ"], ["ʾ", "ܐ"],
  ["th", "ܬ"],
];
const SYR_SINGLES: Record<string, string> = {
  "'": "ܐ", b: "ܒ", g: "ܓ", d: "ܕ", h: "ܗ", w: "ܘ",
  z: "ܙ", H: "ܚ", y: "ܝ", k: "ܟ", l: "ܠ",
  m: "ܡ", n: "ܢ", s: "ܣ", "`": "ܥ", p: "ܦ", f: "ܦ", c: "ܨ",
  q: "ܩ", r: "ܪ", t: "ܬ", v: "ܘ",
};
// Syriac abjad — like Arabic, short vowels are unmarked. Aggressive
// consonant-skeleton output matches how roots are stored.
const SYR_DROPPED = new Set(["a", "e", "i", "o", "u"]);

function romanizedToSyriac(text: string): string {
  let i = 0;
  const out: string[] = [];
  let atWordStart = true;
  while (i < text.length) {
    let matched = false;
    for (const [src, dst] of SYR_DIGRAPHS) {
      if (text.startsWith(src, i)) {
        out.push(dst);
        i += src.length;
        matched = true;
        atWordStart = false;
        break;
      }
    }
    if (matched) continue;
    const ch = text[i++];
    const lc = ch.toLowerCase();
    if (SYR_DROPPED.has(lc)) {
      if (atWordStart) { out.push("ܐ"); atWordStart = false; }
      continue;
    }
    if (SYR_SINGLES[ch]) { out.push(SYR_SINGLES[ch]); atWordStart = false; continue; }
    if (SYR_SINGLES[lc]) { out.push(SYR_SINGLES[lc]); atWordStart = false; continue; }
    if (/\s|[.,;:!?()\[\]{}"'-]/.test(ch)) { out.push(ch); atWordStart = true; }
  }
  return out.join("");
}

// Well-known lexical hints — words that are so strongly associated with
// one tradition that even without Arabizi digits we can flag them
// confidently. Small hand-curated list.
const LANG_HINT_WORDS: { pattern: RegExp; script: "he" | "ar" | "syr"; why: string }[] = [
  { pattern: /\b(shalom|shabbat|tefila|torah|mitzvah|adonai|elohim|kol|baruch|barukh|yerushalayim|shema)\b/i, script: "he", why: "Hebrew-typical loanword" },
  { pattern: /\b(salam|salaam|assalam|allah|rasul|kitab|marhaba|habibi|inshallah|mashallah|jihad|halal|masjid)\b/i, script: "ar", why: "Arabic-typical loanword" },
  { pattern: /\b(shlama|maran|marya|qadisha|slama|isho|mshiha|mshikha|kthaba)\b/i, script: "syr", why: "Syriac / Aramaic loanword" },
];

export function transliterate(input: string): FreeTextCandidate[] {
  const raw = input.trim();
  if (!raw) return [];
  const candidates: FreeTextCandidate[] = [];

  const hasArabiziDigit = ARABIZI_DIGIT_SET.test(raw);
  const lexHits = LANG_HINT_WORDS.filter((h) => h.pattern.test(raw));

  // 1) Arabizi digits → Arabic is a strong signal. Produce first.
  if (hasArabiziDigit) {
    candidates.push({
      script: "ar",
      text: arabiziToArabic(raw),
      confidence: "high",
      why: "Arabizi digits (2/3/5/6/7/8/9) are Arabic-specific.",
    });
  }

  // 2) Lexical hints — bump script to top with a stated reason.
  for (const hit of lexHits) {
    const already = candidates.find((c) => c.script === hit.script);
    if (already) {
      already.confidence = "high";
      already.why = hit.why;
      continue;
    }
    const text =
      hit.script === "ar" ? arabiziToArabic(raw)
      : hit.script === "he" ? romanizedToHebrew(raw)
      : romanizedToSyriac(raw);
    candidates.push({ script: hit.script, text, confidence: "high", why: hit.why });
  }

  // 3) Otherwise, try all three scripts with medium confidence and let
  // the user pick. Hebrew is the historical default for the site so
  // it goes first.
  if (candidates.length === 0) {
    candidates.push({
      script: "he", text: romanizedToHebrew(raw),
      confidence: "medium",
      why: "Romanized consonant skeleton mapped to Hebrew.",
    });
    candidates.push({
      script: "ar", text: arabiziToArabic(raw),
      confidence: "medium",
      why: "Arabizi mapping (no digits present, so ambiguous).",
    });
    candidates.push({
      script: "syr", text: romanizedToSyriac(raw),
      confidence: "low",
      why: "Aramaic-style transliteration.",
    });
  } else {
    // Also add the two other-script versions as low-confidence fallbacks.
    for (const script of ["he", "ar", "syr"] as const) {
      if (candidates.find((c) => c.script === script)) continue;
      const text =
        script === "ar" ? arabiziToArabic(raw)
        : script === "he" ? romanizedToHebrew(raw)
        : romanizedToSyriac(raw);
      candidates.push({
        script, text, confidence: "low",
        why: "Alternate script attempt.",
      });
    }
  }

  // De-dup empty / all-punctuation outputs.
  return candidates.filter((c) => /\p{L}/u.test(c.text));
}

// Convenience: Buckwalter is technically a superset of Arabizi for
// scholarly input. Try it too if the input looks Buckwalter-ish (has
// $/&/</>/} characters that aren't Arabizi).
const BUCKWALTER_MARKERS = /[$&<>}|*~]/;
export function isLikelyBuckwalter(input: string): boolean {
  return BUCKWALTER_MARKERS.test(input);
}
export function buckwalter(input: string): string {
  return buckwalterToArabic(input);
}
