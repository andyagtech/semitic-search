import Link from "next/link";
import { allFamilies } from "@/lib/root_families";

export const metadata = {
  title: "Semantic themes — Semitic Search",
  description:
    "Browse Semitic root families by their extracted gloss themes. Surfaces semantic clusters — all 'king' roots, all 'eye' roots, etc. — across 17 languages.",
};

export default function ThemesPage() {
  const families = allFamilies();

  // Invert: theme word → list of families whose top themes include it.
  const themeIndex: Record<string, { slug: string; canonical: string; count: number; lang_count: number }[]> = {};
  for (const f of families) {
    for (const t of f.themes ?? []) {
      (themeIndex[t.word] = themeIndex[t.word] ?? []).push({
        slug: f.slug, canonical: f.canonical, count: t.count, lang_count: f.lang_count,
      });
    }
  }
  // Sort each theme's families by count, then lang_count
  for (const k of Object.keys(themeIndex)) {
    themeIndex[k].sort((a, b) => b.count - a.count || b.lang_count - a.lang_count);
  }

  // Only show themes that appear across multiple families OR have high frequency.
  const themesSorted = Object.entries(themeIndex)
    .map(([word, fams]) => ({ word, fams, totalCount: fams.reduce((n, f) => n + f.count, 0) }))
    .filter((t) => t.fams.length >= 2 || t.totalCount >= 5)
    .sort((a, b) => b.fams.length - a.fams.length || b.totalCount - a.totalCount);

  // Also compute shared-themes: when 2+ root families list the same theme
  // word, those roots are semantically neighboring (e.g., "water" across
  // m-y-m and m-ṭ-r).
  const shared = themesSorted.filter((t) => t.fams.length >= 2);
  const unique = themesSorted.filter((t) => t.fams.length === 1);

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Semantic themes
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            English gloss words that appear across multiple root families,
            automatically extracted from lemma glosses. Themes shared by
            two or more root families reveal semantic neighborhoods —
            e.g., &quot;water&quot; linking several roots, or &quot;write&quot;
            cross-referencing books, scripture, and scholarship.
          </p>
        </header>

        {shared.length > 0 && (
          <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
            <h2 className="text-lg font-semibold mb-3">
              Shared themes
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                {shared.length} theme{shared.length === 1 ? "" : "s"} spanning multiple roots
              </span>
            </h2>
            <ul className="space-y-2">
              {shared.map((t) => (
                <li key={t.word} className="flex items-baseline justify-between gap-3 flex-wrap py-1 border-b border-neutral-100 last:border-b-0">
                  <span className="font-semibold text-neutral-900 capitalize min-w-20">{t.word}</span>
                  <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
                    {t.fams.slice(0, 8).map((f) => (
                      <Link
                        key={f.slug}
                        href={`/roots/${encodeURIComponent(f.slug)}`}
                        className="text-xs font-mono px-2 py-0.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-white hover:border-neutral-500"
                        title={`${f.count} gloss mentions · ${f.lang_count} langs`}
                      >
                        {f.canonical.replace(/ /g, "-")}
                        <span className="ml-1 text-[10px] text-neutral-500">·{f.count}</span>
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unique.length > 0 && (
          <section className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
            <h2 className="text-lg font-semibold mb-3">
              Single-root themes
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                distinctive, root-specific keywords
              </span>
            </h2>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {unique.slice(0, 60).map((t) => (
                <li key={t.word} className="flex items-baseline justify-between gap-2 py-0.5">
                  <span className="capitalize">{t.word}</span>
                  <Link
                    href={`/roots/${encodeURIComponent(t.fams[0].slug)}`}
                    className="font-mono text-xs text-blue-700 hover:underline underline-offset-2"
                  >
                    {t.fams[0].canonical.replace(/ /g, "-")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
