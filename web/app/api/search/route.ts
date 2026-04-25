import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/search";
import { toNative, type RomanizationScheme } from "@/lib/romanization";
import { verifyCognates } from "@/lib/verify";

// Vercel Pro allows up to 60s; Hobby tier blocks at 10s. LLM calls take 15–40s.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { word?: string; scheme?: RomanizationScheme };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const word = (body.word ?? "").trim();
  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  const input = body.scheme ? toNative(word, body.scheme) : word;

  try {
    const { result, usage } = await runSearch(input);
    const verified = await verifyCognates(result.cognates ?? []);
    return NextResponse.json({
      converted_from: body.scheme ? word : null,
      input: input,
      result: { ...result, cognates: verified },
      usage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
