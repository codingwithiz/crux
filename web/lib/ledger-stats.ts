import type { Confidence, Thesis } from "./types";

export interface LedgerStats {
  total: number;
  active: number;
  updated: number;
  abandoned: number;
  thisWeek: number;
  byConfidence: Record<Confidence, number>;
}

/**
 * Your track record — the "keep score" surface (PLAN step 7 / moat #3). Pure so
 * it's trivially testable. Counts by status + confidence and how many you
 * committed in the last 7 days (the habit signal).
 */
export function ledgerStats(items: Thesis[]): LedgerStats {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const s: LedgerStats = {
    total: items.length,
    active: 0,
    updated: 0,
    abandoned: 0,
    thisWeek: 0,
    byConfidence: { low: 0, med: 0, high: 0 },
  };
  for (const t of items) {
    if (t.status === "active") s.active++;
    else if (t.status === "updated") s.updated++;
    else if (t.status === "abandoned") s.abandoned++;
    s.byConfidence[t.confidence]++;
    if (new Date(t.createdAt).getTime() >= weekAgo) s.thisWeek++;
  }
  return s;
}

const DAY = "YYYY-MM-DD".length; // 10

/**
 * Consecutive days (ending today, or yesterday if today isn't done yet) on which
 * you committed at least one conviction — the habit-loop signal (moat #3). Dates
 * compared in UTC for consistency with the stored ISO timestamps.
 */
export function dailyStreak(items: Thesis[]): number {
  if (!items.length) return 0;
  const days = new Set(items.map((t) => t.createdAt.slice(0, DAY)));
  const oneDay = 86_400_000;
  const midnightUTC = Math.floor(Date.now() / oneDay) * oneDay;
  const key = (ms: number) => new Date(ms).toISOString().slice(0, DAY);

  let cursor = midnightUTC;
  // A streak is alive if today OR yesterday has a commit (today may be pending).
  if (!days.has(key(cursor))) {
    cursor -= oneDay;
    if (!days.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(key(cursor))) {
    streak++;
    cursor -= oneDay;
  }
  return streak;
}
