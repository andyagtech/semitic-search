"use client";

import { useMemo } from "react";
import type { RootFamily, RootLemma } from "@/lib/root_types";
import { reconstruct } from "@/lib/reconstruct";
import { canonicalSlug } from "@/lib/canonical_root";

// Semitic family subgrouping per scholarly consensus (Huehnergard 2005,
// Rubin 2010). Branch structure drives the tree rendering.
type Branch = { id: string; label: string; children: (Branch | string)[] };

const TREE: Branch = {
  id: "ps", label: "Proto-Semitic",
  children: [
    { id: "east", label: "East Semitic", children: ["akk"] },
    {
      id: "west", label: "West Semitic",
      children: [
        {
          id: "central", label: "Central Semitic",
          children: [
            {
              id: "nw", label: "Northwest Semitic",
              children: [
                "ug",
                { id: "canaanite", label: "Canaanite", children: ["he", "phn", "pun"] },
                {
                  id: "aram", label: "Aramaic",
                  children: ["arc", "syc", "aii", "tru", "mid", "amw"],
                },
              ],
            },
            {
              id: "arabic", label: "Arabic", children: ["ar"],
            },
          ],
        },
        {
          id: "south", label: "South Semitic",
          children: [
            { id: "sa", label: "Old South Arabian", children: ["sab", "osa"] },
            {
              id: "ethio", label: "Ethio-Semitic",
              children: ["gez", "am", "ti"],
            },
          ],
        },
      ],
    },
  ],
};

export function EtymologyTree({ family }: { family: RootFamily }) {
  const { psRoot, firstLemmaPerLang } = useMemo(() => {
    const firstByLang: Record<string, RootLemma> = {};
    const cognates: [string, string][] = [];
    for (const lang of family.languages) {
      const first = family.lemmas[lang]?.[0];
      if (!first) continue;
      firstByLang[lang] = first;
      const canon = canonicalSlug(first.root);
      if (canon) cognates.push([lang, canon.replace(/-/g, " ")]);
    }
    const rec = cognates.length >= 2 ? reconstruct(cognates) : null;
    return { psRoot: rec?.ps_root ?? "", firstLemmaPerLang: firstByLang };
  }, [family]);

  // Render-time layout: count leaves per branch for vertical spacing,
  // render labels + connectors with nested flex.
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5">
      <header className="mb-3 pb-2 border-b border-neutral-100">
        <h2 className="text-sm font-semibold text-neutral-700">
          Etymology tree
          <span className="ml-2 text-xs text-neutral-500 font-normal">
            how this root diverged from Proto-Semitic through the family
          </span>
        </h2>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-fit" style={{ minWidth: 700 }}>
          <TreeNode
            node={TREE}
            firstLemmaPerLang={firstLemmaPerLang}
            availableLangs={new Set(family.languages)}
            psRoot={psRoot}
            isRoot
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500 mt-3">
        Branch structure: Huehnergard (2005), Rubin (2010). The reconstructed
        Proto-Semitic form is computed on the fly from the cognate set&apos;s
        majority reflex pattern.
      </p>
    </div>
  );
}

function TreeNode({
  node,
  firstLemmaPerLang,
  availableLangs,
  psRoot,
  isRoot,
}: {
  node: Branch;
  firstLemmaPerLang: Record<string, RootLemma>;
  availableLangs: Set<string>;
  psRoot: string;
  isRoot?: boolean;
}) {
  // Keep only children that lead to a lang in the family. Filter recursively.
  const presentChildren = node.children.filter((c) => {
    if (typeof c === "string") return availableLangs.has(c);
    return hasLang(c, availableLangs);
  });
  if (presentChildren.length === 0) return null;

  return (
    <div className="flex items-stretch gap-6">
      <div className="flex flex-col justify-center">
        <div
          className={`px-3 py-1.5 rounded-lg border ${
            isRoot
              ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
              : "bg-neutral-50 border-neutral-300 text-neutral-800"
          } text-sm font-mono whitespace-nowrap`}
        >
          {isRoot && psRoot ? (
            <>
              <span className="text-amber-600">*</span>
              {psRoot.toLowerCase().replace(/ /g, "-")}
              <span className="ml-2 text-[10px] text-amber-700 font-normal uppercase tracking-wider">
                Proto-Semitic
              </span>
            </>
          ) : (
            node.label
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 border-l-2 border-neutral-200 pl-4">
        {presentChildren.map((child, i) => {
          if (typeof child === "string") {
            const lemma = firstLemmaPerLang[child];
            if (!lemma) return null;
            return <LangLeaf key={i} lang={child} lemma={lemma} />;
          }
          return (
            <TreeNode
              key={i}
              node={child}
              firstLemmaPerLang={firstLemmaPerLang}
              availableLangs={availableLangs}
              psRoot={psRoot}
            />
          );
        })}
      </div>
    </div>
  );
}

function hasLang(node: Branch, available: Set<string>): boolean {
  for (const c of node.children) {
    if (typeof c === "string") {
      if (available.has(c)) return true;
    } else if (hasLang(c, available)) return true;
  }
  return false;
}

const LANG_NAME: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Syriac", am: "Amharic", ti: "Tigrinya",
  gez: "Ge'ez", ug: "Ugaritic", akk: "Akkadian", arc: "Imperial Aramaic",
  aii: "Assyrian NA", sab: "Sabaean", osa: "OSA", phn: "Phoenician",
  pun: "Punic", tru: "Turoyo", mid: "Mandaic", amw: "Western NA",
};

function LangLeaf({ lang, lemma }: { lang: string; lemma: RootLemma }) {
  const isRTL = /^(ar|he|syc|am|ti|gez|ug|arc|aii|sab|osa|phn|pun|tru|mid|amw)$/.test(lang);
  const display = lemma.vocalized_form ?? lemma.word;
  return (
    <div className="flex items-baseline gap-3 px-3 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 min-w-14">
        {LANG_NAME[lang] ?? lang}
      </span>
      <span className="font-medium" dir={isRTL ? "rtl" : "ltr"}>
        {display}
      </span>
      <span className="text-xs text-neutral-500 font-mono">
        {lemma.root}
      </span>
      {lemma.gloss && (
        <span className="text-xs text-neutral-700 truncate max-w-xs">
          — {lemma.gloss}
        </span>
      )}
    </div>
  );
}
