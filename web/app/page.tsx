"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SemiticSearchResult } from "@/lib/models";
import { SearchResultTable } from "@/components/SearchResultTable";
import { Keyboard, type KeyboardScript } from "@/components/Keyboard";
import { canonicalSlug } from "@/lib/canonical_root";
import { explainReflex } from "@/lib/fuzzy_canonical";
import { reconstruct } from "@/lib/reconstruct";
import { ScriptToggle } from "@/components/ScriptToggle";
import { SCRIPT_VARIANTS, getScriptVariant } from "@/lib/scripts";
import { TourHost, TourHelpButton } from "@/components/Tour";

type FamilySummary = {
  slug: string;
  canonical: string;
  lang_count: number;
  lemma_count: number;
};

// Themed search packs — curated root sets that reveal a semantic category
// across the Semitic family. Each root is filtered at render-time against
// the shipped family manifest so we only show packs whose roots exist.
const SEED_PACKS: { label: string; subtitle: string; roots: string[] }[] = [
  { label: "Body parts", subtitle: "anatomy cognates",
    roots: ["ʿ-y-n", "y-d", "r-ʾ-š", "l-b", "f-m", "r-g-l", "š-n", "l-š-n"] },
  { label: "Kinship", subtitle: "family terminology",
    roots: ["ʾ-b", "ʾ-m", "ʾ-ḥ", "b-n", "b-t", "ʾ-š-h"] },
  { label: "Peace & wholeness", subtitle: "root of salam / shalom",
    roots: ["š-l-m", "š-l-h", "n-w-ḥ"] },
  { label: "Colors", subtitle: "color-term roots",
    roots: ["ḥ-m-r", "l-b-n", "š-ḥ-r", "y-r-q", "ṣ-h-b", "ʾ-d-m"] },
  { label: "Numbers", subtitle: "cardinal number roots",
    roots: ["ʾ-ḥ-d", "ṯ-n-y", "ṯ-l-ṯ", "ʾ-r-b", "ḫ-m-s", "š-b-ʿ", "ʿ-š-r"] },
  { label: "Writing & scripture", subtitle: "verbs of text & record",
    roots: ["k-t-b", "s-f-r", "q-r-ʾ", "l-m-d", "ʿ-l-m"] },
  { label: "Rulership", subtitle: "leadership & sovereignty",
    roots: ["m-l-k", "ʾ-d-n", "r-ʾ-š", "n-g-d"] },
  { label: "Weather & sky", subtitle: "atmospheric & natural phenomena",
    roots: ["b-r-q", "m-ṭ-r", "r-ʿ-m", "š-m-š", "y-r-ḥ", "k-w-k-b"] },
  { label: "Dwelling & place", subtitle: "houses, cities, gates",
    roots: ["b-y-t", "q-r-y", "š-ʿ-r", "ʾ-r-ḍ"] },
  { label: "Iconic Proto-Semitic roots", subtitle: "pedagogically classic examples",
    roots: ["k-l-b", "ḏ-h-b", "ʾ-r-ḍ", "ṯ-l-ṯ", "b-r-k"] },
  { label: "Religion & spirit", subtitle: "theology & ritual",
    roots: ["ʾ-l-h", "q-d-š", "b-r-k", "z-b-ḥ", "ṣ-l-y", "k-h-n"] },
  { label: "Food & drink", subtitle: "bread, oil, wine, meat",
    roots: ["ʾ-k-l", "l-ḥ-m", "š-t-y", "ḥ-l-b", "z-y-t", "b-š-l"] },
  { label: "Emotions", subtitle: "love, fear, grief, joy",
    roots: ["ʾ-h-b", "r-ḥ-m", "y-r-ʾ", "ḥ-s-d", "b-k-y", "ś-m-ḥ"] },
  { label: "Wine & vine", subtitle: "vineyard, grape, drink, intoxication",
    roots: ["y-n", "k-r-m", "ʿ-n-b", "š-k-r", "ḫ-m-r"] },
  { label: "Time & sun", subtitle: "day, night, dawn, dusk, year",
    roots: ["y-w-m", "l-y-l", "š-n-y", "b-q-r", "ʿ-r-b", "š-m-š"] },
  { label: "Trade & work", subtitle: "commerce, wage, craft",
    roots: ["m-k-r", "k-s-p", "ʿ-b-d", "š-k-r", "p-ʿ-l"] },
  { label: "Motion & path", subtitle: "walking, running, returning",
    roots: ["h-l-k", "b-w-ʾ", "y-ṣ-ʾ", "š-w-b", "r-w-ṣ", "ʿ-b-r"] },
  { label: "Speech & knowledge", subtitle: "speaking, hearing, teaching, wisdom",
    roots: ["ʾ-m-r", "d-b-r", "š-m-ʿ", "l-m-d", "y-d-ʿ", "ḥ-k-m"] },
  { label: "Water & flow", subtitle: "rain, river, sea, spring",
    roots: ["m-y-m", "n-h-r", "y-m", "m-ṭ-r", "ʿ-y-n"] },
];

type RelatedLemma = {
  word: string;
  vocalized_form: string | null;
  pos: string;
  first_gloss: string | null;
};

