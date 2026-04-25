import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuzzyVariants } from "@/lib/fuzzy_canonical";

// Instant cross-script cognate lookup from the canonical-root index.
// Given a canonical phonetic key like "k t b", returns every attested lemma
// across all 17 indexed Semitic varieties that shares that root.
//
// Why canonical keys: Arabic كلب, Hebrew כלב, Syriac ܟܠܒܐ, Phoenician 𐤊𐤋𐤁,
// Akkadian kalbu all share root k-l-b but use different scripts. A
// canonical-root column lets us group them in a single indexed query.

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

// Chronological / genealogical presentation order.
const LANG_ORDER = [
  "akk", "ug", "phn", "pun", "sab", "osa", "arc", "syc", "aii",
  "tru", "mid", "amw", "he", "ar", "gez", "am", "ti",
];

type CognateLemma = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  pos: string;
  gloss: string | null;
  root: string;
  root_canonical: string | null;
  source: string; // 'gold' | 'camel_tools' | ...
  via_reflex: boolean; // true when matched via fuzzy (PS-reflex), not strict identity
  attestation: { source: string; citation: string } | null;
};

export async function GET(req: NextRequest) {
  const canonical = req.nextUrl.searchParams.get("canonical");
  if (!canonical || canonical.length < 3) {
    return NextResponse.json(
      { error: "canonical query param required, e.g. ?canonical=k+t+b" },
      { status: 400 },
    );
  }
  const excludeLang = req.nextUrl.searchParams.get("exclude_lang");
  const perLangLimit = Math.min(
    10,
    Number.parseInt(req.nextUrl.searchParams.get("per_lang") ?? "5", 10) || 5,
  );
  const fuzzy = req.nextUrl.searchParams.get("fuzzy") === "1";

  const client = db();
  try {
    let sql: string;
    let args: unknown[];
    if (fuzzy) {
      // PS-reflex-aware: UNION the strict canonical matches with fuzzy
      // matches from the junction table. The UNION guarantees we never
      // do worse than strict even if the junction table is incomplete.
      const variants = fuzzyVariants(canonical);
      const placeholders = variants.map(() => "?").join(",");
      sql = `
        SELECT lang, word, vocalized_form, romanization, pos, rc, r, gloss, src, eid FROM (
          SELECT e.lang, e.word, e.vocalized_form, e.romanization, e.pos,
                 e.root_canonical AS rc,
                 COALESCE(NULLIF(e.root, ''), e.root_inferred) AS r,
                 json_extract(e.glosses_json, '$[0]') AS gloss,
                 CASE WHEN e.root IS NOT NULL THEN 'gold'
                      ELSE COALESCE(e.root_inferred_source, 'inferred') END AS src,
                 e.id AS eid
            FROM entries e
           WHERE e.root_canonical = ?
          UNION
          SELECT e.lang, e.word, e.vocalized_form, e.romanization, e.pos,
                 e.root_canonical AS rc,
                 COALESCE(NULLIF(e.root, ''), e.root_inferred) AS r,
                 json_extract(e.glosses_json, '$[0]') AS gloss,
                 CASE WHEN e.root IS NOT NULL THEN 'gold'
                      ELSE COALESCE(e.root_inferred_source, 'inferred') END AS src,
                 e.id AS eid
            FROM entries e
            JOIN entry_fuzzy_variants f ON f.entry_id = e.id
           WHERE f.variant IN (${placeholders})
        )
         ORDER BY
           CASE WHEN rc = ? THEN 0 ELSE 1 END,
           CASE WHEN src = 'gold' THEN 0 ELSE 1 END,
           CASE pos WHEN 'verb' THEN 0 WHEN 'noun' THEN 1 WHEN 'adj' THEN 2 ELSE 3 END,
           length(word),
           word
         LIMIT 4000`;
      args = [canonical, ...variants, canonical];
    } else {
      sql = `
        SELECT lang, word, vocalized_form, romanization, pos,
               root_canonical AS rc,
               COALESCE(NULLIF(root, ''), root_inferred) AS r,
               json_extract(glosses_json, '$[0]') AS gloss,
               CASE WHEN root IS NOT NULL THEN 'gold'
                    ELSE COALESCE(root_inferred_source, 'inferred') END AS src,
               id AS eid
          FROM entries
         WHERE root_canonical = ?
         ORDER BY
           CASE WHEN root IS NOT NULL THEN 0 ELSE 1 END,
           CASE pos WHEN 'verb' THEN 0 WHEN 'noun' THEN 1 WHEN 'adj' THEN 2 ELSE 3 END,
           length(word),
           word
         LIMIT 2000`;
      args = [canonical];
    }

    const result = await client.execute({ sql, args: args as never });

    // Fetch earliest attestation per entry_id in one go. Table may not
    // exist yet on Turso — swallow errors and return empty map.
    const entryIds = result.rows
      .map((r) => r.eid)
      .filter((v): v is number | bigint => typeof v === "number" || typeof v === "bigint")
      .map((v) => Number(v));
    const attMap = new Map<number, { source: string; citation: string }>();
    if (entryIds.length > 0) {
      try {
        const attResult = await client.execute({
          sql: `SELECT entry_id, source, citation, book_order FROM attestations
                 WHERE entry_id IN (${entryIds.map(() => "?").join(",")})
                 ORDER BY book_order ASC`,
          args: entryIds as never,
        });
        for (const row of attResult.rows) {
          const eid = Number(row.entry_id);
          if (!attMap.has(eid)) {
            attMap.set(eid, {
              source: row.source as string,
              citation: row.citation as string,
            });
          }
        }
      } catch {
        // attestations table not on Turso yet; silently skip.
      }
    }

    // Group by lang, cap per-lang
    const byLang: Record<string, CognateLemma[]> = {};
    for (const r of result.rows) {
      const lang = r.lang as string;
      if (excludeLang && lang === excludeLang) continue;
      const eid = Number(r.eid);
      (byLang[lang] = byLang[lang] ?? []).push({
        word: r.word as string,
        vocalized_form: (r.vocalized_form as string | null) ?? null,
        romanization: (r.romanization as string | null) ?? null,
        pos: (r.pos as string) ?? "",
        gloss: (r.gloss as string | null) ?? null,
        root: (r.r as string) ?? "",
        root_canonical: (r.rc as string | null) ?? null,
        source: (r.src as string) ?? "inferred",
        via_reflex: fuzzy && (r.rc as string | null) !== canonical,
        attestation: attMap.get(eid) ?? null,
      });
    }
    for (const lang of Object.keys(byLang)) {
      byLang[lang] = byLang[lang].slice(0, perLangLimit);
    }

    const orderedLangs = LANG_ORDER.filter((l) => byLang[l]?.length);
    // Anything not in LANG_ORDER (unknown lang code) tacked on.
    for (const l of Object.keys(byLang)) {
      if (!orderedLangs.includes(l)) orderedLangs.push(l);
    }

    const totalLemmas = Object.values(byLang).reduce((n, arr) => n + arr.length, 0);

    return NextResponse.json({
      canonical,
      fuzzy,
      lang_count: orderedLangs.length,
      lemma_count: totalLemmas,
      languages: orderedLangs,
      language_names: Object.fromEntries(orderedLangs.map((l) => [l, LANG_NAME[l] ?? l])),
      lemmas: Object.fromEntries(orderedLangs.map((l) => [l, byLang[l]])),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
