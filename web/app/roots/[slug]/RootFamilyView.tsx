"use client";

import { useCallback, useEffect, useState } from "react";
import type { RootFamily, RootLemma } from "@/lib/root_types";
import { RTL_LANGS } from "@/lib/root_types";
import { stripCombining } from "@/lib/romanization";
import { ScriptToggle } from "@/components/ScriptToggle";
import { SCRIPT_VARIANTS, getScriptVariant } from "@/lib/scripts";
import { reconstruct } from "@/lib/reconstruct";
import { canonicalSlug } from "@/lib/canonical_root";

// Wiktionary section-anchor per language code — same map we use on the
// search-result path.
const WIKTIONARY_SECTION: Record<string, string> = {
  ar: "Arabic",
  he: "Hebrew",
  syc: "Classical_Syriac",
  aii: "Assyrian_Neo-Aramaic",
  arc: "Aramaic",
  am: "Amharic",
  ti: "Tigrinya",
  gez: "Geez",
  ug: "Ugaritic",
  akk: "Akkadian",
  phn: "Phoenician",
  pun: "Punic",
  sab: "Sabaean",
  osa: "Old_South_Arabian",
  tru: "Turoyo",
  mid: "Classical_Mandaic",
  amw: "Western_Neo-Aramaic",
};

function wiktionaryUrl(word: string, lang: string): string {
  const section = WIKTIONARY_SECTION[lang] ?? "";
  const title = encodeURIComponent(word);
  return section
    ? `https://en.wiktionary.org/wiki/${title}#${section}`
    : `https://en.wiktionary.org/wiki/${title}`;
}

