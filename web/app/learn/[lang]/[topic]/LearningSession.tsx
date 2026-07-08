"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ComparisonRow, ComparisonTable } from "@/lib/comparison";
import type { LanguageCode } from "@/lib/models";
import {
  applyRating, DEFAULT_STATE, loadDeck, saveDeck, sessionOrder, storageKey,
  type CardState, type DeckState, type Rating,
} from "@/lib/srs";

const PROJECT = "semitic";

type Card = { key: string; row: ComparisonRow };

function makeCards(table: ComparisonTable, lang: LanguageCode): Card[] {
  return table.rows
    .map((row, i) => ({ key: `${table.slug}:${i}`, row }))
    .filter((c) => (c.row.cells[lang]?.length ?? 0) > 0);
}

// RTL Semitic scripts — direction hint helps native rendering.
const RTL_LANGS: LanguageCode[] = ["ar", "he", "syc", "arc", "aii", "phn", "pun", "sab", "osa", "amw"];

export function LearningSession({
  lang, table,
}: { lang: LanguageCode; table: ComparisonTable }) {
  const key = storageKey(PROJECT, lang, table.slug);
  const allCards = useMemo(() => makeCards(table, lang), [table, lang]);
  const [deck, setDeck] = useState<DeckState>({});
  const [queue, setQueue] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState({ correct: 0, again: 0 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const d = loadDeck(key);
    setDeck(d);
    const ordered = sessionOrder(allCards, (c) => c.key, d);
    setQueue(ordered);
    setPos(0);
    setRevealed(false);
    setHydrated(true);
  }, [key, allCards]);

  const rate = useCallback((rating: Rating) => {
    if (!queue.length || pos >= queue.length) return;
    const card = queue[pos];
    const prev: CardState = deck[card.key] ?? { ...DEFAULT_STATE };
    const next = applyRating(prev, rating);
    const newDeck = { ...deck, [card.key]: next };
    setDeck(newDeck);
    saveDeck(key, newDeck);
    setSessionCount((c) =>
      rating === 0 ? { ...c, again: c.again + 1 } : { ...c, correct: c.correct + 1 },
    );
    setRevealed(false);
    if (rating === 0) setQueue((q) => [...q, card]);
    setPos((p) => p + 1);
  }, [deck, key, queue, pos]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        if (e.key === "1") rate(0);
        else if (e.key === "2") rate(1);
        else if (e.key === "3") rate(2);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (!hydrated) {
    return <p className="text-sm text-neutral-500">Loading deck…</p>;
  }

  if (queue.length === 0 || pos >= queue.length) {
    return (
      <SessionSummary
        count={sessionCount}
        totalCards={allCards.length}
        reviewed={Object.values(deck).filter((s) => s.reviews > 0).length}
      />
    );
  }

  const card = queue[pos];
  const forms = card.row.cells[lang]!;
  const gloss = card.row.gloss ?? card.row.label;
  const proto = card.row.proto;
  const cardState = deck[card.key];
  const isNew = !cardState || cardState.reviews === 0;
  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between text-sm">
        <div className="text-neutral-500">
          Card <span className="font-mono">{pos + 1}</span> of{" "}
          <span className="font-mono">{queue.length}</span>
        </div>
        <div className="text-neutral-500 flex gap-3">
          <span>
            <span className="accent-inherited font-mono">{sessionCount.correct}</span> ok
          </span>
          <span>
            <span className="accent-loans font-mono">{sessionCount.again}</span> again
          </span>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-4 min-h-64 flex flex-col justify-center">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2 text-center">
          {isNew ? "new card" : `interval ${cardState.interval}d · ease ${cardState.ease.toFixed(2)}`}
        </div>
        <div className="text-3xl font-semibold text-center mb-4">
          {gloss}
        </div>

        {revealed ? (
          <div className="text-center">
            <div className="font-mono text-4xl font-semibold accent-proto mb-2" dir={dir}>
              {forms[0]}
            </div>
            {forms.length > 1 && (
              <div className="text-sm text-neutral-600" dir={dir}>
                {forms.slice(1).join("  ·  ")}
              </div>
            )}
            {proto && (
              <div className="mt-4 text-sm text-neutral-500">
                Proto-Semitic <span className="font-mono">{proto}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mx-auto rounded bg-neutral-900 text-white px-6 py-2 text-sm font-medium hover:bg-neutral-700 transition"
          >
            Show answer (Space)
          </button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => rate(0)}
            className="rounded p-3 border-2 badge-loans hover:opacity-80 transition"
          >
            <div className="text-sm font-semibold">Again</div>
            <div className="text-xs opacity-70">1 · repeat now</div>
          </button>
          <button
            type="button"
            onClick={() => rate(1)}
            className="rounded p-3 border-2 badge-showcase hover:opacity-80 transition"
          >
            <div className="text-sm font-semibold">Good</div>
            <div className="text-xs opacity-70">2 · standard</div>
          </button>
          <button
            type="button"
            onClick={() => rate(2)}
            className="rounded p-3 border-2 badge-inherited hover:opacity-80 transition"
          >
            <div className="text-sm font-semibold">Easy</div>
            <div className="text-xs opacity-70">3 · longer interval</div>
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-500 text-center">
        Space / Enter to reveal · 1 Again · 2 Good · 3 Easy
      </p>
    </div>
  );
}

function SessionSummary({
  count, totalCards, reviewed,
}: {
  count: { correct: number; again: number };
  totalCards: number;
  reviewed: number;
}) {
  const done = count.correct + count.again;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
      <div className="text-lg font-semibold mb-3">Session complete</div>
      {done > 0 ? (
        <>
          <div className="text-sm text-neutral-600 mb-1">
            You reviewed <span className="font-mono font-semibold">{done}</span> cards this session.
          </div>
          <div className="text-sm text-neutral-600 mb-4">
            <span className="accent-inherited font-mono">{count.correct}</span> passed ·{" "}
            <span className="accent-loans font-mono">{count.again}</span> to repeat
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-600 mb-4">
          No cards were due today. Come back tomorrow.
        </div>
      )}
      <div className="text-xs text-neutral-500 mb-4">
        Deck progress: {reviewed} / {totalCards} cards reviewed at least once.
      </div>
      <Link
        href="/learn"
        className="inline-block rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700"
      >
        ← All decks
      </Link>
    </div>
  );
}
