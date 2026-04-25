import { z } from "zod";

export const ConfidenceTier = z.enum([
  "high",
  "medium",
  "low",
  "speculative",
  "unknown",
]);
export type ConfidenceTier = z.infer<typeof ConfidenceTier>;

export const LanguageCode = z.enum([
  "ar",
  "he",
  "syc",
  "am",
  "ti",
  "gez",
  "arc",
  "aii",
  "akk",
  "ug",
  "osa",
  "sab",
  "phn",
  "pun",
  "tru",
  "mid",
  "amw",
]);
export type LanguageCode = z.infer<typeof LanguageCode>;

export const RootType = z.enum([
  "sound",
  "hamzated",
  "initial-weak",
  "hollow",
  "final-weak",
  "geminate",
  "biliteral",
  "quadriliteral",
  "unknown",
]);

export const ProtoCandidate = z.object({
  proto_phoneme: z.string(),
  weight: z.number().min(0).max(1),
});

export const RootSlot = z.object({
  position: z.number().int().min(1).max(4),
  surface_consonant: z.string(),
  proto_candidates: z.array(ProtoCandidate),
});

export const Cognate = z.object({
  language: LanguageCode,
  language_name: z.string(),
  surface_form: z.string(),
  surface_root: z.string(),
  gloss: z.string(),
  confidence: ConfidenceTier,
  correspondence_path: z.string().nullable().optional(),
  wiktionary_hint: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type Cognate = z.infer<typeof Cognate>;

export const SemiticSearchResult = z.object({
  input_word: z.string(),
  detected_language: LanguageCode,
  detected_language_name: z.string(),
  normalized_form: z.string(),
  extracted_root: z.string().nullable().optional(),
  root_type: RootType.nullable().optional(),
  root_confidence: ConfidenceTier,
  proto_slots: z.array(RootSlot).nullable().optional(),
  cognates: z.array(Cognate).default([]),
  caveats: z.array(z.string()).default([]),
});
export type SemiticSearchResult = z.infer<typeof SemiticSearchResult>;
