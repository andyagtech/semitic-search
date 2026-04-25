"use client";

import { useCallback, useEffect, useState } from "react";
import type { RootFamily, RootLemma } from "@/lib/root_types";
import { RTL_LANGS } from "@/lib/root_types";

type Question = {
  promptLang: string;
  promptLemma: RootLemma;
  targetLang: string;
  correctLemma: RootLemma;
  choices: RootLemma[];        // includes correctLemma + 3 distractors
  targetFamily: RootFamily;
};

function pickRandom<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeQuestion(families: RootFamily[]): Question | null {
  if (!families.length) return null;
  for (let tries = 0; tries < 20; tries++) {
    const fam = pickRandom(families);
    const langs = fam.languages.filter((l) => (fam.lemmas[l]?.length ?? 0) > 0);
    if (langs.length < 2) continue;
    const shuffled = shuffle(langs);
    const promptLang = shuffled[0];
    const targetLang = shuffled[1];
    const promptLemma = fam.lemmas[promptLang]?.[0];
    const correctLemma = fam.lemmas[targetLang]?.[0];
    if (!promptLemma || !correctLemma) continue;

    // Distractors: other families' first lemma in the same target lang.
    const others = families
      .filter((f) => f.slug !== fam.slug && f.lemmas[targetLang]?.length)
      .map((f) => f.lemmas[targetLang]![0]);
    if (others.length < 3) continue;
    const distractors = shuffle(others).slice(0, 3);
    const choices = shuffle([correctLemma, ...distractors]);

    return { promptLang, promptLemma, targetLang, correctLemma, choices, targetFamily: fam };
  }
  return null;
}

const LANG_NAME: Record<string, string> = {
  ar: "Arabic", he: "Hebrew", syc: "Classical Syriac",
  am: "Amharic", ti: "Tigrinya", gez: "Ge'ez",
  ug: "Ugaritic", akk: "Akkadian",
  arc: "Imperial Aramaic", aii: "Assyrian Neo-Aramaic",
  sab: "Sabaean", osa: "Old South Arabian",
  phn: "Phoenician", pun: "Punic",
  tru: "Turoyo", mid: "Classical Mandaic", amw: "Western Neo-Aramaic",
};

export function GuessGame({ families }: { families: RootFamily[] }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [chosen, setChosen] = useState<RootLemma | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const newQuestion = useCallback(() => {
    const q = makeQuestion(families);
    setQuestion(q);
    setChosen(null);
  }, [families]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // Keyboard shortcuts: digits 1-4 pick an answer; Enter advances after
  // answering. Ignore when user is typing in a form field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (!question) return;
      if (chosen === null && e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key, 10) - 1;
        const choice = question.choices[idx];
        if (!choice) return;
        const isCorrect = choice === question.correctLemma;
        setChosen(choice);
        setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
      } else if (e.key === "Enter" && chosen !== null) {
        newQuestion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, chosen, newQuestion]);

  if (!question) {
    return <div className="text-sm text-neutral-500">Loading…</div>;
  }

  const promptRTL = RTL_LANGS.has(question.promptLang);
  const settled = chosen !== null;
  const correct = chosen === question.correctLemma;

  return (
    <div>
      <div className="mb-4 text-sm text-neutral-600 flex items-center justify-between">
        <span>
          Score: <b className="text-neutral-900">{score.correct}</b>/{score.total}
        </span>
        <button
          onClick={() => { setScore({ correct: 0, total: 0 }); newQuestion(); }}
          className="text-xs text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-4">
        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
          {LANG_NAME[question.promptLang]} word
        </div>
        <div className="text-4xl font-medium" dir={promptRTL ? "rtl" : "ltr"}>
          {question.promptLemma.vocalized_form ?? question.promptLemma.word}
        </div>
        {question.promptLemma.romanization && (
          <div className="text-sm text-neutral-500 font-mono mt-1">
            {question.promptLemma.romanization}
          </div>
        )}
        {question.promptLemma.gloss && (
          <div className="text-sm text-neutral-700 mt-2">— {question.promptLemma.gloss}</div>
        )}
      </div>

      <div className="mb-3 text-sm font-medium text-neutral-700">
        Which {LANG_NAME[question.targetLang]} word is its cognate?
      </div>

      <div className="grid gap-2">
        {question.choices.map((choice, i) => {
          const isCorrect = choice === question.correctLemma;
          const isChosen = choice === chosen;
          const targetRTL = RTL_LANGS.has(question.targetLang);
          let cls = "bg-white border-neutral-200 hover:border-neutral-500";
          if (settled) {
            if (isCorrect) cls = "bg-emerald-50 border-emerald-400";
            else if (isChosen) cls = "bg-red-50 border-red-400";
            else cls = "bg-white border-neutral-200 opacity-60";
          }
          return (
            <button
              key={i}
              disabled={settled}
              onClick={() => {
                setChosen(choice);
                setScore((s) => ({
                  correct: s.correct + (isCorrect ? 1 : 0),
                  total: s.total + 1,
                }));
              }}
              className={`text-left p-3 rounded-lg border-2 transition ${cls}`}
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-600">
                  {i + 1}
                </kbd>
                <span className="text-xl font-medium" dir={targetRTL ? "rtl" : "ltr"}>
                  {choice.vocalized_form ?? choice.word}
                </span>
                {settled && choice.romanization && (
                  <span className="text-xs text-neutral-500 font-mono">{choice.romanization}</span>
                )}
                {settled && choice.gloss && (
                  <span className="text-xs text-neutral-600">— {choice.gloss}</span>
                )}
              </div>
              {settled && isCorrect && (
                <div className="mt-1 text-xs text-emerald-800">
                  ✓ shared root: <span className="font-mono">{question.targetFamily.canonical.replace(/ /g, "-")}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {settled && (
        <div className="mt-4 flex items-center justify-between">
          <div className={`text-sm ${correct ? "text-emerald-700" : "text-red-700"}`}>
            {correct ? "Correct!" : "Not quite — try the next one."}
          </div>
          <button
            onClick={newQuestion}
            className="px-4 py-1.5 rounded bg-neutral-900 text-white text-sm hover:bg-neutral-800"
          >
            Next → <kbd className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded bg-white/20 border border-white/30">Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
