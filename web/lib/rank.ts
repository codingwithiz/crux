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
  // Everything below is three letters. The list above was written against a 4+
  // character floor, so shorter function words were unreachable and nobody
  // noticed they were missing — until the floor dropped to 3 and the feed began
  // explaining itself with "because you follow the, for and and".
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "has",
  "her", "him", "his", "how", "its", "may", "new", "now", "off", "one", "our", "out",
  "own", "per", "say", "she", "too", "two", "was", "way", "who", "why", "yet", "get",
  "got", "let", "did", "see", "top", "big", "end", "why", "via", "were", "said",
  "says", "here", "very", "even", "back", "down", "many", "much", "other", "after",
  "before", "because", "while", "where", "still", "every", "first", "last", "next",
  "between", "through", "during", "against", "under", "above", "again", "both", "each",
  // Survivors of URL text in an item's detail.
  "http", "https", "www", "com",
]);

/** Two letters, but the whole domain. Without this the tokenizer drops the term
 *  a Crux user is likeliest to have typed as an interest — the comment on the
 *  old three-character floor claimed `ai` survived it, and it never did. */
const KEEP_SHORT = new Set(["ai", "ml", "ui", "ux"]);

function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    // 3+ characters: the old 4+ floor silently dropped llm, gpt, rag — the most
    // explainable terms in this domain, and the ones a user is most likely to
    // have typed as an interest.
    if ((w.length > 2 || KEEP_SHORT.has(w)) && !STOP.has(w)) out.add(w);
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

  const rows = items.map((it) => ({ it, why: matched(it) }));

  // Order each item's reasons by how rare the term is across this fetch. The UI
  // shows three, and taking the first three in title order surfaced whatever the
  // headline happened to open with — a term matching forty items explains
  // nothing, while the one matching two is the actual reason it placed here.
  const spread = new Map<string, number>();
  for (const r of rows) for (const w of r.why) spread.set(w, (spread.get(w) ?? 0) + 1);
  for (const r of rows) r.why.sort((a, b) => spread.get(a)! - spread.get(b)! || a.localeCompare(b));

  return rows
    .map(({ it, why }) => ({
      // Saturate at 4 overlapping terms.
      it: why.length ? { ...it, why } : it,
      s: hasTheses ? 0.6 * popNorm(it) + 0.4 * Math.min(1, why.length / 4) : popNorm(it),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}
