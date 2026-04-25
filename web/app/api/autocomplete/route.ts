import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  detectScript,
  SCRIPT_TO_LANG,
  stripCombining,
  toNative,
  type RomanizationScheme,
} from "@/lib/romanization";
import { INDEXED_LANGS } from "@/lib/verify";

export const runtime = "nodejs";

const LIMIT = 10;
const MIN_QUERY_LEN = 2;

const LANG_NAME: Record<string, string> = {
  ar: "Arabic",
  he: "Hebrew",
  syc: "Syriac",
  am: "Amharic",
  ti: "Tigrinya",
  gez: "Ge'ez",
};

// Strip Latin diacritics + common Semitic digraphs so the user typing naïve
// English-like spelling (`shalom`, `khalifa`, `kitab`) matches DB romanizations
// using academic transliteration (`šalom`, `ḫalīfa`, `kitāb`). Applied to
// BOTH the user query and the stored romanization so they land in the same
// normalized space before prefix-matching.
function normalizeRoman(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/[^a-z0-9 ]/g, "") // strip modifier letters (ʾ, ʿ, etc.)
    // Collapse common English-style digraphs to their single-char equivalents.
    // Order matters: do two-char sequences before the (no-op) char rules.
    .replace(/sh/g, "s")
    .replace(/ch/g, "h")
    .replace(/kh/g, "h")
    .replace(/th/g, "t")
    .replace(/dh/g, "d")
    .replace(/gh/g, "g")
    .replace(/ts/g, "s")
    .replace(/tz/g, "s");
}

