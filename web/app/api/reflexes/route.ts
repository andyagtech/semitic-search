import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { surfaceVariants } from "@/lib/fuzzy_canonical";

// Inverse query: given a Proto-Semitic root (space-separated PS labels like
// "Ḏ H B"), expand it into every surface canonical its reflexes could
// produce, look up lemmas in each variant, group by language.
//
// Sister to /api/cognates: starts from the proto root rather than a surface
// form. Useful for questions like "what does *ṯ-l-ṯ look like in Akkadian?".

export const runtime = "nodejs";

const LANG_NAME: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Classical Syriac",
  am: "Amharic", ti: "Tigrinya", gez: "Ge'ez",
  ug: "Ugaritic", akk: "Akkadian",
  arc: "Imperial Aramaic", aii: "Assyrian Neo-Aramaic",
  sab: "Sabaean", osa: "Old South Arabian",
  phn: "Phoenician", pun: "Punic",
  tru: "Turoyo", mid: "Classical Mandaic", amw: "Western Neo-Aramaic",
};

const LANG_ORDER = [
  "akk", "ug", "phn", "pun", "sab", "osa", "arc", "syc", "aii",
  "tru", "mid", "amw", "he", "ar", "gez", "am", "ti",
];

export async function GET(req: NextRequest) {
  const proto = req.nextUrl.searchParams.get("proto");
  if (!proto) {
    return NextResponse.json(
      { error: "proto query param required, e.g. ?proto=Ḏ+H+B" },
      { status: 400 },
    );
  }
  const perLangLimit = Math.min(
    10,
    Number.parseInt(req.nextUrl.searchParams.get("per_lang") ?? "5", 10) || 5,
  );

  const variants = surfaceVariants(proto);
  if (!variants.length) {
    return NextResponse.json({ proto, variants: [], lemmas: {} });
  }

  const client = db();
  const placeholders = variants.map(() => "?").join(",");
  try {
    const result = await client.execute({
      sql: `
        SELECT lang, word, vocalized_form, romanization, pos,
               root_canonical AS rc,
               COALESCE(NULLIF(root,''), root_inferred) AS r,
               json_extract(glosses_json, '$[0]') AS gloss,
               CASE WHEN root IS NOT NULL THEN 'gold'
                    ELSE COALESCE(root_inferred_source, 'inferred') END AS src
          FROM entries
         WHERE root_canonical IN (${placeholders})
         ORDER BY
           CASE WHEN root IS NOT NULL THEN 0 ELSE 1 END,
           CASE pos WHEN 'verb' THEN 0 WHEN 'noun' THEN 1 WHEN 'adj' THEN 2 ELSE 3 END,
           length(word), word
         LIMIT 4000`,
      args: variants,
    });

    // Group by (lang, surface canonical) — each language can have multiple
    // distinct reflexes if it has both inherited + borrowed forms.
    type Lemma = {
      word: string; vocalized_form: string | null; romanization: string | null;
      pos: string; gloss: string | null; root: string; source: string;
      surface_canonical: string;
    };
    const byLang: Record<string, Lemma[]> = {};
    const reflexesByLang: Record<string, Set<string>> = {};
    for (const r of result.rows) {
      const lang = r.lang as string;
      const rc = (r.rc as string) ?? "";
      (byLang[lang] = byLang[lang] ?? []).push({
        word: r.word as string,
        vocalized_form: (r.vocalized_form as string | null) ?? null,
        romanization: (r.romanization as string | null) ?? null,
        pos: (r.pos as string) ?? "",
        gloss: (r.gloss as string | null) ?? null,
        root: (r.r as string) ?? "",
        source: (r.src as string) ?? "inferred",
        surface_canonical: rc,
      });
      (reflexesByLang[lang] = reflexesByLang[lang] ?? new Set()).add(rc);
    }
    for (const lang of Object.keys(byLang)) {
      byLang[lang] = byLang[lang].slice(0, perLangLimit);
    }

    const orderedLangs = LANG_ORDER.filter((l) => byLang[l]?.length);
    for (const l of Object.keys(byLang)) {
      if (!orderedLangs.includes(l)) orderedLangs.push(l);
    }

    return NextResponse.json({
      proto,
      variants,
      lang_count: orderedLangs.length,
      lemma_count: Object.values(byLang).reduce((n, arr) => n + arr.length, 0),
      languages: orderedLangs,
      language_names: Object.fromEntries(orderedLangs.map((l) => [l, LANG_NAME[l] ?? l])),
      reflexes_by_lang: Object.fromEntries(
        orderedLangs.map((l) => [l, [...(reflexesByLang[l] ?? [])]]),
      ),
      lemmas: Object.fromEntries(orderedLangs.map((l) => [l, byLang[l]])),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
