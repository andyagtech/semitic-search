"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReflexLemma = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  pos: string;
  gloss: string | null;
  root: string;
  source: string;
  surface_canonical: string;
};

type ReflexResponse = {
  proto: string;
  variants: string[];
  lang_count: number;
  lemma_count: number;
  languages: string[];
  language_names: Record<string, string>;
  reflexes_by_lang: Record<string, string[]>;
  lemmas: Record<string, ReflexLemma[]>;
};

const RTL_LANGS = new Set(["ar", "he", "syc", "am", "ti", "gez", "ug", "arc", "aii", "sab", "osa", "phn", "pun", "tru", "mid", "amw"]);

export function ProtoFamilyView({ protoRoot }: { protoRoot: string }) {
  const [data, setData] = useState<ReflexResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/reflexes?proto=${encodeURIComponent(protoRoot)}&per_lang=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => setData(json))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [protoRoot]);

  if (error) return <div className="text-sm text-red-600">Error: {error}</div>;
  if (!data) return <div className="text-sm text-neutral-500">Looking up reflexes…</div>;

  if (data.lemma_count === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded p-4 text-sm">
        <div className="text-neutral-700 mb-2">
          No lemmas attested for any of the predicted surface forms.
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          Generated {data.variants.length} surface variants: {data.variants.slice(0, 8).join(", ")}
          {data.variants.length > 8 && ` … (+${data.variants.length - 8} more)`}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-xs text-neutral-500">
        Expanded to {data.variants.length} candidate surface canonicals; found
        {" "}{data.lemma_count} lemmas in {data.lang_count} languages.
      </div>
      <div className="space-y-3">
        {data.languages.map((l) => {
          const lemmas = data.lemmas[l];
          const reflexes = data.reflexes_by_lang[l] ?? [];
          const isRTL = RTL_LANGS.has(l);
          return (
            <div key={l} className="border border-neutral-200 bg-white rounded-lg p-3">
              <div className="flex items-baseline justify-between gap-2 mb-2 pb-2 border-b border-neutral-100">
                <div>
                  <span className="font-semibold">{data.language_names[l]}</span>
                  <span className="ml-2 text-xs text-neutral-500 font-mono">{l}</span>
                </div>
                <div className="text-xs font-mono text-neutral-600">
                  reflex: {reflexes.map((r) => r.replace(/ /g, "-")).join(" · ")}
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                {lemmas.map((item, j) => (
                  <li key={j} className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/?q=${encodeURIComponent(item.word)}`}
                      className="font-medium hover:underline underline-offset-2"
                      dir={isRTL ? "rtl" : "ltr"}
                    >
                      {item.vocalized_form ?? item.word}
                    </Link>
                    {item.romanization && (
                      <span className="text-xs text-neutral-500 font-mono">{item.romanization}</span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">{item.pos}</span>
                    {item.gloss && (
                      <span className="text-xs text-neutral-700">— {item.gloss}</span>
                    )}
                    <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                      item.source === "gold" ? "bg-emerald-600 text-white" : "bg-sky-500 text-white"
                    }`}>
                      {item.source === "gold" ? "attested" : "inferred"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
