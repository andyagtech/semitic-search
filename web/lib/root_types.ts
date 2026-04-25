// Pure types + constants for root-family pages — safe to import from client
// components (no Node-only APIs like fs).

export type Attestation = {
  source: string;       // 'tanakh' | 'quran' | ...
  citation: string;     // e.g. 'Gen.1.1' or 'Q.2:30'
  order?: number;       // sort key within a source
};

export type Derivation = {
  kind: "derived" | "related";
  word: string;
  roman?: string | null;
};

export type RootLemma = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  pos: string;
  gloss: string;
  root: string;
  source: string;
  attestation?: Attestation | null;
  derivations?: Derivation[];
  etymology?: string | null;
};

export type RootTheme = { word: string; count: number };

export type RootFamily = {
  canonical: string;
  slug: string;
  lang_count: number;
  lemma_count: number;
  languages: string[];
  language_names: Record<string, string>;
  earliest_attestation?: Attestation | null;
  themes?: RootTheme[];
  lemmas: Record<string, RootLemma[]>;
};

export const RTL_LANGS = new Set([
  "ar", "he", "syc", "arc", "aii", "tru", "mid",
  "phn", "sab", "osa", "pun", "ug",
]);