// Escape BibTeX-unsafe chars.
function bibtexEscape(s: string): string {
  return s.replace(/([{}])/g, "\\$1").replace(/"/g, "''");
}

function buildBibtex(family: RootFamily): string {
  const slug = family.canonical.replace(/ /g, "-");
  const lines: string[] = [];
  const year = new Date().getFullYear();
  for (const lang of family.languages) {
    const lemmas = family.lemmas[lang] ?? [];
    lemmas.forEach((lem, i) => {
      const key = `${slug}_${lang}_${i + 1}`;
      const title = bibtexEscape(lem.vocalized_form ?? lem.word);
      const gloss = bibtexEscape(lem.gloss ?? "");
      const url = wiktionaryUrl(lem.word, lang);
      lines.push(
        `@misc{${key},
  title   = {${title}},
  note    = {${gloss}},
  howpublished = {\\url{${url}}},
  language = {${lang}},
  year    = {${year}},
  keywords = {Semitic root ${slug}, cognate, ${lang}},
}`
      );
    });
  }
  return lines.join("\n\n") + "\n";
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function RootFamilyView({ family }: { family: RootFamily }) {
  const [showPointed, setShowPointed] = useState(true);
  // Per-language script/font selection, keyed by lang. Persisted to
  // localStorage so the user's preference survives reload/navigation.
  const [scriptChoice, setScriptChoice] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("semitic-script-choice");
      if (raw) setScriptChoice(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const setScript = (lang: string, id: string) =>
    setScriptChoice((prev) => {
      const next = { ...prev, [lang]: id };
      try { localStorage.setItem("semitic-script-choice", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

  // Compute which languages' surface form dissents from the majority
  // reconstruction — those are "irregular" relative to the root family's
  // dominant reflex pattern and may be loanwords or carry a different
  // historical trajectory. Pick the first lemma in each language as its
  // representative for reconstruction purposes.
  const dissenters = new Set<string>();
  const recon = (() => {
    const cognates: [string, string][] = [];
    for (const lang of family.languages) {
      const first = family.lemmas[lang]?.[0];
      if (!first) continue;
      const canon = canonicalSlug(first.root);
      if (!canon) continue;
      cognates.push([lang, canon.replace(/-/g, " ")]);
    }
    return cognates.length >= 2 ? reconstruct(cognates) : null;
  })();
  if (recon) {
    // A language "dissents" if it appears in ANY slot's dissenters list.
    for (const slot of recon.slots) {
      for (const d of slot.dissenters) dissenters.add(d);
    }
  }

  const slug = family.canonical.replace(/ /g, "-");
  const onExportJson = () => {
    triggerDownload(JSON.stringify(family, null, 2), `${slug}.json`, "application/json");
  };
  const onExportBibtex = () => {
    triggerDownload(buildBibtex(family), `${slug}.bib`, "text/x-bibtex");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-neutral-50 border border-neutral-200 rounded p-3">
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPointed}
            onChange={(e) => setShowPointed(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Show pronunciation marks (niqqud, harakat, Syriac vowels)</span>
        </label>
        <span className="flex-1" />
        <div className="flex gap-2">
          <button
            onClick={onExportJson}
            className="text-xs px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono"
            title="Download this root family as JSON"
          >
            ↓ JSON
          </button>
          <button
            onClick={onExportBibtex}
            className="text-xs px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-mono"
            title="Download per-lemma BibTeX citations"
          >
            ↓ BibTeX
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {family.languages.map((lang) => {
          const lemmas = family.lemmas[lang] || [];
          if (lemmas.length === 0) return null;
          const name = family.language_names[lang] ?? lang;
          const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
          const hasToggle = !!SCRIPT_VARIANTS[lang];
          const chosenId = scriptChoice[lang] ?? SCRIPT_VARIANTS[lang]?.[0]?.id ?? "default";
          const variant = getScriptVariant(lang, chosenId);
          return (
            <section
              key={lang}
              className="border border-neutral-200 bg-white rounded-lg p-4"
            >
              <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-neutral-100 mb-2 flex-wrap">
                <h2 className="text-lg font-semibold">{name}</h2>
                {hasToggle && (
                  <ScriptToggle lang={lang} value={chosenId} onChange={(id) => setScript(lang, id)} compact />
                )}
                {dissenters.has(lang) && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200"
                    title="This language's surface root contains at least one phoneme that doesn't cleanly reflect the majority Proto-Semitic reconstruction — possible irregular development, loanword phonology, or different historical root."
                  >
                    irregular reflex
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-mono">
                  {lang} · {lemmas.length} lemma{lemmas.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-neutral-100">
                {lemmas.map((l, i) => (
                  <LemmaRow
                    key={i}
                    lemma={l}
                    lang={lang}
                    dir={dir as "rtl" | "ltr"}
                    showPointed={showPointed}
                    variantFont={variant?.fontFamily}
                    variantConvert={variant?.convert}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LemmaRow({
  lemma,
  lang,
  dir,
  showPointed,
  variantFont,
  variantConvert,
}: {
  lemma: RootLemma;
  lang: string;
  dir: "rtl" | "ltr";
  showPointed: boolean;
  variantFont?: string;
  variantConvert?: (t: string) => string;
}) {
  const pointed = lemma.vocalized_form ?? lemma.word;
  const plain = stripCombining(pointed);
  let display = showPointed ? pointed : plain;
  if (variantConvert) {
    display = variantConvert(display);
  }
  const heFont = variantFont;
  const samePair = pointed === plain; // no diacritics at all

  return (
    <li className="py-1.5">
      <div className="flex items-baseline gap-3 flex-wrap">
        <WordCopyable text={display} secondary={samePair ? null : (showPointed ? plain : pointed)} dir={dir} fontFamily={heFont} />
        {lemma.romanization && (
          <span className="text-sm text-neutral-500 font-mono">{lemma.romanization}</span>
        )}
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
          {lemma.pos || "—"}
        </span>
        {lemma.source === "gold" ? (
          <span
            className="text-[10px] font-semibold bg-emerald-600 text-white px-1 py-0.5 rounded"
            title="Root annotation by a Wiktionary editor"
          >
            attested
          </span>
        ) : (
          <span
            className="text-[10px] font-semibold bg-sky-500 text-white px-1 py-0.5 rounded"
            title={`Mechanically inferred root (${lemma.source})`}
          >
            inferred
          </span>
        )}
        {lemma.attestation && (() => {
          const s = lemma.attestation.source;
          const icon =
            s === "tanakh" ? "📜" :
            s === "quran"  ? "☪︎" :
            s === "mishnah"? "✡︎" :
            (s === "onkelos" || s === "jonathan" || s === "neofiti" || s === "jerusalem") ? "𐡀" : "•";
          const title =
            s === "tanakh"    ? `First attested in the Tanakh at ${lemma.attestation.citation}` :
            s === "quran"     ? `First attested in the Qur'an at ${lemma.attestation.citation}` :
            s === "mishnah"   ? `First attested in the Mishnah at ${lemma.attestation.citation}` :
            s === "onkelos"   ? `Attested in Targum Onkelos at ${lemma.attestation.citation}` :
            s === "jonathan"  ? `Attested in Targum Jonathan at ${lemma.attestation.citation}` :
            s === "neofiti"   ? `Attested in Targum Neofiti at ${lemma.attestation.citation}` :
            s === "jerusalem" ? `Attested in Targum Jerusalem at ${lemma.attestation.citation}` :
                                `Attested at ${s} ${lemma.attestation.citation}`;
          return (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200"
              title={title}
            >
              {icon} {lemma.attestation.citation}
            </span>
          );
        })()}
        <a
          href={wiktionaryUrl(lemma.word, lang)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-400 hover:text-blue-600 underline-offset-2 hover:underline"
          title={`Open "${lemma.word}" on Wiktionary`}
        >
          Wiktionary ↗
        </a>
      </div>
      {lemma.gloss && <div className="text-sm text-neutral-700 mt-0.5">{lemma.gloss}</div>}
      {lemma.etymology && (
        <div className="text-xs text-neutral-500 mt-0.5 italic leading-snug">
          {lemma.etymology}
        </div>
      )}
      {lemma.derivations && lemma.derivations.length > 0 && (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 list-none select-none">
            ▸ {lemma.derivations.length} derivation{lemma.derivations.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 pl-3 border-l-2 border-neutral-100 space-y-0.5">
            {lemma.derivations.map((d, i) => {
              const wiktionaryUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(d.word.split(/[\s־]+/)[0])}`;
              return (
                <li key={i} className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 min-w-14">
                    {d.kind}
                  </span>
                  <a
                    href={wiktionaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline underline-offset-2"
                    dir={dir}
                    title={`Open "${d.word}" on Wiktionary`}
                  >
                    {d.word}
                  </a>
                  {d.roman && <span className="text-neutral-500 font-mono">{d.roman}</span>}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </li>
  );
}

function WordCopyable({
  text,
  secondary,
  dir,
  fontFamily,
}: {
  text: string;
  secondary: string | null;
  dir: "rtl" | "ltr";
  fontFamily?: string;
}) {
  const [copied, setCopied] = useState<"main" | "secondary" | null>(null);

  const copy = useCallback(async (what: string, tag: "main" | "secondary") => {
    try {
      await navigator.clipboard.writeText(what);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1000);
    } catch {
      /* ignore — browser might block clipboard without user gesture */
    }
  }, []);

  return (
    <span className="inline-flex items-baseline gap-1">
      <button
        onClick={() => copy(text, "main")}
        className="text-xl font-medium bg-transparent hover:bg-neutral-100 rounded px-1 transition"
        title={`Copy "${text}"`}
        dir={dir}
        style={fontFamily ? { fontFamily } : undefined}
      >
        {text}
      </button>
      {copied === "main" && (
        <span className="text-[10px] text-emerald-600 uppercase tracking-wider">copied</span>
      )}
      {secondary && (
        <button
          onClick={() => copy(secondary, "secondary")}
          className="text-[10px] font-mono text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded px-1 transition"
          title={`Copy the ${secondary === text ? "" : "alternate "}form: ${secondary}`}
        >
          {copied === "secondary" ? "copied" : "⧉⁻"}
        </button>
      )}
    </span>
  );
}
