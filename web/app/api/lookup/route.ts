import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Fast endpoint — direct Turso query, no LLM.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang");
  const word = sp.get("word");
  const root = sp.get("root");

  if (!lang || (!word && !root)) {
    return NextResponse.json(
      { error: "lang and (word or root) are required" },
      { status: 400 },
    );
  }

  const client = db();
  try {
    let result;
    if (word) {
      result = await client.execute({
        sql: "SELECT word, etymology_number, pos, root, vocalized_form, romanization, glosses_json, etymology_text, wiktionary_title FROM entries WHERE lang = ? AND word = ? ORDER BY etymology_number, pos LIMIT 50",
        args: [lang, word],
      });
    } else {
      result = await client.execute({
        sql: "SELECT word, etymology_number, pos, root, vocalized_form, romanization, glosses_json, etymology_text, wiktionary_title FROM entries WHERE lang = ? AND root = ? ORDER BY word LIMIT 100",
        args: [lang, root!],
      });
    }

    const rows = result.rows.map((r) => ({
      word: r.word,
      etymology_number: r.etymology_number,
      pos: r.pos,
      root: r.root,
      vocalized_form: r.vocalized_form,
      romanization: r.romanization,
      glosses: JSON.parse((r.glosses_json as string) || "[]") as string[],
      etymology_text: r.etymology_text,
      wiktionary_title: r.wiktionary_title,
    }));

    return NextResponse.json({ lang, query: { word, root }, count: rows.length, entries: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
