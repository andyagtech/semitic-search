/**
 * TypeScript mirror of the Pydantic LoanReplacementResult in semitic_search/models.py.
 */

import type { LanguageCode } from "./models";

export type LoanOrigin =
  | "inherited" | "aramaic" | "greek" | "persian" | "arabic" | "turkish"
  | "european" | "other-loan" | "unknown";

export type Mechanic = "native-stock" | "reflex-adapted";
export type Plausibility = "strong" | "reasonable" | "speculative";

export type LoanReplacement = {
  candidate: string;
  mechanic: Mechanic;
  gloss: string;
  derivation: string;
  plausibility: Plausibility;
  based_on?: string | null;
  notes?: string | null;
};

export type LoanReplacementResult = {
  input_word: string;
  detected_language: LanguageCode;
  detected_language_name: string;
  detected_source: LoanOrigin;
  original_meaning: string;
  source_form?: string | null;
  replacements: LoanReplacement[];
  caveats: string[];
};
