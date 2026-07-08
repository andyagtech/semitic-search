import Link from "next/link";
import { TABLES } from "@/lib/comparison";

export default function TablesIndex() {
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Comparison tables</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Comparison tables</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
          Wikipedia-style comparison tables: rows are concepts or sound-law features,
          columns are the ten Semitic languages grouped by branch (East, Northwest,
          Central, South Arabian, Ethio-Semitic). Cells show the primary form in the
          native script; toggle &quot;Only primary orthography&quot; to hide the
          romanizations.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {TABLES.map((t) => (
          <Link
            key={t.slug}
            href={`/table/${encodeURIComponent(t.slug)}`}
            className="block bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-400 transition"
          >
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-semibold">{t.title}</span>
              <span className={`ml-auto text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${
                t.kind === "isogloss" ? "badge-showcase" : "badge-inherited"
              }`}>
                {t.kind}
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {t.description}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {t.rows.length} rows · 10 languages
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
