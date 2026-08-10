import type { NewsItem } from "./types";

export interface RankInput {
  topic: string;
  statement: string;
  /** Where this prior came from. Absent means a saved take (the common case). */
  kind?: "interest" | "take";
}

/**
 * A ranked item, carrying the reason it placed where it did.
 *
 * Two signals steer the feed and they are NOT the same thing: topics you chose,
 * and topics you have written about. Merging them into one list produced
 * "Because you follow data" for someone who had never typed "data" — it was a
 * word inside one of their saved takes. They stay separate all the way to the
 * UI so each can be labelled truthfully.
 */
export interface RankedItem extends NewsItem {
  /** Topics you explicitly follow. Only this may be phrased as "you follow". */
  why?: string[];
  /** Topics of your past takes that this item touches. */
  related?: string[];
}

/** Interests are keywords, not opinions, but they steer the feed the same way.
 *  `rankItems` ignores take priors with a blank statement (the parked-draft
 *  guard), so a keyword fills both fields and marks itself explicitly. */
export const interestsAsPriors = (interests: string[]): RankInput[] =>
  interests.map((k) => ({ topic: k, statement: k, kind: "interest" as const }));

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

/** A term this common across the fetch explains nothing about one item. */
const GENERIC_SHARE = 1 / 3;

/**
 * Rank items into one personalized list. `score` (HN points, GitHub stars, HF/
 * Reddit upvotes, Lobsters points) is raw popularity on incomparable scales, so
 * we min-max normalize it *within each source*, then blend with a personal
 * relevance signal:
 *
 *   final = 0.6 * normalizedPopularity + 0.4 * personalRelevance
 *
 * Personal relevance weighs a topic you chose far above a word that happens to
 * appear in something you wrote: `interestHits/2 + takeHits/8`. One interest
 * match is worth four take words, because choosing "robotics" is a statement of
 * intent and writing a sentence containing "data" is not.
 *
 * With no priors at all it falls back to pure normalized popularity.
 */
export function rankItems(items: NewsItem[], priors: RankInput[]): RankedItem[] {
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

  const interestTerms = new Set<string>();
  const takeTerms = new Set<string>();
  for (const p of priors) {
    if (p.kind === "interest") {
      for (const w of tokenize(p.topic)) interestTerms.add(w);
      continue;
    }
    // Parked drafts have a topic but deliberately no statement — they are the
    // things you declined to have an opinion about, so they must not steer the
    // feed the way a saved take does.
    if (!p.statement.trim()) continue;
    // The TOPIC only. Tokenizing the whole statement turned every content word
    // of every take into something the feed claimed you followed — which is how
    // "Because you follow data" reached a user who had never typed it.
    for (const w of tokenize(p.topic)) takeTerms.add(w);
  }
  const hasPriors = interestTerms.size > 0 || takeTerms.size > 0;

  // Keep the terms that matched, not just how many. They cost nothing extra to
  // collect here and are the only honest way to explain the ordering.
  const matched = (it: NewsItem) => {
    const why: string[] = [];
    const related: string[] = [];
    if (!hasPriors) return { why, related };
    for (const w of tokenize(`${it.title} ${it.detail ?? ""}`)) {
      if (interestTerms.has(w)) why.push(w);
      else if (takeTerms.has(w)) related.push(w);
    }
    return { why, related };
  };

  const rows = items.map((it) => ({ it, ...matched(it) }));

  // Order each item's reasons by how rare the term is across this fetch. The UI
  // shows three, and taking the first three in title order surfaced whatever the
  // headline happened to open with — a term matching forty items explains
  // nothing, while the one matching two is the actual reason it placed here.
  const spread = new Map<string, number>();
  for (const r of rows) for (const w of [...r.why, ...r.related]) spread.set(w, (spread.get(w) ?? 0) + 1);
  const rarestFirst = (a: string, b: string) => spread.get(a)! - spread.get(b)! || a.localeCompare(b);
  const generic = Math.max(2, Math.ceil(items.length * GENERIC_SHARE));
  for (const r of rows) {
    r.why.sort(rarestFirst);
    // An explicit interest is never suppressed — "you follow ai" stays true even
    // when a third of the feed mentions it. An incidental term is dropped once
    // it's common enough to be noise, because a bad reason is worse than none.
    r.related = r.related.filter((w) => spread.get(w)! < generic).sort(rarestFirst);
  }

  return rows
    .map(({ it, why, related }) => ({
      it: why.length || related.length ? { ...it, ...(why.length && { why }), ...(related.length && { related }) } : it,
      s: hasPriors
        ? 0.6 * popNorm(it) + 0.4 * Math.min(1, why.length / 2 + related.length / 8)
        : popNorm(it),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}
