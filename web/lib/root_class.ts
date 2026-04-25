// Classify a root by its consonantal shape. Mirrors semitic traditional
// categories (sound, hamzated, weak, hollow, geminate, quadriliteral,
// biliteral). Input: space-separated canonical key like "k t b" or "q w l".

export type RootClass =
  | "sound"
  | "hamzated"
  | "initial-weak"
  | "hollow"
  | "final-weak"
  | "geminate"
  | "doubly-weak"
  | "biliteral"
  | "quadriliteral"
  | "quinqueliteral"
  | "unknown";

const WEAK = new Set(["w", "y"]);
const GLOTTAL = new Set(["ʾ"]);

export function classifyRoot(canonical: string): RootClass {
  const consonants = canonical.trim().split(/\s+/).filter(Boolean);
  const n = consonants.length;

  if (n === 2) return "biliteral";
  if (n === 4) return "quadriliteral";
  if (n >= 5) return "quinqueliteral";
  if (n !== 3) return "unknown";

  const [c1, c2, c3] = consonants;
  const weaks = [WEAK.has(c1), WEAK.has(c2), WEAK.has(c3)];
  const weakCount = weaks.filter(Boolean).length;

  if (GLOTTAL.has(c1)) return "hamzated";
  if (c2 === c3) return "geminate";
  if (weakCount >= 2) return "doubly-weak";
  if (weaks[1]) return "hollow";
  if (weaks[0]) return "initial-weak";
  if (weaks[2]) return "final-weak";
  if (GLOTTAL.has(c3)) return "hamzated"; // final-hamza
  return "sound";
}

export const ROOT_CLASS_LABEL: Record<RootClass, string> = {
  sound: "sound",
  hamzated: "hamzated",
  "initial-weak": "I-weak",
  hollow: "hollow (II-weak)",
  "final-weak": "III-weak",
  geminate: "geminate",
  "doubly-weak": "doubly weak",
  biliteral: "biliteral",
  quadriliteral: "quadriliteral",
  quinqueliteral: "quinqueliteral",
  unknown: "unknown",
};

export const ROOT_CLASS_DESCRIPTION: Record<RootClass, string> = {
  sound: "All three consonants are regular — no semi-vowels, no doubled positions, no glottals in position 1. The default verb class; inflects regularly across Semitic.",
  hamzated: "Contains ʾ (glottal stop) in position 1 or 3. Glottal stops assimilate or elide in many inflections, producing irregular surface forms.",
  "initial-weak": "First consonant is w or y. In Arabic these often elide in the imperfect (w-ṣ-l → yaṣilu 'arrives'). Hebrew roots in pe-yod/pe-waw.",
  hollow: "Middle consonant is w or y. The vowel contracts in the perfect (q-w-l → qāla 'said'), producing a 'hollow' surface. Known as mediae infirmae.",
  "final-weak": "Third consonant is w or y. The weak consonant often disappears in the perfect (r-m-y → ramā 'threw'). Known as lamed-he in Hebrew, tertiae infirmae.",
  geminate: "Second and third consonants are identical (ḥ-b-b 'love'). Surface forms often show a doubled consonant (mediae geminatae).",
  "doubly-weak": "Two or more weak positions — these verbs combine the irregularities of multiple classes and are the hardest to inflect.",
  biliteral: "Only two root consonants. Typical of very old grammatical cores (pronouns, particles, body-part basics). Often reconstructed with a weak third consonant that's been lost.",
  quadriliteral: "Four root consonants. Often loans, reduplications, or compounds (e.g. targam 'to translate'). Inflects with an extended pattern.",
  quinqueliteral: "Five root consonants — very rare, usually foreign loans.",
  unknown: "Not classified.",
};
