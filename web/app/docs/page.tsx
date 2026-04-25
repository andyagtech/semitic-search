import Link from "next/link";

export const metadata = {
  title: "API documentation — Semitic Search",
  description:
    "Programmatic endpoints for cross-script cognate lookup, Proto-Semitic reconstruction, and surface-reflex expansion.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-neutral-900 text-neutral-100 text-xs font-mono p-3 rounded overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            API documentation
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            All endpoints are open and rate-limited at the Vercel edge.
            Response format is JSON. No auth required for read endpoints.
          </p>
        </header>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-semibold mb-2">GET /api/cognates</h2>
          <p className="text-sm text-neutral-700 mb-3">
            Find every lemma sharing a canonical root across the 17 Semitic
            varieties in our index. Supports both strict identity matching
            and Proto-Semitic reflex-aware fuzzy matching.
          </p>
          <h3 className="text-sm font-medium mt-3 mb-1">Query parameters</h3>
          <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
            <li><code className="font-mono bg-neutral-100 px-1 rounded">canonical</code> — space-separated phonetic key (required). e.g. <code className="font-mono">k t b</code></li>
            <li><code className="font-mono bg-neutral-100 px-1 rounded">fuzzy</code> — <code className="font-mono">1</code> to include PS-reflex-aware matches. Default: strict identity only.</li>
            <li><code className="font-mono bg-neutral-100 px-1 rounded">per_lang</code> — max lemmas per language. Default 5, cap 10.</li>
            <li><code className="font-mono bg-neutral-100 px-1 rounded">exclude_lang</code> — exclude a language (usually the query source).</li>
          </ul>
          <h3 className="text-sm font-medium mt-3 mb-1">Example</h3>
          <CodeBlock>{`curl "https://semitic-search.andy-barr.com/api/cognates?canonical=k+l+b&fuzzy=1"`}</CodeBlock>
          <p className="text-xs text-neutral-500 mt-2">
            Returns <code className="font-mono">{"{languages, language_names, lemmas, lemma_count, lang_count}"}</code> with per-lemma <code className="font-mono">via_reflex</code> and <code className="font-mono">attestation</code> fields where available.
          </p>
        </section>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-semibold mb-2">GET /api/reflexes</h2>
          <p className="text-sm text-neutral-700 mb-3">
            Inverse query: given a Proto-Semitic reconstructed root (e.g.
            <code className="font-mono mx-1">*Ḏ-H-B</code>), enumerate every
            surface reflex the reflex table predicts and return lemmas
            attested in each language.
          </p>
          <h3 className="text-sm font-medium mt-3 mb-1">Query parameters</h3>
          <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
            <li><code className="font-mono bg-neutral-100 px-1 rounded">proto</code> — space-separated PS labels, uppercase (e.g. <code className="font-mono">Ḏ H B</code>). Required.</li>
            <li><code className="font-mono bg-neutral-100 px-1 rounded">per_lang</code> — max lemmas per language. Default 5, cap 10.</li>
          </ul>
          <h3 className="text-sm font-medium mt-3 mb-1">Example</h3>
          <CodeBlock>{`curl "https://semitic-search.andy-barr.com/api/reflexes?proto=%E1%B8%8E+H+B"
# Ḏ H B — returns Ar ḏ-h-b, He z-h-b, Syc d-h-b reflexes plus lemmas`}</CodeBlock>
        </section>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-semibold mb-2">POST /api/reconstruct</h2>
          <p className="text-sm text-neutral-700 mb-3">
            Given a set of cognate roots across languages, infer the
            Proto-Semitic ancestor with per-slot confidence. Accepts either
            raw script (Arabic/Hebrew/Syriac/etc.) or pre-canonicalized keys.
          </p>
          <h3 className="text-sm font-medium mt-3 mb-1">Body</h3>
          <CodeBlock>{`{ "cognates": [
    ["ar", "ذ ه ب"],
    ["he", "ז ה ב"],
    ["syc", "ܕ ܗ ܒ"]
]}`}</CodeBlock>
          <h3 className="text-sm font-medium mt-3 mb-1">Example</h3>
          <CodeBlock>{`curl -X POST "https://semitic-search.andy-barr.com/api/reconstruct" \\
  -H "content-type: application/json" \\
  -d '{"cognates":[["ar","ذ ه ب"],["he","ז ה ב"]]}'

# → { "ps_root": "Ḏ H B", "overall_confidence": 1.0,
#     "slots": [{ "position": 1, "ps_label": "Ḏ", "confidence": 1.0,
#                 "supporters": ["ar","he"], "dissenters": [], ... }, ...] }`}</CodeBlock>
        </section>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-semibold mb-2">Data downloads</h2>
          <p className="text-sm text-neutral-700 mb-3">
            Bulk JSON for the top 60 polyglot root families, plus the
            empirical reflex weight table derived from editor-curated
            cognate claims.
          </p>
          <CodeBlock>{`curl "https://semitic-search.andy-barr.com/data/root_families.json"
curl "https://semitic-search.andy-barr.com/data/family_slugs.json"
curl "https://semitic-search.andy-barr.com/data/reflex_weights.json"`}</CodeBlock>
          <p className="text-xs text-neutral-500 mt-2">
            Individual root families also have JSON + BibTeX download buttons
            on their <code className="font-mono">/roots/[slug]</code> pages.
          </p>
        </section>

        <section className="mb-6 bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-semibold mb-2">Attribution</h2>
          <p className="text-sm text-neutral-700">
            Wiktionary data used under CC-BY-SA. OSHB (Open Scriptures
            Hebrew Bible) under CC-BY. Quranic Arabic Corpus (Dukes 2011)
            under GPL. Built-in reflex table is hand-curated from
            Lipiński (2001), Huehnergard (2000), and Moscati (1964).
            Please cite the underlying sources when re-publishing data.
          </p>
        </section>
      </div>
    </main>
  );
}
