import { NextRequest, NextResponse } from "next/server";
import { SemiticSearchResult } from "@/lib/models";
import { validateResult } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parse = SemiticSearchResult.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.message }, { status: 400 });
  }
  try {
    const validation = await validateResult(parse.data);
    return NextResponse.json(validation);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
