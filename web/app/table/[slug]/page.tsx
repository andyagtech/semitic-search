import Link from "next/link";
import { notFound } from "next/navigation";
import { TABLES, tableBySlug } from "@/lib/comparison";
import { Comparison } from "@/components/Comparison";

export function generateStaticParams() {
  return TABLES.map((t) => ({ slug: t.slug }));
}

export default async function TablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const table = tableBySlug(slug);
  if (!table) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/tables" className="hover:underline">Tables</Link>
        <span className="mx-2">/</span>
        <span>{table.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl font-semibold">{table.title}</h1>
          <span className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${
            table.kind === "isogloss" ? "badge-showcase" : "badge-inherited"
          }`}>
            {table.kind}
          </span>
        </div>
      </header>

      <Comparison table={table} />

      <footer className="mt-8 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
        <Link href="/tables" className="hover:underline">← All tables</Link>
      </footer>
    </main>
  );
}
