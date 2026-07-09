"use client";

/**
 * Client-side loanwords renderer with the "show romanizations" toggle.
 *
 * Data comes as strings like "אחלה aḥla" — we split at RENDER time via
 * splitNativeRomanization() into { native, romanization? } and control
 * romanization visibility with a checkbox.
 */

import { useState } from "react";
import type { LoanwordSection } from "@/lib/loanwords";
import { splitNativeRomanization } from "@/lib/loan-format";

const STATUS_CLASS: Record<string, string> = {
  attested: "badge-inherited",
  archaic: "badge-showcase",
  imagined: "badge-loans",
};

function FormText({ text, showRomanization, className = "", muted = false }: {
  text: string;
  showRomanization: boolean;
  className?: string;
  muted?: boolean;
}) {
  const { native, romanization } = splitNativeRomanization(text);
  return (
    <span className={className} dir="auto">
      <span>{native}</span>
      {romanization && showRomanization && (
        <span className={muted ? "ml-2 text-xs text-neutral-500 font-normal" : "ml-2 text-neutral-500 font-normal"} dir="ltr">
          {romanization}
        </span>
      )}
    </span>
  );
}

export function LoanwordsView({ sections }: { sections: LoanwordSection[] }) {
  const [showRomanization, setShowRomanization] = useState(true);

  return (
    <>
      <div className="mb-6 flex items-center gap-3 text-sm border-b border-neutral-200 pb-4">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRomanization}
            onChange={(e) => setShowRomanization(e.target.checked)}
            className="accent-current"
          />
          <span>Show romanizations</span>
        </label>
        <span className="text-xs text-neutral-500">
          (native alphabet is always shown; toggle the transliteration)
        </span>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.language} id={section.language}>
            <div className="border-b border-neutral-200 pb-2 mb-4">
              <h2 className="text-xl font-semibold">
                {section.languageName}
                <span className="ml-3 text-xs text-neutral-500 font-mono">{section.language}</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1 max-w-3xl leading-relaxed">
                {section.intro}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {section.loans.map((l, li) => (
                <div key={li} className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <FormText
                      text={l.loan}
                      showRomanization={showRomanization}
                      className="font-mono font-semibold text-lg accent-loans"
                    />
                    <span className="text-xs text-neutral-500">&quot;{l.meaning}&quot;</span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-3" dir="auto">from {l.source}</div>

                  <div className="space-y-2 border-t border-neutral-200 pt-3">
                    {l.alternatives.map((a, i) => (
                      <div key={i}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <FormText
                            text={a.form}
                            showRomanization={showRomanization}
                            className="font-mono font-semibold accent-proto"
                          />
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
    </>
  );
}
