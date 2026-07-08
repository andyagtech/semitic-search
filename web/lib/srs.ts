/**
 * Small SM-2 spaced-repetition scheduler.
 *
 * State per card:
 *   ease: interval multiplier, initial 2.5, min 1.3
 *   interval: days until next review, initial 1
 *   due: ISO date (day granularity) when the card next comes up
 *   reviews: total times reviewed
 *
 * Rating values:
 *   0 (Again) — resets interval to 1 day, drops ease by 0.2
 *   1 (Good)  — interval *= ease
 *   2 (Easy)  — interval *= ease * 1.3, bumps ease by 0.15
 *
 * Persistence: localStorage keyed on `srs:{project}:{lang}:{topic}` — one
 * JSON blob per deck. New cards enter with the defaults; unreviewed cards
 * come first, then cards due today, then future cards.
 */

export type Rating = 0 | 1 | 2;

export type CardState = {
  ease: number;
  interval: number;
  due: string;         // ISO YYYY-MM-DD
  reviews: number;
  lastRating: Rating | null;
};

export const DEFAULT_STATE: CardState = {
  ease: 2.5,
  interval: 1,
  due: today(),
  reviews: 0,
  lastRating: null,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function applyRating(state: CardState, rating: Rating): CardState {
  const next: CardState = { ...state, reviews: state.reviews + 1, lastRating: rating };
  if (rating === 0) {
    next.interval = 1;
    next.ease = Math.max(1.3, state.ease - 0.2);
  } else if (rating === 1) {
    next.interval = Math.max(1, Math.round(state.interval * state.ease));
    // ease unchanged
  } else {
    next.interval = Math.max(2, Math.round(state.interval * state.ease * 1.3));
    next.ease = state.ease + 0.15;
  }
  next.due = addDays(today(), next.interval);
  return next;
}

export function isDue(state: CardState): boolean {
  return state.due <= today();
}

/**
 * Order for a session: unreviewed first, then due-today, then future
 * (only up to a limit — future cards mostly excluded from this session).
 */
export function sessionOrder<T>(
  cards: T[],
  keyFor: (card: T) => string,
  states: Record<string, CardState>,
): T[] {
  const buckets: { new: T[]; due: T[] } = { new: [], due: [] };
  for (const c of cards) {
    const s = states[keyFor(c)];
    if (!s || s.reviews === 0) buckets.new.push(c);
    else if (isDue(s)) buckets.due.push(c);
  }
  return [...buckets.new, ...buckets.due];
}

// ────────────────────────────────────────────────────────────────
// Deck persistence — one blob per (language, topic).
// ────────────────────────────────────────────────────────────────

export type DeckState = Record<string, CardState>;

export function storageKey(project: string, lang: string, topic: string): string {
  return `srs:${project}:${lang}:${topic}`;
}

export function loadDeck(key: string): DeckState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DeckState) : {};
  } catch {
    return {};
  }
}

export function saveDeck(key: string, deck: DeckState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(deck));
  } catch { /* quota exceeded — silent */ }
}

export function deckStats(deck: DeckState, allCardKeys: string[]): {
  total: number;
  reviewed: number;
  dueToday: number;
} {
  let reviewed = 0;
  let dueToday = 0;
  for (const k of allCardKeys) {
    const s = deck[k];
    if (s && s.reviews > 0) reviewed++;
    if (s && isDue(s)) dueToday++;
  }
  return { total: allCardKeys.length, reviewed, dueToday };
}
