"use client";

import { useState, type FormEvent } from "react";
import type { LoanReplacementResult, LoanReplacement } from "@/lib/loan_schema";

type FormState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ok"; query: string; result: LoanReplacementResult }
  | { status: "error"; query: string; message: string };

const MECHANIC_CLASS: Record<string, string> = {
  "native-stock": "badge-inherited",
  "reflex-adapted": "badge-showcase",
};

const PLAUSIBILITY_CLASS: Record<string, string> = {
  strong: "accent-inherited",
  reasonable: "accent-showcase",
  speculative: "accent-loans",
};

const EXAMPLES = [
  { word: "labneh", note: "Ar لبنة — Hebrew reflex: lavnah" },
  { word: "jibneh", note: "Ar جبنة → Hebrew: gvinah" },
  { word: "אבא", note: "Aramaic loan in Hebrew (father)" },
  { word: "אמא", note: "Aramaic loan in Hebrew (mother)" },
  { word: "פלטין", note: "Greek palation → Aramaic" },
  { word: "بستان", note: "Persian → Arabic" },
];

export function LoanReplaceForm() {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [query, setQuery] = useState("");

  async function submit(q: string) {
    const cleaned = q.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setState({ status: "loading", query: cleaned });
    try {
      const resp = await fetch("/api/loan-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: cleaned }),
      });
      if (!resp.ok) {
        const msg = await resp.text();
        setState({ status: "error", query: cleaned, message: msg || `HTTP ${resp.status}` });
        return;
      }
      const result = (await resp.json()) as LoanReplacementResult;
      setState({ status: "ok", query: cleaned, result });
    } catch (err) {
      setState({ status: "error", query: cleaned, message: (err as Error).message });
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(query);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. labneh · jibneh · אבא · بستان"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={state.status === "loading" || !query.trim()}
          className="rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium
                     disabled:bg-neutral-400 disabled:cursor-not-allowed hover:bg-neutral-700 transition"
        >
          {state.status === "loading" ? "Imagining…" : "Generate"}
        </button>
      </form>

      <div className="mt-3 text-xs text-neutral-500 flex flex-wrap gap-2 items-center">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.word}
            type="button"
            onClick={() => { setQuery(ex.word); submit(ex.word); }}
            className="px-2 py-0.5 rounded border border-neutral-300 hover:border-neutral-500 font-mono"
            title={ex.note}
          >
            {ex.word}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="mt-6 text-sm text-neutral-500">
          Imagining native replacements for <span className="font-mono">{state.query}</span>… (up to ~30s)
        </div>
      )}
      {state.status === "error" && (
        <div className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {state.message}
        </div>
      )}
      {state.status === "ok" && <LoanResult result={state.result} />}
    </div>
  );
}

function LoanResult({ result }: { result: LoanReplacementResult }) {
  return (
    <div className="mt-6 pt-6 border-t border-neutral-200">
      <div className="flex flex-wrap gap-x-4 gap-y-1 items-baseline mb-4 text-sm">
        <div>
          <span className="text-xs text-neutral-500">Language:</span>{" "}
          <span className="font-medium">{result.detected_language_name}</span>
        </div>
        <div>
          <span className="text-xs text-neutral-500">Source:</span>{" "}
          <span className="accent-loans font-medium">{result.detected_source}</span>
        </div>
        <div>
          <span className="text-xs text-neutral-500">Means:</span>{" "}
          <span>&quot;{result.original_meaning}&quot;</span>
        </div>
        {result.source_form && (
          <div>
            <span className="text-xs text-neutral-500">Source form:</span>{" "}
            <span className="font-mono text-neutral-700" dir="auto">{result.source_form}</span>
          </div>
        )}
      </div>

      {result.replacements.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No replacements. (Input may not be a loanword — check the caveats.)
        </p>
      ) : (
        <div className="space-y-3">
          {result.replacements.map((r, i) => (
            <ReplacementCard key={i} r={r} index={i} />
          ))}
        </div>
      )}

      {result.caveats.length > 0 && (
        <ul className="mt-4 text-xs text-neutral-500 space-y-1">
          {result.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReplacementCard({ r, index }: { r: LoanReplacement; index: number }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-xs text-neutral-500 font-mono">{index + 1}.</span>
        <span className="font-mono text-lg font-semibold accent-proto" dir="auto">{r.candidate}</span>
        <span className="text-sm text-neutral-700">&quot;{r.gloss}&quot;</span>
        <span
          className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${
            MECHANIC_CLASS[r.mechanic] ?? ""
          }`}
        >
          {r.mechanic}
        </span>
        <span
          className={`text-xs font-medium ${PLAUSIBILITY_CLASS[r.plausibility] ?? ""}`}
        >
          {r.plausibility}
        </span>
      </div>
      {r.based_on && (
        <div className="mt-2 text-xs text-neutral-600">
          <span className="text-neutral-500">based on:</span>{" "}
          <span className="font-mono" dir="auto">{r.based_on}</span>
        </div>
      )}
      <div className="mt-1 text-xs text-neutral-600 leading-relaxed">
        <span className="text-neutral-500">derivation:</span> {r.derivation}
      </div>
      {r.notes && (
        <div className="mt-1 text-xs text-neutral-500 italic leading-relaxed">
          {r.notes}
        </div>
      )}
    </div>
  );
}
