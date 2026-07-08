import Link from "next/link";
import { LOANWORD_SECTIONS } from "@/lib/loanwords";

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
          Common Semitic loanwords from Aramaic, Greek, Persian, Italian, and English
          paired with imagined native alternatives built from Proto-Semitic roots. Some
          alternatives — like Modern Hebrew <span className="font-mono">machshev</span> and
          Arabic <span className="font-mono">hātif</span> — are ACADEMY COININGS that WON
          and are now standard.
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

      <div className="space-y-8">
        {LOANWORD_SECTIONS.map((section) => (
          <section key={section.language} id={section.language}>
            <div className="border-b border-neutral-200 pb-2 mb-4">
              <h2 className="text-xl font-semibold">
                {section.languageName}
                <span className="ml-3 text-xs text-neutral-500 font-mono">{section.language}</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1 max-w-3xl leading-relaxed">{section.intro}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {section.loans.map((l) => (
                <div key={l.loan} className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <span className="font-mono font-semibold text-lg accent-loans" dir="auto">{l.loan}</span>
                    <span className="text-xs text-neutral-500">&quot;{l.meaning}&quot;</span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-3" dir="auto">from {l.source}</div>

                  <div className="space-y-2 border-t border-neutral-200 pt-3">
                    {l.alternatives.map((a, i) => (
                      <div key={i}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-mono font-semibold accent-proto" dir="auto">{a.form}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${STATUS_CLASS[a.status]}`}>
                            {a.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-600 leading-relaxed">{a.derivation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500 flex flex-wrap gap-x-4">
        <Link href="/replace" className="hover:underline">→ Generate more with the Loan Replacement Generator</Link>
        <Link href="/generators" className="hover:underline ml-auto">← All generators</Link>
      </footer>
    </main>
  );
}
