import { NextRequest, NextResponse } from "next/server";
import { reconstruct } from "@/lib/reconstruct";
import { canonical } from "@/lib/canonical_root";

// POST /api/reconstruct
// Body: {"cognates": [["ar", "ذ ه ب"], ["he", "ז ה ב"], ...]}
//       or [["ar", "ḏ h b"], ...] with pre-canonicalized keys.
//
// Returns the Proto-Semitic reconstruction with per-slot confidence.
// Intended for programmatic use — the UI on the search result page already
// computes this client-side, but researchers / other tools can hit the API.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const cognates = (body as { cognates?: unknown })?.cognates;
  if (!Array.isArray(cognates)) {
    return NextResponse.json(
      { error: "Body must be {\"cognates\": [[lang, root], ...]}" },
      { status: 400 },
    );
  }
  const pairs: [string, string][] = [];
  const skipped: string[] = [];
  for (const item of cognates) {
    if (!Array.isArray(item) || item.length !== 2) continue;
    const [l, r] = item;
    if (typeof l !== "string" || typeof r !== "string") continue;
    // If the root contains non-Latin script characters, canonicalize first.
    // Otherwise accept as-is (assume caller already canonicalized).
    const looksCanonical = /^[bdfghjklmnpqrstvwyz \-]+$/i.test(r) || /^[A-Z\sḌḎḪḤḏḍḫḥḡġÍÌṠṢṬẒṮʾʿśšṣẓṯṭ]+$/.test(r);
    const c = looksCanonical ? r : canonical(r);
    if (!c) {
      skipped.push(`${l}:${r}`);
      continue;
    }
    pairs.push([l, c]);
  }
  if (pairs.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 (lang, root) pairs" },
      { status: 400 },
    );
  }
  const result = reconstruct(pairs);
  return NextResponse.json({ ...result, skipped_inputs: skipped });
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /api/reconstruct with {\"cognates\": [[\"ar\",\"ḏ h b\"], [\"he\",\"z h b\"]]}",
    note: "Returns the PS reconstruction with per-slot confidence.",
  });
}