type VerifiedCognate = SemiticSearchResult["cognates"][number] & {
  verification?: VerificationStatus;
  wiktionary_url?: string | null;
  matched_entry?: {
    word: string;
    vocalized_form: string | null;
    root: string | null;
    pos: string | null;
  };
  related_lemmas?: RelatedLemma[];
};

type VerifiedResult = Omit<SemiticSearchResult, "cognates"> & {
  cognates: VerifiedCognate[];
};

type SearchResponse = {
  converted_from: string | null;
  input: string;
  result: VerifiedResult;
  usage: { model: string; input_tokens: number; output_tokens: number };
};

type ValidationVerdict = "agree" | "disagree" | "unsure";

type Citation = { url: string; title?: string | null; quote?: string | null };

type ValidationResponse = {
  overall_agreement: "high" | "mixed" | "low";
  root_verdict: ValidationVerdict;
  root_reason?: string | null;
  cognate_verdicts: Array<{
    cognate_index: number;
    language: string;
    surface_form: string;
    verdict: ValidationVerdict;
    reason: string;
    citations: Citation[];
  }>;
  missed_cognates: Array<{
    language: string;
    surface_form: string;
    gloss: string;
    reason: string;
    citations: Citation[];
  }>;
  overall_notes: string;
  raw_citations: string[];
};

const VERDICT_CLASS: Record<ValidationVerdict, string> = {
  agree: "bg-emerald-600 text-white",
  disagree: "bg-red-600 text-white",
  unsure: "bg-neutral-500 text-white",
};

type VerificationStatus =
  | "attested"
  | "root_attested"
  | "root_inferred_match"
  | "editor_claim"
  | "not_in_index"
  | "lang_not_indexed";

const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; className: string; title: string }> = {
  attested: {
    label: "✓ attested",
    className: "bg-emerald-600 text-white",
    title: "Exact surface form found in the Wiktionary index.",
  },
  root_attested: {
    label: "root found",
    className: "bg-amber-500 text-white",
    title: "The root exists in the index, but this exact surface form was not matched.",
  },
  root_inferred_match: {
    label: "inferred match",
    className: "bg-sky-500 text-white",
    title: "Matches a root we mechanically inferred (no Wiktionary editor annotation). Weaker than attested.",
  },
  editor_claim: {
    label: "✓ editor-curated",
    className: "bg-indigo-600 text-white",
    title: "A Wiktionary editor hand-curated this cross-language cognate claim.",
  },
  not_in_index: {
    label: "unattested",
    className: "bg-neutral-400 text-white",
    title: "No match for this word or its root in the Wiktionary index — LLM suggestion unverified.",
  },
  lang_not_indexed: {
    label: "no v1 index",
    className: "bg-neutral-300 text-neutral-700",
    title: "This language isn't in our Kaikki dumps — cannot verify locally.",
  },
};

type Suggestion = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  root: string | null;
  pos: string;
  first_gloss: string | null;
  lang: string;
  lang_name?: string;
};

const SCRIPTS = [
  { id: "native", label: "Native script", placeholder: "كتب · שלום · ܫܠܡܐ · ሰላም" },
  { id: "buckwalter", label: "Buckwalter (Arabic)", placeholder: "ktb · slAm · kAtib" },
  { id: "sbl-he", label: "SBL (Hebrew)", placeholder: "shlm · ktb · mlk" },
] as const;

type Mode = (typeof SCRIPTS)[number]["id"];

