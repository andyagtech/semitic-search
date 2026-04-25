"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RootFamily, RootLemma } from "@/lib/root_types";
import { RTL_LANGS } from "@/lib/root_types";

// Stopwords for gloss-keyword alignment. Matches the export script's set
// so themes / clusters use the same vocabulary.
const STOPWORDS = new Set<string>([
  "a","an","the","of","and","or","to","for","from","in","on","at","by","with",
  "as","is","are","was","were","be","been","being","have","has","had","this",
  "that","these","those","it","its","their","there","which","who","whom","what",
  "when","where","why","how","can","could","will","would","one","two","three",
  "many","much","some","any","all","each","every","no","not","but","if","so",
  "very","same","other","another","more","most","also","such","like","kind",
  "way","form","forms","type","used","use","make","take","give","go","come",
  "see","singular","plural","masculine","feminine","construct","absolute",
  "definite","indefinite","verbal","noun","adjective","present","past","future",
  "perfect","imperfect","participle","active","passive","alternative","alternate",
  "variant","spelling","into","onto","out","over","under","again","just","only",
  "even","ever","never","new","old","different","third","second","first","person",
  "related","forming","relating","pertaining","name","names","named",
]);

function glossSignature(gloss: string | null | undefined): Set<string> {
  if (!gloss) return new Set();
  const tokens = gloss.toLowerCase().match(/[a-z]+/g) ?? [];
  return new Set(tokens.filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Greedy alignment: each output row anchors on the first remaining lemma
 *  in the highest-priority language with data, then for each other column
 *  picks the candidate lemma with the best gloss-jaccard with the anchor.
 *  When no candidate has any overlap we still take the next available so
 *  the row doesn't have empty cells unnecessarily — but the rendered cell
 *  gets dimmed if the alignment was a fallback. */
function alignByMeaning(
  family: RootFamily,
  orderedLangs: string[],
  maxRows: number,
): Record<string, RootLemma | null>[] {
  const remaining: Record<string, RootLemma[]> = {};
  for (const l of orderedLangs) {
    remaining[l] = [...(family.lemmas[l] ?? [])];
  }

  const out: Record<string, RootLemma | null>[] = [];

  for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
    // Anchor on the highest-priority language that still has lemmas.
    let anchorLang: string | null = null;
    for (const l of orderedLangs) {
      if ((remaining[l] ?? []).length > 0) {
        anchorLang = l;
        break;
      }
    }
    if (!anchorLang) break;

    const anchor = remaining[anchorLang].shift()!;
    const anchorSig = glossSignature(anchor.gloss);
    const row: Record<string, RootLemma | null> = { [anchorLang]: anchor };

    for (const l of orderedLangs) {
      if (l === anchorLang) continue;
      const cand = remaining[l] ?? [];
      if (cand.length === 0) {
        row[l] = null;
        continue;
      }
      // Find best gloss match. If anchor has no signature (gloss empty or
      // all stopwords), there's nothing to match against — fall back to the
      // first remaining lemma.
      let bestIdx = 0;
      let bestScore = 0;
      for (let i = 0; i < cand.length; i++) {
        const s = jaccard(anchorSig, glossSignature(cand[i].gloss));
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      }
      row[l] = cand[bestIdx];
      cand.splice(bestIdx, 1);
    }
    out.push(row);
  }
  return out;
}

// Preferred language order per the user's request: Arabic, Hebrew, Syriac,
// Ge'ez first, then chronological / genealogical grouping for the rest.
const LANG_ORDER = [
  "ar", "he", "syc", "gez",
  "akk", "ug",
  "arc", "aii", "tru", "mid", "amw",
  "am", "ti",
  "phn", "pun",
  "sab", "osa",
];

const LANG_LABELS: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Syriac", gez: "Ge'ez",
  akk: "Akkadian", ug: "Ugaritic",
  arc: "Aramaic", aii: "Assyrian NA", tru: "Turoyo", mid: "Mandaic", amw: "W. NA",
  am: "Amharic", ti: "Tigrinya",
  phn: "Phoenician", pun: "Punic",
  sab: "Sabaean", osa: "OSA",
};

type Filter = "all" | "core4" | "core3plus" | "widest";

