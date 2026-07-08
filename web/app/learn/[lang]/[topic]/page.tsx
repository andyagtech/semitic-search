import Link from "next/link";
import { notFound } from "next/navigation";
import { LANGUAGE_NAME, TABLES, tableBySlug } from "@/lib/comparison";
import type { LanguageCode } from "@/lib/models";
import { LearningSession } from "./LearningSession";

const SEMITIC_LANGS: LanguageCode[] = ["ar", "he", "syc", "am", "ti", "gez", "akk", "ug", "sab"];

export function generateStaticParams() {
  const params: { lang: string; topic: string }[] = [];
  for (const t of TABLES.filter((t) => t.kind === "vocabulary")) {
    for (const lang of SEMITIC_LANGS) {
      params.push({ lang, topic: t.slug });
    }
  }
  return params;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ lang: string; topic: string }>;
}) {
  const { lang, topic } = await params;
  const table = tableBySlug(topic);
  if (!table || table.kind !== "vocabulary") notFound();
  const langName = LANGUAGE_NAME[lang];
  if (!langName) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/learn" className="hover:underline">Learn</Link>
        <span className="mx-2">/</span>
        <span>{langName} · {table.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">
          {langName} <span className="text-neutral-400">·</span> {table.title}
        </h1>
      </header>

      <LearningSession lang={lang as LanguageCode} table={table} />
    </main>
  );
}
