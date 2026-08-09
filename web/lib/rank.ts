import type { NewsItem } from "./types";

export interface RankInput {
  topic: string;
  statement: string;
}

/**
 * A ranked item, carrying the reason it placed where it did. The feed used to
 * order itself by a number nobody could see, which reads as arbitrary — these
 * are the user's own words that matched, so the UI can say why.
 */
export interface RankedItem extends NewsItem {
  why?: string[];
}

/** Interests are keywords, not opinions, but they steer the feed the same way.
 *  `rankItems` ignores priors with a blank statement (the parked-draft guard),
 *  so a keyword has to occupy both fields to count. */
export const interestsAsPriors = (interests: string[]): RankInput[] =>
  interests.map((k) => ({ topic: k, statement: k }));

const STOP = new Set([
  "this", "that", "with", "from", "will", "have", "they", "their", "about", "into",
  "than", "then", "what", "when", "which", "your", "there", "these", "those", "more",
  "most", "some", "such", "also", "been", "being", "does", "just", "like", "over",
  "only", "they", "them", "would", "could", "should", "make", "made", "using", "used",
]);

function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    // 3+ characters: the old 4+ floor silently dropped ai, llm, gpt, rag — the
    // most explainable terms in this domain, and the ones a user is most likely
    // to have typed as an interest.
    if (w.length > 2 && !STOP.has(w)) out.add(w);
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
export function rankItems(items: NewsItem[], theses: RankInput[]): RankedItem[] {
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
  // Keep the terms that matched, not just how many. They cost nothing extra to
  // collect here and are the only honest way to explain the ordering.
  const matched = (it: NewsItem): string[] => {
    if (!hasTheses) return [];
    const hits: string[] = [];
    for (const w of tokenize(`${it.title} ${it.detail ?? ""}`)) if (userTerms.has(w)) hits.push(w);
    return hits;
  };

  return [...items]
    .map((it) => {
      const why = matched(it);
      // Saturate at 4 overlapping terms.
      const personal = Math.min(1, why.length / 4);
      return {
        it: why.length ? { ...it, why } : it,
        s: hasTheses ? 0.6 * popNorm(it) + 0.4 * personal : popNorm(it),
      };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}
