/**
 * POST /api/loan-replace — Semitic Loan Replacement Generator.
 * Sibling of Turkic Search's endpoint; same shape.
 */

import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { LOAN_REPLACE_SYSTEM_PROMPT } from "@/lib/loan_replace_prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_PRIMARY_MODEL = "google/gemini-3.1-pro-preview";
const MAX_TOKENS = 16000;

const SCHEMA_HINT = `{
  "input_word": string,
  "detected_language": "ar"|"he"|"syc"|"am"|"ti"|"akk"|"ug"|"osa",
  "detected_language_name": string,
  "detected_source": "inherited"|"aramaic"|"greek"|"persian"|"arabic"|"turkish"|"european"|"other-loan"|"unknown",
  "original_meaning": string,
  "source_form": string|null,
  "replacements": [{
    "candidate": string,
    "mechanic": "native-stock"|"reflex-adapted",
    "gloss": string,
    "derivation": string,
    "plausibility": "strong"|"reasonable"|"speculative",
    "based_on": string|null,
    "notes": string|null
  }],
  "caveats": [string]
}`;

/** Extract the first balanced JSON object substring; tolerates trailing markdown. */
function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) return text;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new NextResponse("OPENROUTER_API_KEY is not configured", { status: 500 });

  let body: { word?: unknown };
  try { body = await req.json(); }
  catch { return new NextResponse("Body must be JSON", { status: 400 }); }
  const word = typeof body.word === "string" ? body.word.trim() : "";
  if (!word) return new NextResponse("`word` is required", { status: 400 });

  const model = process.env.SEMITIC_SEARCH_PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL;
  const client = new OpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL });

  const systemWithSchema =
    LOAN_REPLACE_SYSTEM_PROMPT +
    "\n\n# OUTPUT SCHEMA\nReturn a single JSON object (no markdown fences, no prose) matching:\n\n" +
    SCHEMA_HINT;

  try {
    const completion = await client.chat.completions.create({
      model, max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemWithSchema },
        { role: "user", content: `Generate imagined native replacements for this loanword: ${word}` },
      ],
    }, {
      headers: {
        "HTTP-Referer": "https://semitic-search.andy-barr.com",
        "X-Title": "Semitic Search Loan Replacement",
      },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return new NextResponse(`Empty response from ${model}`, { status: 502 });

    try {
      const parsed = JSON.parse(extractFirstJsonObject(raw));
      return NextResponse.json(parsed);
    } catch {
      return new NextResponse(`Non-JSON response (first 400): ${raw.slice(0, 400)}`, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Upstream error: ${message}`, { status: 502 });
  }
}
