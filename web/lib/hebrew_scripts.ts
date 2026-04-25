// Hebrew script-style variants. The square (modern Jewish) script is the
// default. The other variants either need a Unicode remap (Paleo-Hebrew
// maps to the Phoenician block, Samaritan to the Samaritan block) or a
// font swap (Rashi / Solitreo / Ktav Yad are all square-script Unicode,
// just rendered with a different typeface).

export type HebrewScript =
  | "square"       // standard modern/biblical Hebrew block (U+0591–U+05F4)
  | "paleo"        // 22 Phoenician code points (U+10900–U+10915)
  | "samaritan"    // Samaritan block (U+0800–U+0815)
  | "rashi"        // square script, Noto Rashi Hebrew font
  | "solitreo"     // square script, Solitreo font
  | "ktavyad";     // square script, Culmus Ktav Yad CLM font

export const HEBREW_SCRIPTS: { id: HebrewScript; label: string; note: string }[] = [
  { id: "square",    label: "Square",    note: "Modern / Biblical (default)" },
  { id: "paleo",     label: "Paleo",     note: "Pre-exilic, Phoenician-derived (c. 1000 BCE)" },
  { id: "samaritan", label: "Samaritan", note: "Samaritan community, descended from paleo" },
  { id: "rashi",     label: "Rashi",     note: "Semi-cursive used for medieval commentaries" },
  { id: "solitreo",  label: "Solitreo",  note: "Sephardi / Judeo-Spanish cursive" },
  { id: "ktavyad",   label: "Ktav Yad",  note: "Modern Israeli handwritten" },
];

// Hebrew square → Phoenician (Paleo-Hebrew). Finals collapse to their
// base letter since Phoenician has no final forms.
const SQUARE_TO_PALEO: Record<string, string> = {
  "א": "\u{10900}", "ב": "\u{10901}", "ג": "\u{10902}", "ד": "\u{10903}",
  "ה": "\u{10904}", "ו": "\u{10905}", "ז": "\u{10906}", "ח": "\u{10907}",
  "ט": "\u{10908}", "י": "\u{10909}",
  "כ": "\u{1090A}", "ך": "\u{1090A}",
  "ל": "\u{1090B}",
  "מ": "\u{1090C}", "ם": "\u{1090C}",
  "נ": "\u{1090D}", "ן": "\u{1090D}",
  "ס": "\u{1090E}", "ע": "\u{1090F}",
  "פ": "\u{10910}", "ף": "\u{10910}",
  "צ": "\u{10911}", "ץ": "\u{10911}",
  "ק": "\u{10912}", "ר": "\u{10913}",
  "ש": "\u{10914}", "ת": "\u{10915}",
};

// Hebrew square → Samaritan. Same collapsing behavior.
const SQUARE_TO_SAMARITAN: Record<string, string> = {
  "א": "\u{0800}", "ב": "\u{0801}", "ג": "\u{0802}", "ד": "\u{0803}",
  "ה": "\u{0804}", "ו": "\u{0805}", "ז": "\u{0806}", "ח": "\u{0807}",
  "ט": "\u{0808}", "י": "\u{0809}",
  "כ": "\u{080A}", "ך": "\u{080A}",
  "ל": "\u{080B}",
  "מ": "\u{080C}", "ם": "\u{080C}",
  "נ": "\u{080D}", "ן": "\u{080D}",
  "ס": "\u{080E}", "ע": "\u{080F}",
  "פ": "\u{0810}", "ף": "\u{0810}",
  "צ": "\u{0811}", "ץ": "\u{0811}",
  "ק": "\u{0812}", "ר": "\u{0813}",
  "ש": "\u{0814}", "ת": "\u{0815}",
};

// Niqqud + te'amim + cantillation: keep for square/rashi/solitreo/ktavyad
// (all of which render Hebrew-block diacritics), strip for paleo/samaritan
// (no pointing attested). Regex matches U+0591–U+05C7.
const POINTING_RE = /[֑-ׇ]/g;

function mapString(text: string, table: Record<string, string>): string {
  const out: string[] = [];
  for (const ch of text) {
    out.push(table[ch] ?? ch);
  }
  return out.join("");
}

export function convertHebrew(text: string, script: HebrewScript): string {
  if (!text) return text;
  switch (script) {
    case "square":
    case "rashi":
    case "solitreo":
    case "ktavyad":
      // Same Unicode — just render with a different font.
      return text;
    case "paleo":
      return mapString(text.replace(POINTING_RE, ""), SQUARE_TO_PALEO);
    case "samaritan":
      return mapString(text.replace(POINTING_RE, ""), SQUARE_TO_SAMARITAN);
  }
}

// CSS font-family value per variant. The names reference @font-face
// definitions in globals.css.
export function fontFamilyFor(script: HebrewScript): string | undefined {
  switch (script) {
    case "rashi":     return "'Noto Rashi Hebrew', serif";
    case "solitreo":  return "'Solitreo', cursive";
    case "ktavyad":   return "'KtavYad CLM', cursive";
    case "paleo":     return "'Noto Sans Phoenician', serif";
    case "samaritan": return "'Noto Sans Samaritan', serif";
    case "square":
    default:          return undefined;
  }
}
