import { db } from "./db";
import { stripCombining } from "./romanization";
import type { Cognate, LanguageCode } from "./models";

// Languages we've ingested into Turso. Others are valid Gemini outputs but we
// can't verify them locally (yet).
export const INDEXED_LANGS: readonly LanguageCode[] = [
  "ar", "he", "syc", "am", "ti", "gez", "ug", "akk", "arc",
  "aii", "sab", "osa", "phn", "pun", "tru", "mid", "amw",
] as const;

// Gemini sometimes returns surface_form like `𐎋𐎚𐎁 (ktb)` or `كِتَاب (kitāb)`
// with an inline romanization. Strip trailing parenthetical/bracket material
// before index lookup so the native-script portion actually matches.
function stripTrailingRomanization(s: string): string {
  return s.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*$/, "").trim();
}

export type VerificationStatus =
  | "attested" // exact surface-form match in Turso
  | "root_attested" // root found (other surface forms exist) but this exact form not
  | "root_inferred_match" // matches a mechanically-inferred root (no Wiktionary editor annotation)
  | "editor_claim" // a Wiktionary editor hand-curated this as a cross-lang cognate
  | "not_in_index" // lang is indexed but no match for word or root
  | "lang_not_indexed"; // not in our Kaikki dumps

const WIKTIONARY_LANG_SECTION: Record<string, string> = {
  ar: "Arabic",
  he: "Hebrew",
  syc: "Classical_Syriac",
  am: "Amharic",
  ti: "Tigrinya",
  gez: "Geez",
  akk: "Akkadian",
  ug: "Ugaritic",
  arc: "Aramaic",
  osa: "Sabaean",
};

export type RelatedLemma = {
  word: string;
  vocalized_form: string | null;
  pos: string;
  first_gloss: string | null;
};

export type VerifiedCognate = Cognate & {
  verification: VerificationStatus;
  wiktionary_url: string | null;
  matched_entry?: {
    word: string;
    vocalized_form: string | null;
    root: string | null;
    pos: string | null;
  };
  related_lemmas?: RelatedLemma[];
};

// Normalize a Gemini-supplied root like "ك-ت-ب" / "ך־ת־ב" / "k-t-b" to the
// space-separated form we store in Turso ("ك ت ب"). Hyphen and maqaf both become
// whitespace; then collapse.
function normalizeRoot(root: string): string {
  return root.replace(/[-\u05be]/g, " ").replace(/\s+/g, " ").trim();
}

function buildWiktionaryUrl(lang: string, hint: string | null | undefined): string | null {
  if (!hint) return null;
  const section = WIKTIONARY_LANG_SECTION[lang] ?? "";
  const title = encodeURIComponent(hint);
  return section
    ? `https://en.wiktionary.org/wiki/${title}#${section}`
    : `https://en.wiktionary.org/wiki/${title}`;
}

async function fetchRelatedLemmas(
  lang: string,
  rootNorm: string,
  excludeWord: string,
): Promise<RelatedLemma[]> {
  const client = db();
  const result = await client.execute({
    sql: `SELECT word, vocalized_form, pos,
                 json_extract(glosses_json, '$[0]') AS first_gloss
            FROM entries
           WHERE lang = ? AND root = ? AND word != ?
           ORDER BY length(word), word
           LIMIT 6`,
    args: [lang, rootNorm, excludeWord],
  });
  return result.rows.map((r) => ({
    word: r.word as string,
    vocalized_form: (r.vocalized_form as string | null) ?? null,
    pos: (r.pos as string | null) ?? "",
    first_gloss: (r.first_gloss as string | null) ?? null,
  }));
}

export async function verifyOne(c: Cognate): Promise<VerifiedCognate> {
  const url = buildWiktionaryUrl(c.language, c.wiktionary_hint);

  if (!INDEXED_LANGS.includes(c.language)) {
    return { ...c, verification: "lang_not_indexed", wiktionary_url: url };
  }

  const client = db();
  const cleanSurface = stripTrailingRomanization(c.surface_form);
  const stripped = stripCombining(cleanSurface);

  const wordHit = await client.execute({
    sql: `SELECT word, vocalized_form, root, pos
            FROM entries
           WHERE lang = ?
             AND (word = ? OR word = ? OR vocalized_form = ? OR vocalized_form = ?)
           LIMIT 1`,
    args: [c.language, cleanSurface, stripped, cleanSurface, stripped],
  });

  if (wordHit.rows.length > 0) {
    const row = wordHit.rows[0];
    const rootFromMatch = (row.root as string | null) ?? null;
    const rootToLookup = rootFromMatch ?? (c.surface_root ? normalizeRoot(c.surface_root) : null);
    const related = rootToLookup
      ? await fetchRelatedLemmas(c.language, rootToLookup, row.word as string)
      : [];
    return {
      ...c,
      verification: "attested",
      wiktionary_url: url,
      matched_entry: {
        word: row.word as string,
        vocalized_form: (row.vocalized_form as string | null) ?? null,
        root: rootFromMatch,
        pos: (row.pos as string | null) ?? null,
      },
      related_lemmas: related,
    };
  }

  if (c.surface_root) {
    const rootNorm = normalizeRoot(c.surface_root);
    const rootHit = await client.execute({
      sql: "SELECT COUNT(*) AS n FROM entries WHERE lang = ? AND root = ?",
      args: [c.language, rootNorm],
    });
    const n = Number(rootHit.rows[0]?.n ?? 0);
    if (n > 0) {
      const related = await fetchRelatedLemmas(c.language, rootNorm, c.surface_form);
      return {
        ...c,
        verification: "root_attested",
        wiktionary_url: url,
        related_lemmas: related,
      };
    }

    // Mechanically-inferred root match — weaker than gold-attested but still
    // useful evidence for Ethio-Semitic where Wiktionary coverage is ~0%.
    // Guarded in a try/catch because the column may not exist in all
    // environments yet.
    try {
      const inferredHit = await client.execute({
        sql: `SELECT COUNT(*) AS n FROM entries
               WHERE lang = ? AND root_inferred = ?`,
        args: [c.language, rootNorm],
      });
      const ni = Number(inferredHit.rows[0]?.n ?? 0);
      if (ni > 0) {
        return { ...c, verification: "root_inferred_match", wiktionary_url: url };
      }
    } catch {
      // column not in this DB yet
    }
  }

  // Last check: was this cognate claim *explicitly made* by a Wiktionary editor
  // even though the Kaikki dump for c.language has no native root annotation?
  // E.g., Ge'ez ሓሳብ carries `{{ar-root|ح س ب}}` — that's a hand-curated claim
  // we ingested into the `cognate_claims` table.
  if (c.surface_root) {
    const rootNorm = normalizeRoot(c.surface_root);
    try {
      const claimHit = await client.execute({
        sql: `SELECT COUNT(*) AS n FROM cognate_claims
              WHERE source_lang = ? AND claimed_root = ?`,
        args: [c.language, rootNorm],
      });
      const n = Number(claimHit.rows[0]?.n ?? 0);
      if (n > 0) {
        return { ...c, verification: "editor_claim", wiktionary_url: url };
      }
    } catch {
      // cognate_claims table might not exist in prod yet — fall through.
    }
  }

  return { ...c, verification: "not_in_index", wiktionary_url: url };
}

export async function verifyCognates(cognates: Cognate[]): Promise<VerifiedCognate[]> {
  return Promise.all(cognates.map(verifyOne));
}
