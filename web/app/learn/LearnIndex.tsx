"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TABLES } from "@/lib/comparison";
import type { ComparisonTable } from "@/lib/comparison";
import { LANGUAGE_ORDER, LANGUAGE_NAME } from "@/lib/comparison";
import type { LanguageCode } from "@/lib/models";
import { deckStats, loadDeck, storageKey } from "@/lib/srs";

const PROJECT = "semitic";

// Vocabulary tables only.
const DECKS = TABLES.filter((t) => t.kind === "vocabulary");

function cardKeys(table: ComparisonTable, lang: LanguageCode): string[] {
  return table.rows
    .filter((r) => (r.cells[lang]?.length ?? 0) > 0)
    .map((r, i) => `${table.slug}:${i}`);
}

export function LearnIndex() {
  const [_hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const stats = useMemo(() => {
    const out: Record<string, { total: number; reviewed: number; dueToday: number }> = {};
    for (const lang of LANGUAGE_ORDER) {
      for (const t of DECKS) {
        const keys = cardKeys(t, lang);
        if (keys.length === 0) continue;
        const deck = loadDeck(storageKey(PROJECT, lang, t.slug));
        out[`${lang}:${t.slug}`] = deckStats(deck, keys);
      }
    }
    return out;
  }, [_hydrated]);

  return (
    <div>
      <div className="mb-4 text-xs text-neutral-500">
        {DECKS.length} topics × {LANGUAGE_ORDER.length} languages. Progress is per-cell and
        persists in your browser.
      </div>
      <div className="overflow-x-auto">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Topic</th>
              {LANGUAGE_ORDER.map((lang) => (
                <th key={lang}>{LANGUAGE_NAME[lang]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DECKS.map((t) => (
              <tr key={t.slug}>
                <td className="row-label">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-neutral-500">{t.rows.length} concepts</div>
                </td>
                {LANGUAGE_ORDER.map((lang) => {
                  const keys = cardKeys(t, lang);
                  const empty = keys.length === 0;
                  const s = stats[`${lang}:${t.slug}`];
                  if (empty) return <td key={lang} className="empty">—</td>;
                  return (
                    <td key={lang}>
                      <Link
                        href={`/learn/${lang}/${t.slug}`}
                        className="inline-block text-xs px-2 py-1 rounded border border-neutral-300 hover:border-neutral-500 font-mono"
                      >
                        {s && s.reviewed > 0 ? (
                          <>
                            <span className={s.dueToday > 0 ? "accent-showcase" : "accent-inherited"}>
                              {s.reviewed}/{s.total}
                            </span>
                            {s.dueToday > 0 && (
                              <span className="ml-1 text-neutral-500">·{s.dueToday} due</span>
                            )}
                          </>
                        ) : (
                          <span className="accent-proto">start ({s?.total ?? 0})</span>
                        )}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-500 leading-relaxed max-w-2xl">
        Cell labels:{" "}
        <span className="accent-proto">start</span> = never studied ·{" "}
        <span className="accent-inherited">reviewed/total</span> = studied, none due today ·{" "}
        <span className="accent-showcase">due</span> = cards ready for review.
      </p>
    </div>
  );
}
