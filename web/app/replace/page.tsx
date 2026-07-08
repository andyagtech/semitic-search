import Link from "next/link";
import { LoanReplaceForm } from "./LoanReplaceForm";

export const metadata = {
  title: "Loan Replacement Generator — Semitic Search",
  description:
    "Imagine native-sounding replacements for Semitic loanwords using two mechanics: native-stock coinage (build from a Proto-Semitic root using binyanim/mishqalim) and reflex-adapted (apply the language's regular sound laws to the loan, e.g. labneh → lavnah via begadkefat spirantization).",
};

export default function ReplacePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Loan Replacement Generator</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Loan Replacement Generator</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
          Imagine native-sounding replacements for Semitic loanwords using two
          mechanics. This is a linguistic thought experiment — the outputs are
          <em> invented</em> forms, not attested vocabulary.
        </p>
      </header>

      <section className="mb-6 grid sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="font-semibold mb-1 accent-inherited">Native-stock coinage</div>
          <p className="text-neutral-600 leading-relaxed text-xs">
            Find a Proto-Semitic root that shares the loanword&apos;s meaning and
            build a plausible daughter form using the target language&apos;s
            binyan/mishqal. Modern Hebrew&apos;s <span className="font-mono">mahšev</span>
            &nbsp;&quot;computer&quot; (from ח-ש-ב) is a real-world example.
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="font-semibold mb-1 accent-showcase">Reflex-adapted</div>
          <p className="text-neutral-600 leading-relaxed text-xs">
            Take the source loan and apply the target&apos;s regular sound laws.
            Arabic <span className="font-mono">لبنة labneh</span> → Hebrew
            &nbsp;<span className="font-mono">לָבְנַה lavnah</span> via begadkefat
            spirantization (*b→v after a vowel).
          </p>
        </div>
      </section>

      <LoanReplaceForm />

      <footer className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
        Sibling to <Link href="/" className="underline">the main search</Link>. v0
        prototype — imagined forms, not attested vocabulary.
      </footer>
    </main>
  );
}
