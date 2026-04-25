import Link from "next/link";
import { allFamilies } from "@/lib/root_families";

export const metadata = {
  title: "Root families — Semitic Search",
  description:
    "Polyglot Semitic roots attested across many languages — from Akkadian and Ugaritic to modern Amharic and Assyrian Neo-Aramaic.",
};

export default function RootsIndex() {
  const families = allFamilies();
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Root families</h1>
          <p className="text-neutral-600 mt-2">
            Semitic roots attested across many languages — each page shows every indexed
            lemma sharing the root, from Akkadian through modern Neo-Aramaic.
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Built from {families.length} polyglot root families, ranked by number of
            languages attested.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {families.map((f) => (
            <Link
              key={f.slug}
              href={`/roots/${encodeURIComponent(f.slug)}`}
              className="block border border-neutral-200 bg-white rounded-lg p-4 hover:border-neutral-400 hover:shadow-sm transition"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xl font-mono font-semibold">{f.canonical}</span>
                <span className="text-xs text-neutral-500">
                  {f.lang_count} langs · {f.lemma_count} lemmas
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {f.languages.map((l) => (
                  <span
                    key={l}
                    className="text-[10px] font-medium uppercase tracking-wide bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
