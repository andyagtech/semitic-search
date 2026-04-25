// Per-language script / font variants. Extends the Hebrew-script toggle
// pattern (Paleo, Samaritan, Rashi, Solitreo, Ktav Yad) to every language
// that has traditionally been written in multiple styles.
//
// All fonts are open-source (Google Fonts' Noto family + SIL-licensed
// typefaces + the Culmus Project's Ktav Yad). Fonts are loaded via the
// @import url() line in app/globals.css — keep that list in sync with any
// new variant added here.

import {
  convertHebrew,
  fontFamilyFor as hebrewFont,
  type HebrewScript,
} from "./hebrew_scripts";

export type ScriptVariant = {
  id: string;
  label: string;
  note: string;
  fontFamily?: string;
  /** Optional Unicode transformation applied before render. */
  convert?: (text: string) => string;
};

/** Per-language option list. Variant[0] is always the "default" (no font
 *  override, no transformation). If a language isn't in this map, no toggle
 *  is rendered. */
export const SCRIPT_VARIANTS: Record<string, ScriptVariant[]> = {
  // ─── Hebrew ────────────────────────────────────────────────────────────
  // Adapted from hebrew_scripts.ts. We keep the underlying Hebrew-specific
  // converter + font logic and expose it here through the unified API.
  he: [
    { id: "square",    label: "Square",    note: "Modern / Biblical (default)" },
    { id: "paleo",     label: "Paleo",     note: "Pre-exilic, Phoenician-derived (c. 1000 BCE)",
      convert: (t) => convertHebrew(t, "paleo"), fontFamily: hebrewFont("paleo") },
    { id: "samaritan", label: "Samaritan", note: "Samaritan community, descended from paleo",
      convert: (t) => convertHebrew(t, "samaritan"), fontFamily: hebrewFont("samaritan") },
    { id: "rashi",     label: "Rashi",     note: "Semi-cursive used for medieval commentaries",
      fontFamily: hebrewFont("rashi") },
    { id: "solitreo",  label: "Solitreo",  note: "Sephardi / Judeo-Spanish cursive",
      fontFamily: hebrewFont("solitreo") },
    { id: "ktavyad",   label: "Ktav Yad",  note: "Modern Israeli handwritten",
      fontFamily: hebrewFont("ktavyad") },
  ],

  // ─── Arabic ────────────────────────────────────────────────────────────
  // Four major calligraphic traditions, all attested in open-source fonts.
  ar: [
    { id: "default",  label: "Default",  note: "System / Noto Naskh Arabic" },
    { id: "amiri",    label: "Amiri",    note: "Classical Naskh — SIL Open Font License",
      fontFamily: "'Amiri', serif" },
    { id: "kufi",     label: "Kufi",     note: "Angular, early Islamic / Qur'anic",
      fontFamily: "'Reem Kufi', sans-serif" },
    { id: "nastaliq", label: "Nastaliq", note: "Flowing Persian / Urdu calligraphic hand",
      fontFamily: "'Noto Nastaliq Urdu', serif" },
  ],

  // ─── Syriac ────────────────────────────────────────────────────────────
  // Three distinct scribal traditions, each with its own Noto variant.
  syc: [
    { id: "default",    label: "Default",    note: "System / Noto Sans Syriac" },
    { id: "estrangela", label: "Estrangela", note: "Earliest form; used for headings and Eastern manuscripts",
      fontFamily: "'Noto Serif Syriac', serif" },
    { id: "serto",      label: "Serṭo",      note: "Western Syriac (Maronite, Syriac Orthodox)",
      fontFamily: "'Noto Sans Syriac Western', serif" },
    { id: "madnhaya",   label: "Madnḥāyā",   note: "Eastern Syriac (Assyrian Church of the East, Chaldean)",
      fontFamily: "'Noto Sans Syriac Eastern', serif" },
  ],

  // Assyrian Neo-Aramaic uses the East Syriac / Madnhaya script.
  aii: [
    { id: "default",    label: "Default",    note: "System / Noto Sans Syriac" },
    { id: "madnhaya",   label: "Madnḥāyā",   note: "Eastern Syriac script used for Assyrian Neo-Aramaic",
      fontFamily: "'Noto Sans Syriac Eastern', serif" },
    { id: "serto",      label: "Serṭo",      note: "Western Syriac variant",
      fontFamily: "'Noto Sans Syriac Western', serif" },
    { id: "estrangela", label: "Estrangela", note: "Archaic Eastern manuscript form",
      fontFamily: "'Noto Serif Syriac', serif" },
  ],

  // Turoyo is Western Syriac-written Neo-Aramaic.
  tru: [
    { id: "default",    label: "Default",    note: "System / Noto Sans Syriac" },
    { id: "serto",      label: "Serṭo",      note: "Western Syriac script used for Turoyo",
      fontFamily: "'Noto Sans Syriac Western', serif" },
    { id: "estrangela", label: "Estrangela", note: "Archaic script form",
      fontFamily: "'Noto Serif Syriac', serif" },
  ],

  // ─── Ethio-Semitic ─────────────────────────────────────────────────────
  // Ge'ez Fidel script shared across Ge'ez, Amharic, Tigrinya.
  gez: [
    { id: "default", label: "Default", note: "System / Noto Sans Ethiopic" },
    { id: "serif",   label: "Serif",   note: "Manuscript / traditional liturgical style",
      fontFamily: "'Noto Serif Ethiopic', serif" },
    { id: "abyssinica", label: "Abyssinica", note: "SIL scholarly hand",
      fontFamily: "'Abyssinica SIL', serif" },
  ],
  am: [
    { id: "default", label: "Default", note: "System / Noto Sans Ethiopic" },
    { id: "serif",   label: "Serif",   note: "Traditional print style",
      fontFamily: "'Noto Serif Ethiopic', serif" },
    { id: "abyssinica", label: "Abyssinica", note: "SIL scholarly hand",
      fontFamily: "'Abyssinica SIL', serif" },
  ],
  ti: [
    { id: "default", label: "Default", note: "System / Noto Sans Ethiopic" },
    { id: "serif",   label: "Serif",   note: "Traditional print style",
      fontFamily: "'Noto Serif Ethiopic', serif" },
    { id: "abyssinica", label: "Abyssinica", note: "SIL scholarly hand",
      fontFamily: "'Abyssinica SIL', serif" },
  ],

  // ─── Akkadian (cuneiform) ─────────────────────────────────────────────
  // Rely on Noto Sans Cuneiform since system fallback is unreliable on many
  // platforms. No variants — cuneiform is typographically uniform.
  akk: [
    { id: "default",   label: "Default",   note: "System / Noto Sans Cuneiform" },
    { id: "cuneiform", label: "Cuneiform", note: "Explicit Noto Sans Cuneiform rendering",
      fontFamily: "'Noto Sans Cuneiform', serif" },
  ],
};

/** TypeScript helper for the Hebrew case so existing imports still work. */
export type { HebrewScript };

/** Return the active variant record for a lang + id, or null if unknown. */
export function getScriptVariant(lang: string, id: string): ScriptVariant | null {
  const options = SCRIPT_VARIANTS[lang];
  if (!options) return null;
  return options.find((v) => v.id === id) ?? null;
}
