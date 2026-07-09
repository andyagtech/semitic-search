/**
 * Semitic autocomplete index — same shape as Turkic's.
 * Suggestions come from the primary orthography of every cell in every
 * curated comparison table.
 */

import { TABLES } from "./comparison";
import { LANGUAGE_NAME, LANGUAGE_ORDER } from "./comparison";

export type Suggestion = {
  form: string;
  langCode: string;
  langName: string;
  gloss: string;
  tableSlug: string;
};

function buildIndex(): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const t of TABLES) {
    for (const row of t.rows) {
      for (const lang of LANGUAGE_ORDER) {
        const forms = row.cells[lang];
        if (!forms || forms.length === 0) continue;
        const form = forms[0].trim();
        if (!form || form === "—") continue;
        for (const piece of form.split(/\s*[,;]\s*/)) {
          const key = `${lang}:${piece}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            form: piece,
            langCode: lang,
            langName: LANGUAGE_NAME[lang] ?? lang,
            gloss: row.gloss ?? row.label,
            tableSlug: t.slug,
          });
        }
      }
    }
  }
  out.sort((a, b) => a.form.localeCompare(b.form));
  return out;
}

export const AUTOCOMPLETE_INDEX: Suggestion[] = buildIndex();

export function findSuggestions(query: string, limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase().normalize("NFC");
  if (!q) return [];
  const prefix: Suggestion[] = [];
  const substr: Suggestion[] = [];
  for (const s of AUTOCOMPLETE_INDEX) {
    const f = s.form.toLowerCase().normalize("NFC");
    if (f.startsWith(q)) prefix.push(s);
    else if (f.includes(q)) substr.push(s);
    if (prefix.length + substr.length >= limit * 3) break;
  }
  return [...prefix, ...substr].slice(0, limit);
}
