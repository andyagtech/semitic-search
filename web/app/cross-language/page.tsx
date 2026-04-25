import Link from "next/link";
import { allFamilies } from "@/lib/root_families";

export const metadata = {
  title: "Cross-language search — Semitic Search",
  description:
    "Find root families attested in a specific set of Semitic languages. Useful for isolating shared vocabulary across branches.",
};

type Params = Promise<{ langs?: string }>;

const LANG_NAME: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Classical Syriac",
  am: "Amharic", ti: "Tigrinya", gez: "Ge'ez",
  ug: "Ugaritic", akk: "Akkadian",
  arc: "Imperial Aramaic", aii: "Assyrian Neo-Aramaic",
  sab: "Sabaean", osa: "Old South Arabian",
  phn: "Phoenician", pun: "Punic",
  tru: "Turoyo", mid: "Classical Mandaic", amw: "Western Neo-Aramaic",
};

const ALL_LANGS = Object.keys(LANG_NAME);

export default async function CrossLanguagePage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const requested = (sp?.langs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const validRequested = requested.filter((l) => ALL_LANGS.includes(l));

  const families = allFamilies();

  const matches = validRequested.length === 0
    ? []
    : families.filter((f) => validRequested.every((l) => f.languages.includes(l)));

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Cross-language set search
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Find root families attested in <i>every</i> language you select.
            Useful for isolating shared vocabulary across specific branches —
            e.g. roots common to Arabic + Akkadian + Ugaritic expose the
            oldest Semitic layer.
          </p>
        </header>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-sm font-semibold mb-3">Pick languages</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((l) => {
              const selected = validRequested.includes(l);
              const next = selected
                ? validRequested.filter((x) => x !== l)
                : [...validRequested, l];
              return (
                <Link
                  key={l}
                  href={next.length > 0 ? `/cross-language?langs=${next.join(",")}` : "/cross-language"}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    selected
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {LANG_NAME[l]} <span className="opacity-60">{l}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="text-neutral-500">Quick picks:</span>
            <Link href="/cross-language?langs=ar,he,syc,akk"
                  className="text-blue-700 hover:underline underline-offset-2">
              Ar + He + Syc + Akk (four pillars)
            </Link>
            <Link href="/cross-language?langs=akk,ug,phn"
                  className="text-blue-700 hover:underline underline-offset-2">
              Akk + Ug + Phn (oldest attested)
            </Link>
            <Link href="/cross-language?langs=gez,am,ti"
                  className="text-blue-700 hover:underline underline-offset-2">
              Gez + Am + Ti (Ethio-Semitic)
            </Link>
            <Link href="/cross-language?langs=syc,arc,aii,tru,mid"
                  className="text-blue-700 hover:underline underline-offset-2">
              Aramaic varieties
            </Link>
          </div>
        </section>

        {validRequested.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            Select at least one language above.
          </p>
        ) : (
          <section className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-3">
              {matches.length} root famil{matches.length === 1 ? "y" : "ies"} attested in
              all of: <span className="font-mono">{validRequested.join(" ∩ ")}</span>
            </h2>
            {matches.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No curated root family in our top-60 set covers all of these.
                Try fewer / more common languages.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {matches.map((f) => (
                  <li key={f.slug}>
                    <Link
                      href={`/roots/${encodeURIComponent(f.slug)}`}
                      className="flex items-baseline justify-between gap-3 px-3 py-2 rounded border border-neutral-200 bg-neutral-50 hover:bg-white hover:border-neutral-400"
                    >
                      <span className="font-mono font-semibold">{f.canonical.replace(/ /g, "-")}</span>
                      <span className="text-xs text-neutral-500">
                        {f.lang_count} langs · {f.lemma_count} lemmas
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