const TIER_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-300",
  medium: "bg-sky-100 text-sky-900 border-sky-300",
  low: "bg-amber-100 text-amber-900 border-amber-300",
  speculative: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  unknown: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("native");
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [kbScript, setKbScript] = useState<KeyboardScript>("ar");
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressNextFetch = useRef(false);

  function insertAtCursor(ch: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? word.length;
    const end = input?.selectionEnd ?? word.length;
    const next = word.slice(0, start) + ch + word.slice(end);
    setWord(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + ch.length, start + ch.length);
    });
  }

  function backspaceAtCursor() {
    const input = inputRef.current;
    const start = input?.selectionStart ?? word.length;
    const end = input?.selectionEnd ?? word.length;
    if (start === end && start === 0) return;
    const from = start === end ? start - 1 : start;
    const next = word.slice(0, from) + word.slice(end);
    setWord(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(from, from);
    });
  }

  // Debounced autocomplete. Only fire when input has ≥2 chars.
  useEffect(() => {
    if (suppressNextFetch.current) {
      suppressNextFetch.current = false;
      return;
    }
    if (word.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: word });
        if (mode !== "native") params.set("scheme", mode);
        const res = await fetch(`/api/autocomplete?${params}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(json.suggestions ?? []);
        setHighlighted(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn(e);
      }
    }, 180);
    return () => {
      ctrl.abort();
      clearTimeout(handle);
    };
  }, [word, mode]);

  const [streamPhase, setStreamPhase] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Recent searches stored client-side. Keeps the last 10 distinct queries
  // so users can jump back quickly without typing.
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("semitic-recent");
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Deep link: if the URL has ?q=..., auto-populate and run the search.
  // Also handle back/forward navigation — when the URL's ?q= changes we
  // re-run the search so history navigation feels natural.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const runFromUrl = () => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && q.trim()) {
        setWord(q);
        setTimeout(() => onSearch(q.trim()), 0);
      } else {
        setData(null);
        setWord("");
      }
    };
    runFromUrl();
    window.addEventListener("popstate", runFromUrl);
    return () => window.removeEventListener("popstate", runFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard: "/" focuses the search input; "Escape" blurs it. Skip if the
  // user's actively typing in a field already — we never steal focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setShowSuggestions(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch the tiny slug manifest once — lets us show "explore root family"
  // links only when a matching page actually exists.
  const [familySet, setFamilySet] = useState<Set<string>>(new Set());
  const [featured, setFeatured] = useState<FamilySummary[]>([]);
  useEffect(() => {
    // Hand-curated greatest-hits roots: chosen for pedagogical value and
    // geographic/chronological breadth. Filter down to only those that have
    // a family page in the shipped manifest so we never link to a 404.
    const CURATED = [
      "k-l-b", // "dog" — attested in 14 langs incl. Akkadian kalbu, Ugaritic cuneiform
      "k-t-b", // "write" — defining Semitic verbal root
      "s-l-m", // "peace/whole" — salam/shalom/shlama, iconic greeting
      "m-l-k", // "king/own" — malik, melekh, malka
      "ʾ-r-ḍ", // "earth/land" — PS *ḍ split showcases fuzzy feature
      "ḏ-h-b", // "gold" — PS *ḏ split
      "ṯ-l-ṯ", // "three" — PS *ṯ three-way split (Ar/Heb/Aram)
      "ʿ-y-n", // "eye/spring" — iconic Semitic body-part root
      "b-y-t", // "house" — everyday vocabulary, hollow-root example
      "q-t-l", // "kill" — prototypical strong verb used in every textbook
    ];
    fetch("/data/family_slugs.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FamilySummary[]) => {
        setFamilySet(new Set(list.map((f) => f.slug)));
        const bySlug = new Map(list.map((f) => [f.slug, f]));
        const picks: FamilySummary[] = [];
        for (const slug of CURATED) {
          const f = bySlug.get(slug);
          if (f) picks.push(f);
        }
        // If any curated slugs aren't in the manifest, pad with top-by-coverage.
        for (const f of list) {
          if (picks.length >= 10) break;
          if (!picks.some((p) => p.slug === f.slug)) picks.push(f);
        }
        setFeatured(picks.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  async function onValidate() {
    if (!data || validating) return;
    setValidating(true);
    setValidation(null);
    setValidationError(null);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data.result),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setValidation(json);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : String(e));
    } finally {
      setValidating(false);
    }
  }

  async function onSearch(overrideWord?: string) {
    const q = (overrideWord ?? word).trim();
    if (!q || loading) return;
    // Persist to recent history (dedupe + cap at 10).
    setRecent((prev) => {
      const next = [q, ...prev.filter((x) => x !== q)].slice(0, 10);
      try { localStorage.setItem("semitic-recent", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    // Make the URL shareable — pushState so back button returns to homepage,
    // but don't spam history if the query is identical to what's already there.
    if (typeof window !== "undefined") {
      const current = new URLSearchParams(window.location.search).get("q");
      if (current !== q) {
        const nextUrl = `${window.location.pathname}?q=${encodeURIComponent(q)}`;
        window.history.pushState({}, "", nextUrl);
      }
    }
    setLoading(true);
    setError(null);
    setData(null);
    setShowSuggestions(false);
    setStreamPhase("calling model...");
    try {
      const body: { word: string; scheme?: "buckwalter" | "sbl-he" } = { word: q };
      if (!overrideWord && mode !== "native") body.scheme = mode;
      const res = await fetch("/api/search/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Running draft of the result — filled progressively from SSE events.
      const draft: SearchResponse = {
        converted_from: null,
        input: q,
        result: {
          input_word: q,
          detected_language: "ar",
          detected_language_name: "",
          normalized_form: q,
          extracted_root: null,
          root_type: null,
          root_confidence: "unknown",
          proto_slots: null,
          cognates: [],
          caveats: [],
        },
        usage: { model: "", input_tokens: 0, output_tokens: 0 },
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (;;) {
          const sep = buffer.indexOf("\n\n");
          if (sep === -1) break;
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          let event = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7);
            else if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (!data) continue;
          let payload: any;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }

          if (event === "meta") {
            draft.converted_from = payload.converted_from ?? null;
            draft.input = payload.input;
            draft.usage.model = payload.model;
            setStreamPhase(`calling ${payload.model}...`);
          } else if (event === "root") {
            draft.result = { ...draft.result, ...payload };
            setStreamPhase("streaming cognates...");
            setData({ ...draft, result: { ...draft.result } });
          } else if (event === "cognate") {
            const arr = [...draft.result.cognates];
            arr[payload.index] = payload.cognate;
            draft.result = { ...draft.result, cognates: arr };
            setData({ ...draft, result: { ...draft.result } });
          } else if (event === "phase") {
            setStreamPhase(payload.status === "verifying" ? "verifying against Wiktionary..." : payload.status);
          } else if (event === "verified") {
            const arr = [...draft.result.cognates];
            arr[payload.index] = payload.cognate;
            draft.result = { ...draft.result, cognates: arr };
            setData({ ...draft, result: { ...draft.result } });
          } else if (event === "done") {
            draft.result.caveats = payload.caveats ?? [];
            draft.usage = payload.usage;
            setData({ ...draft, result: { ...draft.result } });
            setStreamPhase(null);
          } else if (event === "error") {
            throw new Error(payload.message ?? "stream error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setStreamPhase(null);
    }
  }

  function pick(s: Suggestion) {
    suppressNextFetch.current = true;
    setWord(s.word);
    setSuggestions([]);
    setShowSuggestions(false);
    // Suggestions are always in native script; skip romanization conversion.
    onSearch(s.word);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") onSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < suggestions.length) pick(suggestions[highlighted]);
      else onSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <TourHost />
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Semitic Search</h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              Identify a Semitic root and find cross-language cognates, ranked by confidence.
            </p>
          </div>
          <nav id="tour-nav" className="flex gap-3 text-sm whitespace-nowrap self-start sm:mt-1 flex-wrap">
            <Link href="/roots" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Roots
            </Link>
            <Link href="/tables" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Tables
            </Link>
            <Link href="/polyglot" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Polyglot table
            </Link>
            <Link href="/timeline" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Timeline
            </Link>
            <Link href="/linguistics" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Sound changes
            </Link>
            <Link href="/isogloss" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Isogloss map
            </Link>
            <Link href="/cross-language" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Cross-lang
            </Link>
            <Link href="/themes" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Themes
            </Link>
            <Link href="/guess" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Guess
            </Link>
            <Link href="/stats" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Stats
            </Link>
            <Link href="/font-lab" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Font lab
            </Link>
            <Link href="/settings" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Preferences
            </Link>
            <Link href="/methodology" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Methodology
            </Link>
            <Link href="/docs" className="text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline">
              Docs
            </Link>
            <TourHelpButton />
          </nav>
        </header>

        {!data && !loading && featured.length > 0 && (() => {
          // Deterministic pick-of-the-day: hash date → index. Same all day,
          // changes at midnight local time. Cycles through whatever's in the
          // featured list (curated set + top-by-coverage fallback).
          const d = new Date();
          const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
          const pick = featured[seed % featured.length];
          if (!pick) return null;
          return (
            <Link
              id="tour-root-of-day"
              href={`/roots/${encodeURIComponent(pick.slug)}`}
              className="block mb-5 rounded-lg p-4 bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 hover:border-amber-400 transition"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold">
                    Root of the day
                  </span>
                  <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-mono font-semibold tracking-tight">
                      {pick.canonical.replace(/ /g, "-")}
                    </span>
                    <span className="text-sm text-neutral-600">
                      {pick.lang_count} langs · {pick.lemma_count} lemmas
                    </span>
                  </div>
                </div>
                <span className="text-xs text-amber-700 underline-offset-2 underline">
                  Explore family →
                </span>
              </div>
            </Link>
          );
        })()}

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 sm:p-5">
          <div id="tour-script-buttons" className="flex gap-2 mb-4 flex-wrap">
            {SCRIPTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setMode(s.id)}
                className={`px-3 py-1.5 rounded text-sm border transition ${
                  mode === s.id
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <div id="tour-search-box" className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={word}
                onChange={(e) => {
                  setWord(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                onKeyDown={onKeyDown}
                placeholder={SCRIPTS.find((s) => s.id === mode)?.placeholder}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded font-mono text-lg focus:outline-none focus:border-neutral-500"
                dir={mode === "native" ? "auto" : "ltr"}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => onSearch()}
                disabled={loading || !word.trim()}
                className="px-5 py-2 bg-neutral-900 text-white rounded disabled:opacity-50 min-w-24"
              >
                {loading ? <span className="inline-flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />…</span> : "Search"}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <ul className="mt-1 bg-white border border-neutral-200 rounded shadow-sm max-h-80 overflow-auto">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.word}-${i}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`px-4 py-2 cursor-pointer flex items-baseline justify-between gap-3 ${
                      highlighted === i ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-baseline gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 shrink-0 w-10">
                        {s.lang_name ?? s.lang}
                      </span>
                      <span className="font-medium text-lg" dir="auto">
                        {s.vocalized_form ?? s.word}
                      </span>
                      {s.romanization && (
                        <span className="text-xs text-neutral-500 font-mono">{s.romanization}</span>
                      )}
                      {s.first_gloss && (
                        <span className="text-sm text-neutral-600 truncate">— {s.first_gloss}</span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono shrink-0">
                      {s.root ?? s.pos}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            {mode !== "native" ? (
              <p className="text-xs text-neutral-500">
                Type in {mode === "buckwalter" ? "Buckwalter ASCII" : "SBL-style romanization"}; we convert before searching.
              </p>
            ) : (
              <span className="text-xs text-neutral-400">Or type in any Semitic script directly.</span>
            )}
            <button
              onClick={() => setShowKeyboard((v) => !v)}
              className="text-xs px-2 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100"
            >
              {showKeyboard ? "Hide keyboard ▲" : "Show keyboard ▼"}
            </button>
          </div>

          {showKeyboard && (
            <Keyboard
              script={kbScript}
              onSetScript={setKbScript}
              onPress={insertAtCursor}
              onBackspace={backspaceAtCursor}
              onClear={() => setWord("")}
            />
          )}

          {recent.length > 0 && !data && !loading && (
            <div className="mt-3 flex items-baseline gap-2 flex-wrap text-xs">
              <span className="text-neutral-500 uppercase tracking-wider">Recent:</span>
              {recent.map((q) => (
                <button
                  key={q}
                  onClick={() => { setWord(q); onSearch(q); }}
                  className="px-2 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800"
                  dir="auto"
                >
                  {q}
                </button>
              ))}
              <button
                onClick={() => { setRecent([]); try { localStorage.removeItem("semitic-recent"); } catch {} }}
                className="text-neutral-400 hover:text-neutral-700 underline-offset-2 hover:underline"
              >
                clear
              </button>
            </div>
          )}

          <div className="mt-3 text-[11px] text-neutral-400">
            Tip: press <kbd className="px-1 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono">/</kbd> to focus search.
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-900 rounded p-4 text-sm">
            Error: {error}
          </div>
        )}

        {streamPhase && (
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {streamPhase}
          </div>
        )}

        {data && (
          <Result
            data={data}
            validation={validation}
            onValidate={onValidate}
            validating={validating}
            validationError={validationError}
            familySet={familySet}
          />
        )}

        {!data && !loading && featured.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-medium text-neutral-700 uppercase tracking-wider">
                Featured root families
              </h2>
              <Link href="/roots" className="text-xs text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline">
                browse all {familySet.size} →
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {featured.map((f) => (
                <Link
                  key={f.slug}
                  href={`/roots/${encodeURIComponent(f.slug)}`}
                  className="block bg-white border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 hover:shadow-sm transition"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-lg font-mono font-semibold">{f.canonical}</span>
                    <span className="text-xs text-neutral-500">
                      {f.lang_count} langs · {f.lemma_count} lemmas
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!data && !loading && familySet.size > 0 && (
          <section id="tour-seed-packs" className="mt-10">
            <h2 className="text-lg font-medium mb-3 text-neutral-800">
              Themed tours
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                curated root sets around a common topic
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SEED_PACKS.map((pack) => {
                const present = pack.roots.filter((s) => familySet.has(s));
                if (present.length === 0) return null;
                return (
                  <div key={pack.label} className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-semibold">{pack.label}</span>
                      <span className="ml-auto text-xs text-neutral-500">{pack.subtitle}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {present.map((s) => (
                        <Link
                          key={s}
                          href={`/roots/${encodeURIComponent(s)}`}
                          className="text-xs px-2 py-0.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-white hover:border-neutral-500 font-mono"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="mt-10 text-xs text-neutral-500 flex flex-wrap items-center gap-4">
          <span>v0 prototype. LLM-generated cognates may be wrong — verify before citing.</span>
          <a
            href="mailto:el.andy.barr@gmail.com?subject=Semitic%20Search%20feedback&body=Hi%20Andy%2C%0A%0AI%20want%20to%20report%2Fpropose%3A%20%0A%0A(e.g.%20%22Syriac%20cognate%20for%20k-t-b%20is%20missing%22%2C%20%22b-r-k%20m-l-k%20link%20looks%20wrong%22)%0A%0ASource%20or%20reference%3A%0A"
            className="underline underline-offset-2 hover:text-neutral-800"
          >
            Report an error / propose a cognate →
          </a>
        </footer>
      </div>
    </main>
  );
}

function ReflexBadge({
  inputCanonical,
  matchCanonical,
}: {
  inputCanonical: string;
  matchCanonical: string;
}) {
  const [open, setOpen] = useState(false);
  const explanations = explainReflex(inputCanonical, matchCanonical);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-semibold px-1 py-0.5 rounded bg-violet-500 text-white hover:bg-violet-600 cursor-pointer"
        aria-label="Show Proto-Semitic correspondence"
      >
        reflex
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute z-50 left-0 top-full mt-1 w-80 max-w-[90vw] p-3 rounded-lg shadow-lg bg-white border border-violet-200 text-xs text-neutral-700">
            <div className="font-semibold text-neutral-900 mb-1.5">
              Matched via sound correspondence
            </div>
            <div className="font-mono text-[11px] text-neutral-500 mb-2">
              {inputCanonical} <span className="text-neutral-400">↔</span> {matchCanonical}
            </div>
            {explanations.length === 0 ? (
              <div className="text-neutral-500">(No reflex difference detected)</div>
            ) : (
              <ul className="space-y-1.5">
                {explanations.map((e) => (
                  <li key={e.position} className="leading-snug">
                    <span className="font-mono bg-violet-100 px-1 rounded">
                      position {e.position}: <b>{e.inputPhoneme}</b> ↔ <b>{e.matchPhoneme}</b>
                    </span>
                    <div className="mt-0.5 text-[11px] text-neutral-600">{e.gloss}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </span>
  );
}

type AttestedCognate = {
  word: string;
  vocalized_form: string | null;
  romanization: string | null;
  pos: string;
  gloss: string | null;
  root: string;
  root_canonical?: string | null;
  source: string;
  via_reflex?: boolean;
  attestation?: { source: string; citation: string } | null;
};

function AttestationBadge({ a }: { a: { source: string; citation: string } }) {
  const { icon, title } = (() => {
    switch (a.source) {
      case "tanakh":    return { icon: "T",  title: `First attested in the Tanakh at ${a.citation}` };
      case "quran":     return { icon: "☪︎",  title: `First attested in the Qur'an at ${a.citation}` };
      case "mishnah":   return { icon: "✡︎",  title: `First attested in the Mishnah at ${a.citation}` };
      case "onkelos":   return { icon: "𐡀",  title: `Attested in Targum Onkelos at ${a.citation}` };
      case "jonathan":  return { icon: "𐡀",  title: `Attested in Targum Jonathan at ${a.citation}` };
      case "neofiti":   return { icon: "𐡀",  title: `Attested in Targum Neofiti at ${a.citation}` };
      case "jerusalem": return { icon: "𐡀",  title: `Attested in Targum Jerusalem at ${a.citation}` };
      default:          return { icon: "•",  title: `Attested in ${a.source} at ${a.citation}` };
    }
  })();
  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200"
      title={title}
    >
      {icon} {a.citation}
    </span>
  );
}

type AttestedResponse = {
  canonical: string;
  lang_count: number;
  lemma_count: number;
  languages: string[];
  language_names: Record<string, string>;
  lemmas: Record<string, AttestedCognate[]>;
};

function Result({
  data,
  validation,
  onValidate,
  validating,
  validationError,
  familySet,
}: {
  data: SearchResponse;
  validation: ValidationResponse | null;
  onValidate: () => void;
  validating: boolean;
  validationError: string | null;
  familySet: Set<string>;
}) {
  const r = data.result;
  const verdictByIndex = new Map<number, ValidationResponse["cognate_verdicts"][number]>();
  for (const v of validation?.cognate_verdicts ?? []) {
    verdictByIndex.set(v.cognate_index, v);
  }

  // If the extracted root maps to a feature page, link to it.
  const rootSlug = r.extracted_root ? canonicalSlug(r.extracted_root) : null;
  const hasFamilyPage = rootSlug !== null && familySet.has(rootSlug);

  // Fetch attested cross-lang cognates from the index as soon as we have a root.
  const [attested, setAttested] = useState<AttestedResponse | null>(null);
  // Per-language script/font selection, keyed by lang code. Persisted to
  // localStorage so the user's choice survives navigation + reload.
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
  useEffect(() => {
    if (!r.extracted_root) return;
    const canon = canonicalSlug(r.extracted_root);
    if (!canon) return;
    const canonicalKey = canon.replace(/-/g, " ");
    const params = new URLSearchParams({
      canonical: canonicalKey,
      per_lang: "6",
      fuzzy: "1",
    });
    if (r.detected_language) params.set("exclude_lang", r.detected_language);
    fetch(`/api/cognates?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setAttested(json))
      .catch(() => {});
  }, [r.extracted_root, r.detected_language]);
  return (
    <div className="mt-6 bg-white rounded-lg border border-neutral-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <div className="text-sm text-neutral-500">
            {r.detected_language_name}
            {data.converted_from && (
              <span> · romanization {data.converted_from} → {data.input}</span>
            )}
          </div>
          <div className="text-3xl font-medium mt-1" dir="auto">{r.input_word}</div>
        </div>
        {r.extracted_root && (
          <div className="text-right">
            <div className="text-xs text-neutral-500">root</div>
            <div className="text-xl font-semibold" dir="auto">{r.extracted_root}</div>
            {r.root_type && <div className="text-xs text-neutral-500">{r.root_type}</div>}
            {hasFamilyPage && (
              <Link
                href={`/roots/${encodeURIComponent(rootSlug!)}`}
                className="inline-block mt-1 text-xs text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
              >
                Explore root family ↗
              </Link>
            )}
          </div>
        )}
      </div>

      {r.proto_slots && r.proto_slots.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-medium text-neutral-700 mb-2">Proto-Semitic slot candidates</h3>
          <div className="flex gap-3 flex-wrap">
            {r.proto_slots.map((slot, i) => (
              <div key={i} className="flex-1 min-w-24 bg-neutral-50 border border-neutral-200 rounded p-3">
                <div className="text-2xl font-mono mb-1" dir="auto">{slot.surface_consonant}</div>
                <div className="text-xs space-y-0.5">
                  {slot.proto_candidates.map((c, j) => (
                    <div key={j} className="flex justify-between">
                      <span className="font-mono">{c.proto_phoneme}</span>
                      <span className="text-neutral-500">{c.weight.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attested && attested.lemma_count > 0 && attested.lang_count >= 2 && (() => {
        // Reconstruct from the top representative lemma per language. Using
        // only rank-0 keeps the signal clean — additional lemmas in the same
        // language share the root by construction, so they'd add no info.
        const cognates: [string, string][] = [];
        for (const l of attested.languages) {
          const top = attested.lemmas[l]?.[0];
          if (top?.root_canonical) cognates.push([l, top.root_canonical]);
        }
        if (cognates.length < 2) return null;
        const rec = reconstruct(cognates);
        if (!rec.ps_root) return null;
        const tier =
          rec.overall_confidence >= 0.9 ? "high"
          : rec.overall_confidence >= 0.6 ? "medium"
          : "low";
        const tierClass = {
          high: "bg-amber-50 border-amber-300 text-amber-900",
          medium: "bg-amber-50 border-amber-200 text-amber-800",
          low: "bg-neutral-50 border-neutral-200 text-neutral-700",
        }[tier];
        return (
          <div className={`mb-4 border rounded-lg p-3 ${tierClass}`}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="text-sm font-semibold">
                Reconstructed Proto-Semitic ancestor
              </h3>
              <span className="text-xs font-mono">
                {Math.round(rec.overall_confidence * 100)}% confident
              </span>
            </div>
            <div className="font-mono text-lg">
              <span className="text-amber-700">*</span>{rec.ps_root.toLowerCase().replace(/ /g, "-")}
            </div>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-neutral-600 hover:text-neutral-900">
                Show per-slot reasoning
              </summary>
              <ul className="mt-1 space-y-1">
                {rec.slots.map((s) => (
                  <li key={s.position} className="font-mono">
                    pos {s.position}: <b>*{s.ps_label.toLowerCase()}</b>
                    <span className="text-neutral-500"> · {Math.round(s.confidence * 100)}% ({s.supporters.join(",")})</span>
                    {s.alternatives.length > 0 && (
                      <span className="text-neutral-400"> · alt {s.alternatives.map((a) => `*${a.label.toLowerCase()}(${Math.round(a.confidence * 100)}%)`).join(" ")}</span>
                    )}
                  </li>
                ))}
              </ul>
              {rec.warnings.length > 0 && (
                <div className="mt-1 text-red-700">⚠ {rec.warnings.join(" · ")}</div>
              )}
            </details>
          </div>
        );
      })()}

      {attested && attested.lemma_count > 0 && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-sm font-medium text-neutral-700">
              Attested cognates
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                from the {attested.lemma_count}-lemma index · violet = via PS sound change
              </span>
            </h3>
            {hasFamilyPage && (
              <Link
                href={`/roots/${encodeURIComponent(rootSlug!)}`}
                className="text-xs text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
              >
                Full root family →
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {attested.languages.map((l) => {
              const items = attested.lemmas[l];
              if (!items?.length) return null;
              const isRTL = /^(ar|he|syc|am|ti|gez|ug|arc|aii|sab|osa|phn|pun|tru|mid|amw)$/.test(l);
              const hasToggle = !!SCRIPT_VARIANTS[l];
              const chosenId = scriptChoice[l] ?? SCRIPT_VARIANTS[l]?.[0]?.id ?? "default";
              const variant = getScriptVariant(l, chosenId);
              const variantFont = variant?.fontFamily;
              const convertFn = variant?.convert;
              return (
                <div key={l} className="border border-emerald-200 bg-emerald-50/40 rounded p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                      {attested.language_names[l] ?? l}
                    </span>
                    {hasToggle && (
                      <ScriptToggle lang={l} value={chosenId} onChange={(id) => setScript(l, id)} compact />
                    )}
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {l} · {items.length}
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {items.map((item, j) => {
                      const raw = item.vocalized_form ?? item.word;
                      const display = convertFn ? convertFn(raw) : raw;
                      return (
                      <li key={j} className="flex items-baseline gap-1.5">
                        <span
                          className="font-medium"
                          dir={isRTL ? "rtl" : "ltr"}
                          style={variantFont ? { fontFamily: variantFont, fontSize: "1.05em" } : undefined}
                        >
                          {display}
                        </span>
                        {item.romanization && (
                          <span className="text-xs text-neutral-500 font-mono">
                            {item.romanization}
                          </span>
                        )}
                        {item.gloss && (
                          <span className="text-xs text-neutral-700">— {item.gloss.slice(0, 40)}</span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                            item.source === "gold" ? "bg-emerald-600 text-white" : "bg-sky-500 text-white"
                          }`}
                        >
                          {item.source === "gold" ? "attested" : "inferred"}
                        </span>
                        {item.via_reflex && (
                          <ReflexBadge
                            inputCanonical={attested.canonical}
                            matchCanonical={item.root_canonical ?? ""}
                          />
                        )}
                        {item.attestation && <AttestationBadge a={item.attestation} />}
                      </li>
                    );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {r.cognates && r.cognates.length > 0 ? (
        <div>
          {/* Comparison-table view — instant, pre-generated feel for common searches */}
          <div className="mb-6">
            <SearchResultTable result={r} />
          </div>

          <h3 className="text-sm font-medium text-neutral-700 mb-2">
            Detailed cognate view
            <span className="ml-2 text-xs text-neutral-500 font-normal">
              (with tier badges, verification, correspondence path)
            </span>
          </h3>
          <div className="space-y-2">
            {r.cognates.map((c, i) => {
              const badge = c.verification ? VERIFICATION_BADGE[c.verification] : null;
              const verdict = verdictByIndex.get(i);
              return (
                <div
                  key={i}
                  className={`border rounded p-3 ${TIER_STYLES[c.confidence] ?? TIER_STYLES.unknown}`}
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {c.confidence}
                      </span>
                      {badge && (
                        <span
                          title={badge.title}
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <span className="font-medium">{c.language_name}</span>
                      <span className="mx-1 text-lg font-semibold" dir="auto">{c.surface_form}</span>
                      <span className="font-mono text-sm opacity-70" dir="auto">({c.surface_root})</span>
                      {c.wiktionary_url && (
                        <a
                          href={c.wiktionary_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline opacity-70 hover:opacity-100"
                        >
                          Wiktionary ↗
                        </a>
                      )}
                      {verdict && (
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${VERDICT_CLASS[verdict.verdict]}`}
                          title={verdict.reason}
                        >
                          {verdict.verdict === "agree" ? "✓ sources agree" :
                           verdict.verdict === "disagree" ? "✗ sources disagree" : "? unsure"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm">{c.gloss}</div>
                  {c.correspondence_path && (
                    <div className="text-xs opacity-80 mt-1">{c.correspondence_path}</div>
                  )}
                  {c.notes && <div className="text-xs italic opacity-80 mt-1">{c.notes}</div>}
                  {c.matched_entry && c.matched_entry.vocalized_form && c.matched_entry.vocalized_form !== c.surface_form && (
                    <div className="text-xs opacity-70 mt-1">
                      <span className="font-mono">Wiktionary form: </span>
                      <span dir="auto">{c.matched_entry.vocalized_form}</span>
                      {c.matched_entry.root && (
                        <span className="font-mono"> · root {c.matched_entry.root}</span>
                      )}
                    </div>
                  )}
                  {verdict && (
                    <div className="mt-2 text-xs">
                      <div className="opacity-80">
                        <span className="font-semibold">Sources:</span> {verdict.reason}
                      </div>
                      {verdict.citations.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {verdict.citations.map((cit, k) => (
                            <li key={k} className="truncate">
                              <a
                                href={cit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline opacity-80 hover:opacity-100"
                              >
                                {cit.title || cit.url}
                              </a>
                              {cit.quote && <span className="opacity-70"> — “{cit.quote}”</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {c.related_lemmas && c.related_lemmas.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs font-medium opacity-80 cursor-pointer hover:opacity-100">
                        {c.related_lemmas.length} other lemma{c.related_lemmas.length === 1 ? "" : "s"} from this root
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {c.related_lemmas.map((l, j) => (
                          <li key={j} className="flex items-baseline gap-2">
                            <span className="font-medium text-sm" dir="auto">
                              {l.vocalized_form ?? l.word}
                            </span>
                            <span className="opacity-60 text-[10px] uppercase tracking-wider">{l.pos}</span>
                            {l.first_gloss && <span className="opacity-80 truncate">— {l.first_gloss}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-neutral-600">No cognates returned.</div>
      )}

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onValidate}
            disabled={validating}
            className="px-3 py-1.5 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
          >
            {validating ? "Looking up sources..." : validation ? "Re-validate with citations" : "Validate with citations"}
          </button>
          {validation && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              validation.overall_agreement === "high" ? "bg-emerald-600 text-white" :
              validation.overall_agreement === "mixed" ? "bg-amber-500 text-white" :
              "bg-red-600 text-white"
            }`}>
              {validation.overall_agreement.toUpperCase()} agreement
            </span>
          )}
          {validating && (
            <span className="text-xs text-neutral-500">searching Wiktionary + scholarly lexica via Perplexity Sonar Pro...</span>
          )}
        </div>

        {validationError && (
          <div className="mt-2 text-xs text-red-700">Validation failed: {validationError}</div>
        )}

        {validation && (
          <div className="mt-3 text-xs text-neutral-700">
            <p className="italic">{validation.overall_notes}</p>
            {validation.missed_cognates.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Possibly missed cognates</div>
                <ul className="space-y-1">
                  {validation.missed_cognates.map((mc, i) => (
                    <li key={i} className="border border-amber-200 bg-amber-50 rounded p-2">
                      <div>
                        <span className="font-medium">{mc.language}</span>
                        <span className="mx-1 font-semibold" dir="auto">{mc.surface_form}</span>
                        <span>— {mc.gloss}</span>
                      </div>
                      <div className="opacity-80 mt-0.5">{mc.reason}</div>
                      {mc.citations.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {mc.citations.map((cit, k) => (
                            <li key={k} className="truncate">
                              <a href={cit.url} target="_blank" rel="noreferrer" className="underline opacity-80 hover:opacity-100">
                                {cit.title || cit.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {r.caveats && r.caveats.length > 0 && (
        <div className="mt-5 border-t border-neutral-200 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">Caveats</h3>
          <ul className="text-xs text-neutral-600 space-y-1">
            {r.caveats.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-400 font-mono">
        {data.usage.model} · in={data.usage.input_tokens} · out={data.usage.output_tokens}
      </div>
    </div>
  );
}
