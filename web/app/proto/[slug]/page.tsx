import Link from "next/link";
import { ProtoFamilyView } from "./ProtoFamilyView";

type Params = { slug: string };

// Slug format: dash-separated PS labels, e.g. "d-h-b" for *ḏ-h-b.
// Route component is a thin wrapper around the client view, which fetches
// surface reflexes from /api/reflexes.

function slugToProtoRoot(slug: string): string {
  // Convert "d-h-b" → "Ḏ H B" using our PS label casing. User-typed lowercase
  // IDs map back to the canonical uppercase label set via a fixed table.
  const LABEL_CASE: Record<string, string> = {
    b: "B", p: "P", f: "F",
    t: "T", d: "D", "ṯ": "Ṯ", "ḏ": "Ḏ",
    s: "S", z: "Z", "ś": "Ś", "š": "Š",
    "ṣ": "Ṣ", "ḍ": "Ḍ", "ẓ": "Ẓ", "ṭ": "Ṭ",
    k: "K", g: "G", q: "Q",
    m: "M", n: "N", l: "L", r: "R",
    "ḥ": "Ḥ", "ḫ": "Ḫ", h: "H",
    "ʾ": "ʾ", "ʿ": "ʿ", "ġ": "Ġ",
    w: "W", y: "Y",
  };
  return slug
    .split("-")
    .map((c) => LABEL_CASE[c] ?? c.toUpperCase())
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const ps = slugToProtoRoot(decodeURIComponent(slug)).toLowerCase().replace(/ /g, "-");
  const title = `Proto-Semitic *${ps} — surface reflexes`;
  const description = `Predicted reflexes of the Proto-Semitic root *${ps} across 17 Semitic languages.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ProtoRootPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const protoRoot = slugToProtoRoot(decodeURIComponent(slug));
  const display = protoRoot.toLowerCase().replace(/ /g, "-");
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight">
              <span className="text-amber-700">*</span>{display}
            </h1>
            <p className="text-neutral-600 mt-3 text-sm">
              Proto-Semitic reconstruction. Each language preserves or mutates
              the proto consonants according to its own reflex rules —
              below are the predicted surface forms and any lemmas attested
              in the index.
            </p>
          </div>
        </header>
        <ProtoFamilyView protoRoot={protoRoot} />
      </div>
    </main>
  );
}
