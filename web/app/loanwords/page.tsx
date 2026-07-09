import Link from "next/link";
import { LOANWORD_SECTIONS } from "@/lib/loanwords";
import { LoanwordsView } from "./LoanwordsView";

export const metadata = {
  title: "Loanwords & native alternatives — Semitic Search",
  description:
    "Curated Semitic loanwords with imagined native alternatives. Ben-Yehuda-era Hebrew coinings and modern Arabic Academy neologisms are highlighted.",
};

const STATUS_CLASS: Record<string, string> = {
  attested: "badge-inherited",
  archaic: "badge-showcase",
  imagined: "badge-loans",
};

const STATUS_NOTE: Record<string, string> = {
  attested: "actually used",
  archaic: "used historically, now rare",
  imagined: "purely coined here",
};

export default function LoanwordsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/generators" className="hover:underline">Generators</Link>
        <span className="mx-2">/</span>
        <span>Loanwords &amp; native alternatives</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Loanwords &amp; native alternatives</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl leading-relaxed">
          The <strong>most commonly used foreign words</strong> in Hebrew, Arabic, and
          Amharic, paired with native alternatives. Includes modern high-frequency loans
          (telefon, otobus, kafe, internet, banṭalūn, bank) alongside classical
          Aramaic/Greek/Persian layers. Hebrew entries draw on the{" "}
          <a href="https://terms.hebrew-academy.org.il/" className="underline"
             target="_blank" rel="noopener">Academy of the Hebrew Language&apos;s
            terminology database</a>
          {" "}and{" "}
          <a href="https://iedit.co.il/foreign-words-and-their-hebrew-alternatives/"
             className="underline" target="_blank" rel="noopener">iEdit&apos;s
            curated list</a>. Some alternatives — <span className="font-mono">machshev</span>,
          {" "}<span className="font-mono">mazgan</span>, <span className="font-mono">
          ramzor</span>, <span className="font-mono">kaspomat</span>, Arabic{" "}
          <span className="font-mono">hātif</span> — are Academy coinings that WON and
          are now the standard word. Others (Hebrew <span className="font-mono">saḥ-rachok
          </span> for &quot;telephone&quot;) failed completely.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {(["attested", "archaic", "imagined"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${STATUS_CLASS[s]}`}>
                {s}
              </span>
              <span className="text-neutral-500">— {STATUS_NOTE[s]}</span>
            </span>
          ))}
        </div>
      </header>

      <LoanwordsView sections={LOANWORD_SECTIONS} />

      <footer className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500 flex flex-wrap gap-x-4">
        <Link href="/replace" className="hover:underline">→ Generate more with the Loan Replacement Generator</Link>
        <Link href="/generators" className="hover:underline ml-auto">← All generators</Link>
      </footer>
    </main>
  );
}
