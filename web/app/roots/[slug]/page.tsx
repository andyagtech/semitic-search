import Link from "next/link";
import { notFound } from "next/navigation";
import { allFamilies, familyBySlug } from "@/lib/root_families";
import { classifyRoot, ROOT_CLASS_LABEL, ROOT_CLASS_DESCRIPTION } from "@/lib/root_class";
import { getGlossTranslation } from "@/lib/gloss_translations";
import { RootFamilyView } from "./RootFamilyView";
import { EtymologyTree } from "./EtymologyTree";

// Find other root families sharing at least 2 of 3 consonants — surfaces
// the phono-semantic neighborhood. Two 3-consonant roots are "related" iff
// they share exactly 2 consonants (either at the same positions, to catch
// same-root doublets, or any 2, to catch metathesis/ablaut pairs).
function relatedRoots(target: string, families: { canonical: string; slug: string; lang_count: number; lemma_count: number }[], limit = 8) {
  const targetConsonants = target.split(" ").filter(Boolean);
  if (targetConsonants.length !== 3) return [];
  const targetSet = new Set(targetConsonants);
  const scored: { slug: string; canonical: string; lang_count: number; lemma_count: number; shared: number; sameOrder: number }[] = [];
  for (const f of families) {
    if (f.canonical === target) continue;
    const phonemes = f.canonical.split(" ").filter(Boolean);
    if (phonemes.length !== 3) continue;
    const shared = phonemes.filter((p) => targetSet.has(p)).length;
    if (shared < 2) continue;
    const sameOrder = phonemes.reduce((n, p, i) => n + (p === targetConsonants[i] ? 1 : 0), 0);
    scored.push({ slug: f.slug, canonical: f.canonical, lang_count: f.lang_count, lemma_count: f.lemma_count, shared, sameOrder });
  }
  scored.sort((a, b) => (b.sameOrder - a.sameOrder) || (b.lang_count - a.lang_count));
  return scored.slice(0, limit);
}

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return allFamilies().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const fam = familyBySlug(decodeURIComponent(slug));
  if (!fam) return { title: "Root not found" };
  const title = `Root ${fam.canonical.replace(/ /g, "-")} — Semitic Search`;
  const description = `${fam.lemma_count} lemmas across ${fam.lang_count} Semitic languages sharing the root ${fam.canonical}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function RootFamilyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const fam = familyBySlug(decodeURIComponent(slug));
  if (!fam) notFound();

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/roots" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← All root families
          </Link>
          <div className="mt-4 flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight">
              {fam.canonical}
            </h1>
            <div className="text-sm text-neutral-600">
              {fam.lemma_count} lemmas · {fam.lang_count} languages
            </div>
          </div>
          {(() => {
            const klass = classifyRoot(fam.canonical);
            const ea = fam.earliest_attestation;
            if (klass === "unknown" && !ea) return null;
            return (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {klass !== "unknown" && (
                  <>
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200"
                      title={ROOT_CLASS_DESCRIPTION[klass]}
                    >
                      {ROOT_CLASS_LABEL[klass]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {ROOT_CLASS_DESCRIPTION[klass].split("—")[0].trim()}
                    </span>
                  </>
                )}
                {ea && (() => {
                  const icon =
                    ea.source === "tanakh" ? "📜" :
                    ea.source === "quran"  ? "☪︎" :
                    ea.source === "mishnah"? "✡︎" :
                    (ea.source === "onkelos" || ea.source === "jonathan" || ea.source === "neofiti" || ea.source === "jerusalem") ? "𐡀" : "•";
                  const title =
                    ea.source === "tanakh"    ? `Earliest Biblical attestation: ${ea.citation}` :
                    ea.source === "quran"     ? `Earliest Qur'anic attestation: ${ea.citation}` :
                    ea.source === "mishnah"   ? `Earliest Mishnaic attestation: ${ea.citation}` :
                    ea.source === "onkelos"   ? `Attested in Targum Onkelos: ${ea.citation}` :
                    ea.source === "jonathan"  ? `Attested in Targum Jonathan: ${ea.citation}` :
                    ea.source === "neofiti"   ? `Attested in Targum Neofiti: ${ea.citation}` :
                    ea.source === "jerusalem" ? `Attested in Targum Jerusalem: ${ea.citation}` :
                                                `Earliest attestation: ${ea.source} ${ea.citation}`;
                  return (
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono"
                      title={title}
                    >
                      {icon} {ea.citation}
                    </span>
                  );
                })()}
              </div>
            );
          })()}
          {fam.themes && fam.themes.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Themes:</span>
              {fam.themes.map((t) => {
                const tr = getGlossTranslation(t.word);
                const title = tr
                  ? `"${t.word}" → ${tr.ar} (${tr.ar_roman}) · ${tr.he} (${tr.he_roman}) · appears in ${t.count} glosses`
                  : `Appears in ${t.count} glosses across this root's lemmas`;
                return (
                  <span
                    key={t.word}
                    className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200"
                    title={title}
                  >
                    {t.word}
                    {tr && (
                      <span className="ml-1.5 font-medium" dir="rtl">
                        · <span className="text-blue-800">{tr.ar}</span>
                        {" · "}
                        <span className="text-blue-800">{tr.he}</span>
                      </span>
                    )}
                    <span className="ml-1 text-[10px] text-blue-600">·{t.count}</span>
                  </span>
                );
              })}
            </div>
          )}
          {(() => {
            // POS breakdown — a quick view of what kinds of words this
            // root produced. Nouns vs verbs vs adjectives across the family
            // gives a rough measure of its derivational productivity.
            const counts: Record<string, number> = {};
            for (const lang of fam.languages) {
              for (const l of fam.lemmas[lang] ?? []) {
                const pos = l.pos || "other";
                counts[pos] = (counts[pos] ?? 0) + 1;
              }
            }
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) return null;
            return (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500 uppercase tracking-wider">POS shape:</span>
                {entries.map(([pos, n]) => (
                  <span
                    key={pos}
                    className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200"
                  >
                    {pos}
                    <span className="ml-1 text-[10px] text-neutral-500">·{n}</span>
                  </span>
                ))}
              </div>
            );
          })()}
          <p className="text-neutral-600 mt-3 text-sm">
            This root is attested across {fam.lang_count} Semitic languages in our index.
            Each section below shows representative lemmas; <b>attested</b> means a
            Wiktionary editor explicitly tagged the root, <b>inferred</b> means we derived
            it mechanically from the word&apos;s consonantal skeleton.
          </p>
        </header>

        <div className="mb-5">
          <EtymologyTree family={fam} />
        </div>

        <RootFamilyView family={fam} />

        {(() => {
          const related = relatedRoots(fam.canonical, allFamilies());
          if (related.length === 0) return null;
          return (
            <section className="mt-6 bg-white border border-neutral-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-neutral-700 mb-2">
                Related roots
                <span className="ml-2 text-xs text-neutral-500 font-normal">
                  share 2 of 3 consonants with {fam.canonical.replace(/ /g, "-")}
                </span>
              </h2>
              <ul className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/roots/${encodeURIComponent(r.slug)}`}
                      className="inline-flex items-baseline gap-1.5 text-sm px-2 py-1 rounded border border-neutral-300 bg-white hover:border-neutral-500 hover:bg-neutral-50"
                    >
                      <span className="font-mono font-semibold">{r.canonical.replace(/ /g, "-")}</span>
                      <span className="text-[10px] text-neutral-500">
                        {r.lang_count} langs · {r.sameOrder === 3 ? "same" : `${r.sameOrder}/3 same-pos`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {fam.languages.length >= 2 && (
          <section className="mt-6 bg-white border border-neutral-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 mb-2">
              Compare two languages side-by-side
            </h2>
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Pairs: always include the two most-documented cognate
                // pairs plus the first lang × everyone else.
                const langs = fam.languages;
                const pairs: [string, string][] = [];
                for (let i = 1; i < Math.min(langs.length, 6); i++) {
                  pairs.push([langs[0], langs[i]]);
                }
                return pairs.map(([a, b]) => (
                  <Link
                    key={`${a}-${b}`}
                    href={`/compare/${a}-${b}/${encodeURIComponent(fam.slug)}`}
                    className="text-xs px-2 py-1 rounded border border-neutral-300 bg-white hover:border-neutral-500 hover:bg-neutral-50 font-mono"
                  >
                    {a} ↔ {b}
                  </Link>
                ));
              })()}
            </div>
          </section>
        )}

        <footer className="mt-8 text-xs text-neutral-500">
          <Link href={`/?q=${encodeURIComponent(fam.languages[0])}`} className="underline">
            Run a Semitic Search for this root
          </Link>
        </footer>
      </div>
    </main>
  );
}