type Suggestion = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  root: string | null;
  pos: string;
  first_gloss: string | null;
  lang: string;
  lang_name?: string;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const qRaw = (sp.get("q") ?? "").trim();
  let lang = sp.get("lang");
  const scheme = sp.get("scheme") as RomanizationScheme | null;

  if (qRaw.length < MIN_QUERY_LEN) {
    return NextResponse.json({ q: qRaw, lang, suggestions: [] });
  }

  // Resolve the "native-prefix" lang (if any). Only used when the input is in
  // a native Semitic script — then we can do a prefix match on the `word`
  // column. For Latin input, we ALWAYS do cross-language romanization search
  // regardless of mode, so the user sees Arabic كِتَاب + Hebrew כּוֹתֵב side by side.
  if (!lang) {
    const inferred = SCRIPT_TO_LANG[detectScript(qRaw)];
    if (inferred) lang = inferred;
  }

  // Latin input (with or without a romanization scheme) → cross-language
  // romanization search across all indexed languages. SQLite's LIKE is accent-
  // sensitive and LOWER only handles ASCII, so `šalom` won't match `LIKE 's%'`.
  // We expand the first char into a GLOB character class that includes common
  // diacritic variants, and then post-filter in JS with a fuller normalizer.
  if (!lang) {
    const qNorm = normalizeRoman(qRaw);
    if (!qNorm) {
      return NextResponse.json({ q: qRaw, lang: null, cross_language: true, suggestions: [] });
    }
    const firstChar = qNorm[0];
    const FIRST_CHAR_CLASS: Record<string, string> = {
      a: "aāăâAĀĂÂ",
      e: "eēĕêEĒĔÊ",
      i: "iīĭîIĪĬÎ",
      o: "oōŏôOŌŎÔ",
      u: "uūŭûUŪŬÛ",
      s: "sšṣśSŠṢŚ",
      t: "tṭṯẗTṬṮ",
      h: "hḥḫẖHḤḪ",
      d: "dḏDḎ",
      z: "zẓZẒ",
      g: "gǧġGǦĠ",
      k: "kḳKḲ",
      c: "cçCÇ",
      n: "nṇNṆ",
      r: "rṛRṚ",
      l: "lḷLḶ",
      m: "mMṃṂ",
    };
    const charClass = FIRST_CHAR_CLASS[firstChar] ?? firstChar;
    const globPattern = `[${charClass}]*`;
    const client = db();
    try {
      const placeholders = INDEXED_LANGS.map(() => "?").join(",");
      // Cast a wide net per-language so Hebrew/Syriac/Ethio-Semitic matches
      // aren't starved by Arabic (which has 75K of 99K entries). 500 rows per
      // indexed language gives us enough candidates to post-filter precisely.
      const perLangSql = INDEXED_LANGS.map(
        () => `
          SELECT lang, word, vocalized_form, romanization, root, pos,
                 json_extract(glosses_json, '$[0]') AS first_gloss
            FROM entries
           WHERE lang = ?
             AND romanization IS NOT NULL
             AND romanization GLOB ?
           LIMIT 500`,
      ).join(" UNION ALL ");
      const perLangArgs = INDEXED_LANGS.flatMap((l) => [l, globPattern]);
      const result = await client.execute({ sql: perLangSql, args: perLangArgs });

      type Cand = Suggestion & { _sortKey: [number, number, string] };
      const candidates: Cand[] = [];
      for (const r of result.rows) {
        const rom = (r.romanization as string | null) ?? "";
        if (!normalizeRoman(rom).startsWith(qNorm)) continue;
        const l = r.lang as string;
        const root = (r.root as string | null) ?? null;
        candidates.push({
          word: r.word as string,
          vocalized_form: (r.vocalized_form as string | null) ?? null,
          romanization: rom || null,
          root,
          pos: (r.pos as string) ?? "",
          first_gloss: (r.first_gloss as string | null) ?? null,
          lang: l,
          lang_name: LANG_NAME[l] ?? l,
          _sortKey: [root ? 0 : 1, rom.length, rom.toLowerCase()],
        });
      }

      candidates.sort((a, b) => {
        if (a._sortKey[0] !== b._sortKey[0]) return a._sortKey[0] - b._sortKey[0];
        if (a._sortKey[1] !== b._sortKey[1]) return a._sortKey[1] - b._sortKey[1];
        return a._sortKey[2] < b._sortKey[2] ? -1 : a._sortKey[2] > b._sortKey[2] ? 1 : 0;
      });

      const suggestions = candidates.slice(0, LIMIT).map(({ _sortKey, ...s }) => s);
      return NextResponse.json({ q: qRaw, lang: null, cross_language: true, suggestions });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Single-language path: we know `lang` (from native script detection or a
  // romanization scheme). Match native-script prefix on `word`.
  // If scheme is given, convert romanization → native script, then strip combining
  // marks (niqqud / shin dots / harakat) because `word` is unvocalized.
  let native = qRaw;
  if (scheme) {
    try {
      native = toNative(qRaw, scheme);
    } catch {
      /* leave as-is */
    }
  }
  native = stripCombining(native);

  const client = db();
  try {
    // Two-pronged match:
    //   a) native-script prefix on `word` (after stripping combining marks)
    //   b) romanization prefix on `romanization` (when the user typed Latin)
    // We rank: entries with a root first, then shorter words, then alphabetical.
    const result = await client.execute({
      sql: `
        SELECT word, vocalized_form, romanization, root, pos,
               (SELECT json_extract(glosses_json, '$[0]')) AS first_gloss
        FROM entries
        WHERE lang = ?
          AND (
            word LIKE ?
            OR romanization LIKE ?
          )
        ORDER BY
          CASE WHEN root IS NOT NULL THEN 0 ELSE 1 END,
          length(word),
          word
        LIMIT ?`,
      args: [lang, `${native}%`, `${qRaw.toLowerCase()}%`, LIMIT],
    });

    const suggestions: Suggestion[] = result.rows.map((r) => ({
      word: r.word as string,
      vocalized_form: (r.vocalized_form as string | null) ?? null,
      romanization: (r.romanization as string | null) ?? null,
      root: (r.root as string | null) ?? null,
      pos: (r.pos as string) ?? "",
      first_gloss: (r.first_gloss as string | null) ?? null,
      lang: lang!,
      lang_name: LANG_NAME[lang!] ?? lang!,
    }));

    return NextResponse.json({ q: qRaw, lang, suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
