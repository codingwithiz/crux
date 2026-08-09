import type { NewsItem } from "./types";

export interface RankInput {
  topic: string;
  statement: string;
}

const STOP = new Set([
  "this", "that", "with", "from", "will", "have", "they", "their", "about", "into",
  "than", "then", "what", "when", "which", "your", "there", "these", "those", "more",
  "most", "some", "such", "also", "been", "being", "does", "just", "like", "over",
  "only", "they", "them", "would", "could", "should", "make", "made", "using", "used",
]);

function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    if (w.length > 3 && !STOP.has(w)) out.add(w);
  }
  return out;
}

/**
 * Rank items into one personalized list. `score` (HN points, GitHub stars, HF/
 * Reddit upvotes, Lobsters points) is raw popularity on incomparable scales, so
 * we min-max normalize it *within each source*, then blend with a personal
 * relevance signal (keyword overlap with the user's recent theses):
 *
 *   final = 0.6 * normalizedPopularity + 0.4 * personalRelevance
 *
 * With no theses yet, it falls back to pure normalized popularity.
 */
export function rankItems(items: NewsItem[], theses: RankInput[]): NewsItem[] {
  if (items.length === 0) return items;

  const bounds = new Map<string, { min: number; max: number }>();
  for (const it of items) {
    const b = bounds.get(it.source) ?? { min: Infinity, max: -Infinity };
    b.min = Math.min(b.min, it.score);
    b.max = Math.max(b.max, it.score);
    bounds.set(it.source, b);
  }
  const popNorm = (it: NewsItem): number => {
    const b = bounds.get(it.source)!;
    return b.max > b.min ? (it.score - b.min) / (b.max - b.min) : 0.5;
  };

  const userTerms = new Set<string>();
  for (const t of theses) {
    // Parked drafts have a topic but deliberately no statement — they are the
    // things you declined to have an opinion about, so they must not steer the
    // feed the way a committed conviction does.
    if (!t.statement.trim()) continue;
    for (const w of tokenize(`${t.topic} ${t.statement}`)) userTerms.add(w);
  }
  const hasTheses = userTerms.size > 0;
  const personal = (it: NewsItem): number => {
    if (!hasTheses) return 0;
    let hits = 0;
    for (const w of tokenize(`${it.title} ${it.detail ?? ""}`)) if (userTerms.has(w)) hits++;
    return Math.min(1, hits / 4); // saturate at 4 overlapping terms
  };

  return [...items]
    .map((it) => ({
      it,
      s: hasTheses ? 0.6 * popNorm(it) + 0.4 * personal(it) : popNorm(it),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}
