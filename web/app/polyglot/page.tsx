import Link from "next/link";
import { allFamilies } from "@/lib/root_families";
import { PolyglotTable } from "./PolyglotTable";

export const metadata = {
  title: "Polyglot cognate tables — Semitic Search",
  description:
    "Side-by-side cognate tables for Semitic root families. Languages shown in order Arabic → Hebrew → Syriac → Ge'ez, then other varieties. Ideal for spotting near-identical reflexes at a glance.",
};

export default function PolyglotPage() {
  const families = allFamilies();
  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Semitic Search
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Polyglot cognate tables
          </h1>
          <p className="text-neutral-600 mt-3 text-sm max-w-2xl">
            Each root family expands to a side-by-side table — one column per
            language — showing its top lemma. Language order: Arabic, Hebrew,
            Syriac, Ge&apos;ez, then other varieties. When the consonantal
            skeleton is identical across scripts (e.g.&nbsp;
            قَرُبَ&nbsp;·&nbsp;קָרַב&nbsp;·&nbsp;ܩܵܪܹܒ݂&nbsp;·&nbsp;ቀረበ)
            the near-identity jumps out at a glance.
          </p>
        </header>

        <PolyglotTable families={families} />
      </div>
    </main>
  );
}
