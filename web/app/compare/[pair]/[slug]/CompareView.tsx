"use client";

import type { RootLemma } from "@/lib/root_types";
import { RTL_LANGS } from "@/lib/root_types";
import { canonicalSlug } from "@/lib/canonical_root";
import { explainReflex } from "@/lib/fuzzy_canonical";

export function CompareView({
  aLang, bLang, aName, bName, aLemmas, bLemmas, canonical,
}: {
  aLang: string; bLang: string; aName: string; bName: string;
  aLemmas: RootLemma[]; bLemmas: RootLemma[]; canonical: string;
}) {
  // Compute the reflex correspondences between the two languages' surface
  // roots, based on the first lemma of each. These annotate the header.
  const aRoot = aLemmas[0]?.root ? canonicalSlug(aLemmas[0].root)?.replace(/-/g, " ") : null;
  const bRoot = bLemmas[0]?.root ? canonicalSlug(bLemmas[0].root)?.replace(/-/g, " ") : null;
  const correspondences = aRoot && bRoot ? explainReflex(aRoot, bRoot) : [];

  const aRTL = RTL_LANGS.has(aLang);
  const bRTL = RTL_LANGS.has(bLang);
  const maxRows = Math.max(aLemmas.length, bLemmas.length);

  return (
    <div>
      {correspondences.length > 0 && (
        <section className="mb-4 bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs">
          <div className="font-semibold text-violet-900 mb-1">
            Reflex correspondences at this root
          </div>
          <ul className="space-y-1">
            {correspondences.map((c) => (
              <li key={c.position} className="text-violet-900">
                position {c.position}: <b className="font-mono">{c.inputPhoneme}</b> ↔ <b className="font-mono">{c.matchPhoneme}</b>
                <span className="ml-2 text-violet-700">— {c.gloss}</span>
              </li>
            ))}
          </ul>
          {correspondences.length === 0 && (
            <div className="text-violet-700">All consonants are identical (no reflex split).</div>
          )}
        </section>
      )}

      {aRoot && bRoot && correspondences.length === 0 && (
        <section className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
          Both languages share identical consonants at this root —
          <b className="font-mono mx-1">{aRoot.replace(/ /g, "-")}</b>
          ↔ <b className="font-mono mx-1">{bRoot.replace(/ /g, "-")}</b>. No
          Proto-Semitic sound change separates them here.
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border border-neutral-200 rounded-lg">
          <header className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/60">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{aName}</h2>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">{aLang}</span>
            </div>
            {aRoot && (
              <div className="mt-1 text-xs text-neutral-500 font-mono">root: {aRoot.replace(/ /g, "-")}</div>
            )}
          </header>
          <ul className="divide-y divide-neutral-100">
            {Array.from({ length: maxRows }).map((_, i) => {
              const l = aLemmas[i];
              if (!l) return <li key={i} className="px-4 py-2 text-xs text-neutral-300">·</li>;
              return <LemmaRow key={i} l={l} rtl={aRTL} />;
            })}
          </ul>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg">
          <header className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/60">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{bName}</h2>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">{bLang}</span>
            </div>
            {bRoot && (
              <div className="mt-1 text-xs text-neutral-500 font-mono">root: {bRoot.replace(/ /g, "-")}</div>
            )}
          </header>
          <ul className="divide-y divide-neutral-100">
            {Array.from({ length: maxRows }).map((_, i) => {
              const l = bLemmas[i];
              if (!l) return <li key={i} className="px-4 py-2 text-xs text-neutral-300">·</li>;
              return <LemmaRow key={i} l={l} rtl={bRTL} />;
            })}
          </ul>
        </div>
      </div>

      <div className="mt-4 text-xs text-neutral-500">
        Canonical root family:{" "}
        <span className="font-mono">{canonical.replace(/ /g, "-")}</span>
      </div>
    </div>
  );
}

function LemmaRow({ l, rtl }: { l: RootLemma; rtl: boolean }) {
  return (
    <li className="px-4 py-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-medium" dir={rtl ? "rtl" : "ltr"}>
          {l.vocalized_form ?? l.word}
        </span>
        {l.romanization && (
          <span className="text-xs text-neutral-500 font-mono">{l.romanization}</span>
        )}
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">{l.pos}</span>
        {l.attestation && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
            {l.attestation.source === "tanakh" ? "📜" : l.attestation.source === "quran" ? "☪︎" : "•"} {l.attestation.citation}
          </span>
        )}
      </div>
      {l.gloss && (
        <div className="text-xs text-neutral-700 mt-0.5">{l.gloss}</div>
      )}
    </li>
  );
}
