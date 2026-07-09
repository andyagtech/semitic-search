/**
 * Split a form string like "אחלה aḥla" or "تلفون tilifūn" or "kitap"
 * into { native, romanization? } components at RENDER time — so the same
 * source data can display native-only OR native + romanization depending
 * on a user toggle.
 *
 * Heuristic: find the LAST character that belongs to a non-Latin native
 * script (Hebrew, Arabic, Cyrillic, Ethiopic, Ugaritic, Sabaean, Phoenician,
 * Old Turkic Runic, Cuneiform). Everything AFTER that (if any) is treated
 * as the romanization.
 *
 * Latin-only strings return { native: <input> } with no romanization.
 */

const NATIVE_RANGES: [number, number][] = [
  [0x0590, 0x05FF],   // Hebrew
  [0x0600, 0x06FF],   // Arabic
  [0x0750, 0x077F],   // Arabic Supplement
  [0x08A0, 0x08FF],   // Arabic Extended-A
  [0xFB1D, 0xFB4F],   // Hebrew Presentation Forms
  [0xFB50, 0xFDFF],   // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF],   // Arabic Presentation Forms-B
  [0x0400, 0x04FF],   // Cyrillic
  [0x0500, 0x052F],   // Cyrillic Supplement
  [0x2DE0, 0x2DFF],   // Cyrillic Extended-A
  [0xA640, 0xA69F],   // Cyrillic Extended-B
  [0x1200, 0x137F],   // Ethiopic
  [0x1380, 0x139F],   // Ethiopic Supplement
  [0x2D80, 0x2DDF],   // Ethiopic Extended
  [0xAB00, 0xAB2F],   // Ethiopic Extended-A
  [0x10380, 0x1039F], // Ugaritic
  [0x10900, 0x1091F], // Phoenician
  [0x10A60, 0x10A7F], // Old South Arabian
  [0x10C00, 0x10C4F], // Old Turkic Runic
  [0x12000, 0x123FF], // Cuneiform
  [0x12400, 0x1247F], // Cuneiform Numbers
];

function isNativeCodePoint(cp: number): boolean {
  for (const [lo, hi] of NATIVE_RANGES) if (cp >= lo && cp <= hi) return true;
  return false;
}

function containsNativeScript(s: string): boolean {
  for (const ch of s) if (isNativeCodePoint(ch.codePointAt(0)!)) return true;
  return false;
}

export function splitNativeRomanization(text: string): { native: string; romanization?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { native: "" };
  if (!containsNativeScript(trimmed)) return { native: trimmed };

  // Walk chars (respecting surrogate pairs / astral codepoints), tracking the
  // JS-string index just AFTER the last native-script character we saw.
  let lastNativeEndPos = 0;
  let pos = 0;
  for (const ch of trimmed) {
    pos += ch.length;
    if (isNativeCodePoint(ch.codePointAt(0)!)) lastNativeEndPos = pos;
  }

  const nativePart = trimmed.slice(0, lastNativeEndPos).trim();
  const rest = trimmed.slice(lastNativeEndPos).trim();
  if (!rest) return { native: nativePart };
  return { native: nativePart, romanization: rest };
}
