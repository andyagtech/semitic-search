import Link from "next/link";
import { notFound } from "next/navigation";
import { familyBySlug } from "@/lib/root_families";
import { CompareView } from "./CompareView";

type Params = { pair: string; slug: string };

const LANG_NAME: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Classical Syriac",
  am: "Amharic", ti: "Tigrinya", gez: "Ge'ez",
  ug: "Ugaritic", akk: "Akkadian",
  arc: "Imperial Aramaic", aii: "Assyrian Neo-Aramaic",
  sab: "Sabaean", osa: "Old South Arabian",
  phn: "Phoenician", pun: "Punic",
  tru: "Turoyo", mid: "Classical Mandaic", amw: "Western Neo-Aramaic",
};

function parsePair(pair: string): [string, string] | null {
  const parts = pair.split("-");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!LANG_NAME[a] || !LANG_NAME[b]) return null;
  return [a, b];
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { pair, slug } = await params;
  const parsed = parsePair(pair);
  if (!parsed) return { title: "Comparison not found" };
  const [a, b] = parsed;
  const title = `${LANG_NAME[a]} ↔ ${LANG_NAME[b]} · ${slug} — Semitic Search`;
  const description = `Side-by-side comparison of the root ${slug} in ${LANG_NAME[a]} and ${LANG_NAME[b]}.`;
  return {
    title, description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function ComparePage({ params }: { params: Promise<Params> }) {
  const { pair, slug } = await params;
  const parsed = parsePair(pair);
  if (!parsed) notFound();
  const [a, b] = parsed;

  const fam = familyBySlug(decodeURIComponent(slug));
  if (!fam) notFound();
  if (!fam.languages.includes(a) || !fam.languages.includes(b)) notFound();

  const aLemmas = fam.lemmas[a] ?? [];
  const bLemmas = fam.lemmas[b] ?? [];

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href={`/roots/${encodeURIComponent(slug)}`} className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Full root family
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">
            <span className="font-normal text-neutral-500">Root</span>{" "}
            <span className="font-mono">{fam.canonical.replace(/ /g, "-")}</span>
          </h1>
          <p className="text-neutral-600 mt-2">
            {LANG_NAME[a]} <span className="text-neutral-400">↔</span> {LANG_NAME[b]}
          </p>
        </header>

        <CompareView
          aLang={a}
          bLang={b}
          aName={LANG_NAME[a]}
          bName={LANG_NAME[b]}
          aLemmas={aLemmas}
          bLemmas={bLemmas}
          canonical={fam.canonical}
        />

        <footer className="mt-8 text-xs text-neutral-500 flex flex-wrap gap-3">
          <Link href={`/roots/${encodeURIComponent(slug)}`} className="underline underline-offset-2 hover:text-neutral-800">
            View full family
          </Link>
          <Link href={`/compare/${b}-${a}/${encodeURIComponent(slug)}`} className="underline underline-offset-2 hover:text-neutral-800">
            Swap direction
          </Link>
        </footer>
      </div>
    </main>
  );
}
