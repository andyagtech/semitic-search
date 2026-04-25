// TS port of semitic_search/fuzzy_canonical.py. Keep in sync if the Python
// reflex table changes — both pipelines must agree on the variant labels
// or the junction table lookup will miss.

const REFLEX: Record<string, string[]> = {
  // Sibilants / interdentals
  "š": ["Š", "Ś", "Ṯ"],
  "s": ["S", "Ś"],
  "ś": ["Ś"],
  "ṯ": ["Ṯ"],
  "t": ["T", "Ṯ"],
  "d": ["D", "Ḏ"],
  "ḏ": ["Ḏ"],
  "z": ["Z", "Ḏ"],
  // Emphatics
  "ṣ": ["Ṣ", "Ḍ", "Ẓ"],
  "ḍ": ["Ḍ"],
  "ẓ": ["Ẓ"],
  "ṭ": ["Ṭ", "Ẓ"],
  // Pharyngeals / velars
  "ḥ": ["Ḥ", "Ḫ"],
  "ḫ": ["Ḫ"],
  "ʿ": ["ʿ", "Ġ", "Ḍ"],
  "ġ": ["Ġ"],
  // Weak
  "w": ["W", "Y"],
  "y": ["W", "Y"],
  // Identity
  "b": ["B"], "p": ["P", "F"], "f": ["P", "F"],
  "k": ["K"], "q": ["Q"], "g": ["G"],
  "l": ["L"], "m": ["M"], "n": ["N"], "r": ["R"],
  "h": ["H"], "ʾ": ["ʾ"],
  "č": ["Č"], "č̣": ["Č̣"],
  "j": ["J"], "ž": ["Ž"], "ñ": ["Ñ"], "v": ["V"],
  "ṡ": ["Ś"],
};

function protoSets(canonicalKey: string): string[][] {
  return canonicalKey.split(/\s+/).filter(Boolean).map((p) =>
    REFLEX[p] ?? [p.toUpperCase()]
  );
}

// Human-readable gloss for each PS source label used by explainReflex().
const PS_GLOSS: Record<string, string> = {
  "Ḍ": "Proto-Semitic *ḍ (emphatic lateral) — preserved in Arabic ض, merged with *ṣ in Hebrew (צ), became ʿ in Aramaic/Syriac",
  "Ṯ": "Proto-Semitic *ṯ (voiceless interdental) — preserved in Arabic ث, became š in Hebrew (ש), became t in Syriac (ܬ), became š in Akkadian",
  "Ḏ": "Proto-Semitic *ḏ (voiced interdental) — preserved in Arabic ذ, became z in Hebrew (ז), became d in Syriac (ܕ), became z in Akkadian",
  "Ẓ": "Proto-Semitic *ẓ (emphatic interdental) — preserved in Arabic ظ, became ṣ in Hebrew (צ), became ṭ in Syriac (ܛ)",
  "Ḫ": "Proto-Semitic *ḫ (voiceless velar fricative) — preserved in Arabic خ, merged with ḥ in Hebrew/Syriac",
  "Ġ": "Proto-Semitic *ġ (voiced velar fricative) — preserved in Arabic غ, merged with ʿ in Hebrew/Syriac",
  "Ś": "Proto-Semitic *ś (lateral sibilant) — surviving only in Old South Arabian; merged with š or s elsewhere",
  "Š": "Proto-Semitic *š (postalveolar sibilant)",
  "W": "weak consonant *w (hollow/final-weak roots alternate w/y across forms and languages)",
  "Y": "weak consonant *y (hollow/final-weak roots alternate w/y across forms and languages)",
};

type ReflexExplanation = {
  position: number;      // 1-indexed
  inputPhoneme: string;  // e.g. 'ḍ'
  matchPhoneme: string;  // e.g. 'ṣ'
  sharedSources: string[]; // PS labels both reflect
  gloss: string;         // one-line explanation for the best-fit source
};

// Returns the per-position PS-reflex correspondences that let two surface
// roots match. Empty list means identity (no reflex needed).
export function explainReflex(inputKey: string, matchKey: string): ReflexExplanation[] {
  const inputPhonemes = inputKey.split(/\s+/).filter(Boolean);
  const matchPhonemes = matchKey.split(/\s+/).filter(Boolean);
  if (inputPhonemes.length !== matchPhonemes.length) return [];
  const out: ReflexExplanation[] = [];
  for (let i = 0; i < inputPhonemes.length; i++) {
    const a = inputPhonemes[i];
    const b = matchPhonemes[i];
    if (a === b) continue; // identity — no reflex to explain
    const aSet = new Set(REFLEX[a] ?? [a.toUpperCase()]);
    const bSet = new Set(REFLEX[b] ?? [b.toUpperCase()]);
    const shared = [...aSet].filter((x) => bSet.has(x));
    if (!shared.length) continue;
    // Prefer a shared source that has an explanatory gloss
    const best = shared.find((s) => PS_GLOSS[s]) ?? shared[0];
    out.push({
      position: i + 1,
      inputPhoneme: a,
      matchPhoneme: b,
      sharedSources: shared,
      gloss: PS_GLOSS[best] ?? `Proto-Semitic *${best.toLowerCase()}`,
    });
  }
  return out;
}

// Inverse index: PS label → list of surface phonemes that reflect it.
// Derived automatically from REFLEX so we only maintain one table.
const INVERSE_REFLEX: Record<string, string[]> = (() => {
  const inv: Record<string, Set<string>> = {};
  for (const [surface, sources] of Object.entries(REFLEX)) {
    for (const s of sources) {
      if (!inv[s]) inv[s] = new Set();
      inv[s].add(surface);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(inv)) out[k] = [...v].sort();
  return out;
})();

/** Surface phonemes that can reflect a given Proto-Semitic label. */
export function surfaceReflexesOf(psLabel: string): string[] {
  return INVERSE_REFLEX[psLabel] ?? [psLabel.toLowerCase()];
}

/** All surface canonical variants of a Proto-Semitic root.
 * Input: "Ḏ H B" (space-separated PS labels)
 * Output: ["ḏ h b", "d h b", "z h b"] (per-lang candidate realizations)
 */
export function surfaceVariants(psRoot: string, cap = 64): string[] {
  const labels = psRoot.split(/\s+/).filter(Boolean);
  let variants: string[][] = [[]];
  for (const label of labels) {
    const options = surfaceReflexesOf(label);
    const next: string[][] = [];
    for (const v of variants) {
      for (const opt of options) {
        next.push([...v, opt]);
        if (next.length > cap * 4) break;
      }
    }
    variants = next;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.join(" ");
    if (!seen.has(key)) { seen.add(key); out.push(key); }
  }
  out.sort();
  return out.slice(0, cap);
}

export function fuzzyVariants(canonicalKey: string, cap = 64): string[] {
  const sets = protoSets(canonicalKey);
  let variants: string[][] = [[]];
  for (const s of sets) {
    const next: string[][] = [];
    for (const v of variants) {
      for (const label of s) {
        next.push([...v, label]);
        if (next.length > cap * 4) break;
      }
    }
    variants = next;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.join(" ");
    if (!seen.has(key)) { seen.add(key); out.push(key); }
  }
  out.sort();
  return out.slice(0, cap);
}
