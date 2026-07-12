import { NextResponse } from "next/server";
import OpenAI from "openai";
import { transliterate, type FreeTextCandidate } from "@/lib/free_text";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-3.1-pro-preview";

export const runtime = "nodejs";

type Body = {
  text?: string;
  llm?: boolean;   // if true, always call the LLM as a second pass
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ candidates: [] });

  const ruleCandidates = transliterate(text);

  // If the rule-based path produced a high-confidence candidate and
  // the caller didn't force LLM, ship those directly.
  const hasHigh = ruleCandidates.some((c) => c.confidence === "high");
  if (hasHigh && !body.llm) {
    return NextResponse.json({ candidates: ruleCandidates, mode: "rules" });
  }

  // Otherwise consult the model. It has to be non-blocking to the
  // rule-based candidates: we return both and let the client show them
  // ordered by confidence.
  let llmCandidates: FreeTextCandidate[] = [];
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      llmCandidates = await callModel(text, apiKey);
    } catch (err) {
      console.error("free_text LLM error", err);
    }
  }
  const merged = mergeCandidates(ruleCandidates, llmCandidates);
  return NextResponse.json({
    candidates: merged,
    mode: llmCandidates.length ? "rules+llm" : "rules",
  });
}

async function callModel(text: string, apiKey: string): Promise<FreeTextCandidate[]> {
  const client = new OpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL });
  const sys = `You convert Latin-alphabet / Arabizi input into the intended Semitic-script word(s).

Return STRICT JSON: {"candidates": [{"script": "ar"|"he"|"syr", "text": "...", "why": "..."}]}

Rules:
- "script" is one of ar (Arabic), he (Hebrew square), syr (Syriac).
- "text" is the native-script rendering (with vowels where obvious).
- "why" is a one-sentence justification.
- Return up to 3 candidates, most likely first.
- Prefer common Modern Standard forms. Do not invent vocalizations you aren't sure about.`;

  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: text },
    ],
  });
  const content = res.choices[0]?.message?.content ?? "";
  if (!content) return [];
  let parsed: { candidates?: Array<{ script?: string; text?: string; why?: string }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const out: FreeTextCandidate[] = [];
  for (const c of parsed.candidates ?? []) {
    if (!c.text) continue;
    const script = c.script === "ar" || c.script === "he" || c.script === "syr" ? c.script : null;
    if (!script) continue;
    out.push({
      script,
      text: c.text,
      confidence: "high",
      why: c.why ? `LLM: ${c.why}` : "LLM suggestion",
    });
  }
  return out;
}

function mergeCandidates(
  rules: FreeTextCandidate[],
  llm: FreeTextCandidate[],
): FreeTextCandidate[] {
  const key = (c: FreeTextCandidate) => `${c.script}|${c.text}`;
  const seen = new Map<string, FreeTextCandidate>();
  // LLM candidates first (higher trust), then rule-based to fill gaps.
  for (const c of [...llm, ...rules]) {
    const k = key(c);
    if (!seen.has(k)) seen.set(k, c);
  }
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...seen.values()].sort(
    (a, b) => (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3),
  );
}
