import type { Confidence, Outcome, Thesis } from "./types";

export interface LedgerStats {
  total: number;
  active: number;
  updated: number;
  abandoned: number;
  thisWeek: number;
  byConfidence: Record<Confidence, number>;
}

/**
 * Parked drafts are saved understanding, explicitly NOT opinions — counting one
 * as a conviction would inflate the track record and fake a daily streak for a
 * day you deliberately declined to take a position. Filtered here rather than at
 * each call site so every scoring surface agrees.
 */
const committed = (items: Thesis[]) => items.filter((t) => t.status !== "draft");

/**
 * Your track record — the "keep score" surface (PLAN step 7 / moat #3). Pure so
 * it's trivially testable. Counts by status + confidence and how many you
 * committed in the last 7 days (the habit signal).
 */
export function ledgerStats(all: Thesis[]): LedgerStats {
  const items = committed(all);
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
export function dailyStreak(all: Thesis[]): number {
  const items = committed(all);
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

// Representative probability for each stated confidence, and the realised value
// of each outcome — used for a Brier-style calibration score.
const CONF_P: Record<Confidence, number> = { low: 0.3, med: 0.6, high: 0.85 };
const OUT_V: Record<Outcome, number> = { held: 1, mixed: 0.5, broke: 0 };

export interface Calibration {
  resolved: number;
  /** Mean squared error between stated confidence and realised outcome (lower = better). */
  brier: number | null;
  /** A friendly 0-100 calibration score = (1 - brier) * 100. */
  score: number | null;
  /** Per-confidence hit rate (mean realised outcome) among resolved theses. */
  byConfidence: Record<Confidence, { resolved: number; hitRate: number | null }>;
}

/**
 * Calibration — "were you actually right when you were confident?" (PLAN A2 §7).
 * Compares stated confidence to recorded outcomes across resolved theses. Only
 * theses with an `outcome` count; returns nulls until you've resolved a few.
 */
export function calibration(items: Thesis[]): Calibration {
  const byConfidence: Calibration["byConfidence"] = {
    low: { resolved: 0, hitRate: null },
    med: { resolved: 0, hitRate: null },
    high: { resolved: 0, hitRate: null },
  };
  const sums: Record<Confidence, number> = { low: 0, med: 0, high: 0 };

  let sq = 0;
  let n = 0;
  for (const t of items) {
    if (!t.outcome) continue;
    n++;
    sq += (CONF_P[t.confidence] - OUT_V[t.outcome]) ** 2;
    byConfidence[t.confidence].resolved++;
    sums[t.confidence] += OUT_V[t.outcome];
  }
  (["low", "med", "high"] as Confidence[]).forEach((c) => {
    const r = byConfidence[c].resolved;
    byConfidence[c].hitRate = r ? sums[c] / r : null;
  });

  const brier = n ? sq / n : null;
  return {
    resolved: n,
    brier,
    score: brier === null ? null : Math.round((1 - brier) * 100),
    byConfidence,
  };
}
