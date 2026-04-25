// TS port of semitic_search/reconstruct.py. Keep the reflex table in
// lockstep with fuzzy_canonical.ts / fuzzy_canonical.py — the reconstruction
// intersects each cognate's surface phoneme with its PS source set, so all
// three files must agree on which phonemes can reflect which proto-sources.

const REFLEX: Record<string, string[]> = {
  "š": ["Š", "Ś", "Ṯ"],
  "s": ["S", "Ś"],
  "ś": ["Ś"],
  "ṯ": ["Ṯ"],
  "t": ["T", "Ṯ"],
  "d": ["D", "Ḏ"],
  "ḏ": ["Ḏ"],
  "z": ["Z", "Ḏ"],
  "ṣ": ["Ṣ", "Ḍ", "Ẓ"],
  "ḍ": ["Ḍ"],
  "ẓ": ["Ẓ"],
  "ṭ": ["Ṭ", "Ẓ"],
  "ḥ": ["Ḥ", "Ḫ"],
  "ḫ": ["Ḫ"],
  "ʿ": ["ʿ", "Ġ", "Ḍ"],
  "ġ": ["Ġ"],
  "w": ["W", "Y"],
  "y": ["W", "Y"],
  "b": ["B"], "p": ["P", "F"], "f": ["P", "F"],
  "k": ["K"], "q": ["Q"], "g": ["G"],
  "l": ["L"], "m": ["M"], "n": ["N"], "r": ["R"],
  "h": ["H"], "ʾ": ["ʾ"],
  "č": ["Č"], "č̣": ["Č̣"],
  "j": ["J"], "ž": ["Ž"], "ñ": ["Ñ"], "v": ["V"],
  "ṡ": ["Ś"],
};

const SPECIFICITY: Record<string, number> = (() => {
  const c: Record<string, number> = {};
  for (const sources of Object.values(REFLEX)) {
    for (const s of sources) c[s] = (c[s] ?? 0) + 1;
  }
  return c;
})();

export type SlotReconstruction = {
  position: number;
  ps_label: string;
  confidence: number;
  supporters: string[];
  dissenters: string[];
  alternatives: { label: string; confidence: number }[];
};

export type Reconstruction = {
  ps_root: string;
  overall_confidence: number;
  slots: SlotReconstruction[];
  warnings: string[];
};

/** Cognate input: (lang, canonical_key_string). */
export function reconstruct(cognates: [string, string][]): Reconstruction {
  const warnings: string[] = [];
  const resolved: [string, string[]][] = [];
  for (const [lang, canonical] of cognates) {
    const phonemes = canonical.split(/\s+/).filter(Boolean);
    if (!phonemes.length) {
      warnings.push(`Empty canonical for ${lang}; skipped.`);
      continue;
    }
    resolved.push([lang, phonemes]);
  }
  if (resolved.length < 2) {
    return {
      ps_root: "",
      overall_confidence: 0,
      slots: [],
      warnings: [...warnings, "Need at least 2 cognates to reconstruct."],
    };
  }

  const lengths = new Set(resolved.map(([, p]) => p.length));
  if (lengths.size > 1) {
    warnings.push(
      `Root length mismatch (${[...lengths].sort()}); aligning to shortest ${Math.min(
        ...lengths,
      )}.`,
    );
  }
  const minLen = Math.min(...lengths);

  const slots: SlotReconstruction[] = [];
  for (let pos = 0; pos < minLen; pos++) {
    const candidates = new Map<string, string[]>();
    for (const [lang, phonemes] of resolved) {
      const surface = phonemes[pos];
      const sources = REFLEX[surface] ?? [surface.toUpperCase()];
      for (const s of sources) {
        if (!candidates.has(s)) candidates.set(s, []);
        candidates.get(s)!.push(lang);
      }
    }
    if (candidates.size === 0) {
      slots.push({
        position: pos + 1,
        ps_label: "?",
        confidence: 0,
        supporters: [],
        dissenters: resolved.map(([l]) => l),
        alternatives: [],
      });
      continue;
    }
    const ranked = [...candidates.entries()].sort((a, b) => {
      const diff = b[1].length - a[1].length;
      if (diff !== 0) return diff;
      return (SPECIFICITY[a[0]] ?? 99) - (SPECIFICITY[b[0]] ?? 99);
    });
    const [bestLabel, bestSupporters] = ranked[0];
    const n = resolved.length;
    const conf = bestSupporters.length / n;
    const supporterSet = new Set(bestSupporters);
    slots.push({
      position: pos + 1,
      ps_label: bestLabel,
      confidence: conf,
      supporters: bestSupporters,
      dissenters: resolved.filter(([l]) => !supporterSet.has(l)).map(([l]) => l),
      alternatives: ranked.slice(1, 6).map(([l, s]) => ({
        label: l,
        confidence: s.length / n,
      })),
    });
  }

  const psRoot = slots.map((s) => s.ps_label).join(" ");
  let overall = 0;
  if (slots.length) {
    let prod = 1;
    for (const s of slots) prod *= Math.max(s.confidence, 0.001);
    overall = Math.pow(prod, 1 / slots.length);
  }

  return { ps_root: psRoot, overall_confidence: overall, slots, warnings };
}