export function PolyglotTable({ families }: { families: RootFamily[] }) {
  const [filter, setFilter] = useState<Filter>("core3plus");
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const core = new Set(["ar", "he", "syc", "gez"]);
    const list = families.filter((f) => {
      const coreCount = f.languages.filter((l) => core.has(l)).length;
      switch (filter) {
        case "all": return true;
        case "core4": return coreCount === 4;
        case "core3plus": return coreCount >= 3;
        case "widest": return f.lang_count >= 10;
      }
    });
    // Sort: most languages first, ties by lemma count.
    return [...list].sort((a, b) =>
      (b.lang_count - a.lang_count) || (b.lemma_count - a.lemma_count)
    );
  }, [families, filter]);

  return (
    <div>
      <section className="mb-4 bg-white border border-neutral-200 rounded-lg p-3 flex items-baseline gap-3 flex-wrap text-sm">
        <span className="text-xs text-neutral-500 uppercase tracking-wider">Filter:</span>
        {([
          ["core4",     "All four (Ar+He+Syc+Gez)"],
          ["core3plus", "≥3 of Ar/He/Syc/Gez"],
          ["widest",    "10+ languages"],
          ["all",       "All families"],
        ] as [Filter, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`text-xs px-2 py-1 rounded border transition ${
              filter === id
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-500">
          {filtered.length} root famil{filtered.length === 1 ? "y" : "ies"}
        </span>
      </section>

      <div className="space-y-2">
        {filtered.map((f) => (
          <FamilyCard
            key={f.slug}
            family={f}
            isOpen={openSlugs.has(f.slug)}
            onToggle={() =>
              setOpenSlugs((prev) => {
                const next = new Set(prev);
                if (next.has(f.slug)) next.delete(f.slug);
                else next.add(f.slug);
                return next;
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function FamilyCard({
  family,
  isOpen,
  onToggle,
}: {
  family: RootFamily;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Resolve columns: ordered per our preference, then any present langs
  // not in LANG_ORDER.
  const orderedLangs = useMemo(() => {
    const present = new Set(family.languages);
    const ordered = LANG_ORDER.filter((l) => present.has(l));
    for (const l of family.languages) if (!ordered.includes(l)) ordered.push(l);
    return ordered;
  }, [family]);

  // Gather top-N lemmas per language. Then greedy-align across languages by
  // gloss-keyword overlap so each rendered row groups SEMANTICALLY-similar
  // lemmas (e.g. "knee" lemmas together; "blessing" lemmas together) rather
  // than just by rank-within-language.
  const alignedRows = useMemo(() => {
    return alignByMeaning(family, orderedLangs, 4);
  }, [family, orderedLangs]);
  const maxRows = alignedRows.length;

  // Quick summary for collapsed state: first lemma of each core language
  // joined with " · " — this is the "at a glance" row.
  const summary = useMemo(() => {
    const parts: string[] = [];
    for (const l of ["ar", "he", "syc", "gez"]) {
      const top = family.lemmas[l]?.[0];
      if (top) parts.push((top.vocalized_form ?? top.word));
    }
    return parts.join(" · ");
  }, [family]);

  return (
    <article className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-neutral-50 text-left"
      >
        <div className="flex items-baseline gap-3 flex-wrap min-w-0">
          <span className="font-mono font-semibold text-lg text-neutral-800 flex-shrink-0">
            {family.canonical.replace(/ /g, "-")}
          </span>
          <span className="text-sm text-neutral-700 truncate" dir="auto">
            {summary}
          </span>
        </div>
        <div className="flex items-baseline gap-3 flex-shrink-0">
          <span className="text-xs text-neutral-500 font-mono">
            {family.lang_count} langs
          </span>
          <span className="text-neutral-400 text-sm">{isOpen ? "▾" : "▸"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-neutral-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50/70 text-xs text-neutral-600">
                {orderedLangs.map((l) => (
                  <th key={l} className="px-3 py-2 text-left font-normal border-r last:border-r-0 border-neutral-100">
                    <div className="font-semibold text-neutral-800">{LANG_LABELS[l] ?? l}</div>
                    <div className="font-mono text-[10px] uppercase text-neutral-400">{l}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alignedRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-neutral-100 align-top">
                  {orderedLangs.map((l) => {
                    const lemma = row[l];
                    if (!lemma) {
                      return <td key={l} className="px-3 py-2 border-r last:border-r-0 border-neutral-100 text-neutral-300">—</td>;
                    }
                    const isRTL = RTL_LANGS.has(l);
                    return (
                      <td key={l} className="px-3 py-2 border-r last:border-r-0 border-neutral-100">
                        <div className="text-lg font-medium leading-tight" dir={isRTL ? "rtl" : "ltr"}>
                          {lemma.vocalized_form ?? lemma.word}
                        </div>
                        {lemma.romanization && (
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {lemma.romanization}
                          </div>
                        )}
                        {lemma.gloss && (
                          <div className="text-xs text-neutral-600 mt-0.5 leading-snug">
                            {lemma.gloss.length > 60 ? lemma.gloss.slice(0, 60) + "…" : lemma.gloss}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-neutral-50/50 text-xs text-neutral-500 border-t border-neutral-100 flex items-baseline justify-between">
            <span>
              {family.lemma_count} total lemmas · {family.lang_count} languages
            </span>
            <Link
              href={`/roots/${encodeURIComponent(family.slug)}`}
              className="text-blue-700 hover:text-blue-900 hover:underline underline-offset-2"
            >
              Full root family →
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
