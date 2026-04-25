"use client";

import { useEffect, useState } from "react";
import { ScriptToggle } from "@/components/ScriptToggle";
import { SCRIPT_VARIANTS, getScriptVariant } from "@/lib/scripts";

// Representative preview word per language — something recognizable and
// that exercises the script's distinctive letter shapes.
const PREVIEW_WORD: Record<string, { text: string; note: string }> = {
  ar:  { text: "بِسْمِ اللَّهِ",                 note: "Arabic · \"in the name of God\"" },
  he:  { text: "בְּרֵאשִׁית",                     note: "Hebrew · \"in the beginning\"" },
  syc: { text: "ܒܪܝܫܝܬ",                           note: "Syriac · \"in the beginning\"" },
  aii: { text: "ܫܠܵܡܵܐ",                           note: "Assyrian Neo-Aramaic · \"peace\"" },
  tru: { text: "ܫܠܳܐܡܳܐ",                          note: "Turoyo · \"peace\"" },
  gez: { text: "በስመ አብ",                           note: "Ge'ez · \"in the name of the father\"" },
  am:  { text: "ሰላም",                              note: "Amharic · \"peace\"" },
  ti:  { text: "ሰላም",                              note: "Tigrinya · \"peace\"" },
  akk: { text: "𒀭𒈗𒋛",                           note: "Akkadian · \"king\" in cuneiform" },
};

// Same localStorage key used by page.tsx and RootFamilyView.tsx.
const STORAGE_KEY = "semitic-script-choice";

export function SettingsForm() {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChoice(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const setLang = (lang: string, id: string) => {
    setChoice((prev) => {
      const next = { ...prev, [lang]: id };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const reset = () => {
    setChoice({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Only render languages that have at least 2 variants.
  const languages = Object.entries(SCRIPT_VARIANTS).filter(([, v]) => v.length >= 2);

  return (
    <div>
      <section className="space-y-3">
        {languages.map(([lang, variants]) => {
          const chosenId = choice[lang] ?? variants[0].id;
          const variant = getScriptVariant(lang, chosenId);
          const preview = PREVIEW_WORD[lang];
          const previewText = (variant?.convert ?? ((t: string) => t))(preview?.text ?? "");
          return (
            <article key={lang} className="bg-white border border-neutral-200 rounded-lg p-4">
              <header className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                <h2 className="text-lg font-semibold">
                  {preview?.note.split(" · ")[0] ?? lang}
                  <span className="ml-2 text-xs text-neutral-400 font-mono uppercase">{lang}</span>
                </h2>
                <ScriptToggle lang={lang} value={chosenId} onChange={(id) => setLang(lang, id)} />
              </header>
              <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-2">
                <div
                  className="text-3xl"
                  dir={/^(ar|he|syc|aii|tru|arc|phn|pun|sab|osa|mid|amw)$/.test(lang) ? "rtl" : "ltr"}
                  style={variant?.fontFamily ? { fontFamily: variant.fontFamily } : undefined}
                >
                  {previewText || "—"}
                </div>
                {preview && (
                  <span className="text-xs text-neutral-500 text-right">
                    {preview.note.split(" · ")[1]}
                  </span>
                )}
              </div>
              {variant?.note && (
                <div className="mt-1 text-xs text-neutral-500 italic">{variant.note}</div>
              )}
            </article>
          );
        })}
      </section>

      <footer className="mt-6 flex items-center justify-between gap-3 flex-wrap text-sm">
        <span className="text-xs text-neutral-500">
          {hydrated
            ? Object.keys(choice).length
              ? `${Object.keys(choice).length} language${Object.keys(choice).length === 1 ? "" : "s"} customized`
              : "Defaults in use"
            : "Loading…"}
        </span>
        <button
          onClick={reset}
          className="text-xs px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-100"
        >
          Reset to defaults
        </button>
      </footer>
    </div>
  );
}
