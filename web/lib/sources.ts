import type { NewsItem, NewsSource } from "./types";

const UA = { "user-agent": "conviction-engine/0.1 (personal project)" };

async function jget(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const body = await jtext(url, headers);
  try {
    return JSON.parse(body);
  } catch {
    // A source occasionally answers 200 with an empty or truncated body. Every
    // caller is inside a Promise.allSettled, so this is already survivable — but
    // as a bare SyntaxError it reached the logs naming neither the source nor
    // the cause.
    throw new Error(`${new URL(url).host} returned a non-JSON body`);
  }
}

async function jtext(url: string, headers: Record<string, string> = {}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { ...UA, ...headers },
      signal: ctrl.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

interface HNHit {
  title: string;
  url: string | null;
  points: number;
  objectID: string;
}
async function fetchHN(query = "AI"): Promise<NewsItem[]> {
  const d = (await jget(
    `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&hitsPerPage=10`,
  )) as { hits?: HNHit[] };
  return (d.hits ?? [])
    .filter((h) => h.title)
    .map((h) => ({
      id: `hn-${h.objectID}`,
      source: "hn" as const,
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      meta: `${h.points ?? 0} points · HN`,
      score: h.points ?? 0,
    }));
}

interface HFItem {
  title?: string;
  paper?: { id?: string; title?: string; upvotes?: number; summary?: string };
}
async function fetchHF(): Promise<NewsItem[]> {
  const d = (await jget("https://huggingface.co/api/daily_papers")) as HFItem[];
  return (Array.isArray(d) ? d : []).slice(0, 10).map((it) => {
    const id = it.paper?.id ?? "";
    const up = it.paper?.upvotes ?? 0;
    return {
      id: `hf-${id}`,
      source: "hf" as const,
      title: it.paper?.title ?? it.title ?? "Untitled paper",
      url: id ? `https://huggingface.co/papers/${id}` : "https://huggingface.co/papers",
      meta: `${up} upvotes · Papers`,
      detail: it.paper?.summary,
      score: up,
    };
  });
}

interface GHItem {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
}
async function fetchGitHub(): Promise<NewsItem[]> {
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10);
  const q = encodeURIComponent(`AI in:name,description,topics pushed:>${since} stars:>50`);
  const d = (await jget(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=10`,
    { accept: "application/vnd.github+json" },
  )) as { items?: GHItem[] };
  return (d.items ?? []).map((r) => ({
    id: `gh-${r.full_name}`,
    source: "github" as const,
    title: r.full_name,
    url: r.html_url,
    meta: `${r.stargazers_count.toLocaleString()} stars · GitHub`,
    detail: r.description ?? undefined,
    score: r.stargazers_count,
  }));
}

interface RedditChild {
  data: { id: string; title: string; permalink: string; ups: number; selftext?: string };
}
async function fetchReddit(sub: string): Promise<NewsItem[]> {
  const d = (await jget(
    `https://www.reddit.com/r/${sub}/top.json?t=day&limit=8`,
  )) as { data?: { children?: RedditChild[] } };
  return (d.data?.children ?? [])
    .filter((c) => c.data?.title)
    .map((c) => ({
      id: `reddit-${c.data.id}`,
      source: "reddit" as const,
      title: c.data.title,
      url: `https://www.reddit.com${c.data.permalink}`,
      meta: `${c.data.ups ?? 0} upvotes · r/${sub}`,
      detail: c.data.selftext ? c.data.selftext.slice(0, 240) : undefined,
      score: c.data.ups ?? 0,
    }));
}

interface LobItem {
  short_id: string;
  title: string;
  url: string;
  score: number;
  comments_url: string;
  description_plain?: string;
}
async function fetchLobsters(): Promise<NewsItem[]> {
  const d = (await jget("https://lobste.rs/t/ai.json")) as LobItem[];
  return (Array.isArray(d) ? d : []).slice(0, 8).map((it) => ({
    id: `lob-${it.short_id}`,
    source: "lobsters" as const,
    title: it.title,
    url: it.url || it.comments_url,
    meta: `${it.score ?? 0} points · Lobsters`,
    detail: it.description_plain ? it.description_plain.slice(0, 240) : undefined,
    score: it.score ?? 0,
  }));
}

// ---- Generic RSS/Atom + arXiv (dependency-free, same regex approach as extract.ts) ----

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ");
}
/**
 * Text out of a feed field.
 *
 * Decode BEFORE stripping, then strip again. Feeds that escape their markup —
 * Google News wraps every description in `&lt;a href=…&gt;` — survived a
 * strip-then-decode order untouched, because at strip time there were no literal
 * tags to remove, and decoding then produced raw HTML *as the item's summary*.
 * Users saw `<a href="https://news.google.com/rss/articles/CBMifkF…` where the
 * description should be.
 */
function stripTags(s: string): string {
  return decodeEntities(decodeEntities(s).replace(/<[^>]+>/g, " "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}
function feedLink(block: string): string {
  const rss = stripTags(tag(block, "link"));
  if (/^https?:/i.test(rss)) return rss;
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alt) return alt[1];
  const any = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (any) return any[1];
  const id = stripTags(tag(block, "id"));
  return /^https?:/i.test(id) ? id : "";
}
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Parse an RSS or Atom feed into NewsItems. `score` is recency (newer = higher). */
function parseFeed(xml: string, label: string, source: NewsSource, limit = 8): NewsItem[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  const out: NewsItem[] = [];
  for (const b of blocks.slice(0, limit)) {
    const title = stripTags(tag(b, "title"));
    const url = feedLink(b);
    if (!title || !url) continue;
    const desc = stripTags(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    const dateStr = stripTags(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated"));
    const ts = Date.parse(dateStr);
    const when = Number.isFinite(ts) ? new Date(ts).toLocaleDateString() : "";
    out.push({
      id: `${source}-${hash(url)}`,
      source,
      title,
      url,
      meta: [when, label].filter(Boolean).join(" · "),
      detail: desc ? desc.slice(0, 240) : undefined,
      score: Number.isFinite(ts) ? Math.floor(ts / 60_000) : 0,
    });
  }
  return out;
}

async function fetchRSS(url: string, label: string): Promise<NewsItem[]> {
  return parseFeed(await jtext(url), label, "news");
}

async function fetchArxiv(): Promise<NewsItem[]> {
  const q =
    "search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=12";
  return parseFeed(await jtext(`http://export.arxiv.org/api/query?${q}`), "arXiv", "arxiv", 12);
}

// ---- Topic search: what a followed interest actually reaches for ----

/**
 * Interests used to be a sort hint over a fixed list of AI outlets, which meant
 * following "robotics" or "biotech" changed nothing at all — measured against a
 * live snapshot, seven of twelve ordinary topics matched zero of the thirty
 * items. A topic you follow has to be able to *fetch*, so these three endpoints
 * take a query. All of them parse with the feed/JSON readers already here.
 */
export const topicQueryUrls = (topic: string) => {
  const q = encodeURIComponent(topic.trim());
  return {
    // Google News search — the same RSS shape the outlet feeds already use.
    news: `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`,
    // Quoted so a multi-word interest stays a phrase rather than an OR of words.
    arxiv: `http://export.arxiv.org/api/query?search_query=all:%22${q}%22&sortBy=submittedDate&sortOrder=descending&max_results=4`,
  };
};

/** How many followed topics we'll actually go and fetch for, per request. */
export const TOPIC_LIMIT = 6;

async function fetchTopic(topic: string): Promise<NewsItem[]> {
  const urls = topicQueryUrls(topic);
  const settled = await Promise.allSettled([
    jtext(urls.news).then((x) => parseFeed(x, `News · ${topic}`, "news", 4)),
    jtext(urls.arxiv).then((x) => parseFeed(x, `arXiv · ${topic}`, "arxiv", 4)),
    fetchHN(topic).then((x) => x.slice(0, 3)),
  ]);
  const out: NewsItem[] = [];
  for (const r of settled) if (r.status === "fulfilled") out.push(...r.value);
  // Provenance travels with the item so the UI can say, truthfully, which topic
  // of yours put it here.
  return out.map((it) => ({ ...it, viaInterest: topic }));
}

/**
 * Items fetched because the user follows these topics. Resilient per topic and
 * per source: any one failing costs its own results and nothing else.
 */
export async function getTopicNews(topics: string[]): Promise<NewsItem[]> {
  const wanted = [...new Set(topics.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(
    0,
    TOPIC_LIMIT,
  );
  if (!wanted.length) return [];
  const settled = await Promise.allSettled(wanted.map(fetchTopic));
  // Interleave so one prolific topic can't bury the rest.
  const per = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  return dedupe(interleave(per));
}

// Major AI outlets + lab/company blogs (best-effort; any feed that 404s is skipped).
const RSS_FEEDS: { url: string; label: string }[] = [
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", label: "TechCrunch" },
  { url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", label: "The Verge" },
  { url: "https://venturebeat.com/category/ai/feed/", label: "VentureBeat" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", label: "MIT Tech Review" },
  { url: "https://openai.com/news/rss.xml", label: "OpenAI" },
  { url: "https://blog.google/technology/ai/rss/", label: "Google AI" },
  { url: "https://deepmind.google/blog/rss.xml", label: "DeepMind" },
  { url: "https://ai.meta.com/blog/rss/", label: "Meta AI" },
  { url: "https://www.anthropic.com/rss.xml", label: "Anthropic" },
  { url: "https://huggingface.co/blog/feed.xml", label: "Hugging Face" },
  { url: "https://www.microsoft.com/en-us/research/feed/", label: "Microsoft Research" },
  { url: "https://blogs.nvidia.com/feed/", label: "NVIDIA" },
  { url: "https://mistral.ai/news/rss.xml", label: "Mistral" },
  { url: "https://arstechnica.com/ai/feed/", label: "Ars Technica" },
  { url: "https://simonwillison.net/atom/everything/", label: "Simon Willison" },
  { url: "https://www.latent.space/feed", label: "Latent Space" },
  { url: "https://thegradient.pub/rss/", label: "The Gradient" },
];

/** Drop near-duplicate items and cap how many each source contributes. */
function dedupe(items: NewsItem[]): NewsItem[] {
  const cap: Partial<Record<NewsSource, number>> = { news: 14, arxiv: 8, reddit: 8, hn: 8 };
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const seen = new Set<string>();
  const count: Record<string, number> = {};
  const out: NewsItem[] = [];
  for (const it of items) {
    const urlKey = norm(it.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, ""));
    const titleKey = norm(it.title).slice(0, 60);
    if (seen.has(urlKey) || seen.has(titleKey)) continue;
    if ((count[it.source] ?? 0) >= (cap[it.source] ?? 6)) continue;
    seen.add(urlKey);
    seen.add(titleKey);
    count[it.source] = (count[it.source] ?? 0) + 1;
    out.push(it);
  }
  return out;
}

/** Round-robin merge so no single feed dominates (outlet diversity). */
function interleave(arrays: NewsItem[][]): NewsItem[] {
  const out: NewsItem[] = [];
  const max = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < max; i++) for (const a of arrays) if (a[i]) out.push(a[i]);
  return out;
}

/** Free, ToS-clean AI signal from many primary sources. Resilient to any one failing. */
export async function getNews(): Promise<NewsItem[]> {
  const [coreS, feedS] = await Promise.all([
    Promise.allSettled([
      fetchHN("AI"),
      fetchHN("LLM"),
      fetchHF(),
      fetchGitHub(),
      fetchReddit("MachineLearning"),
      fetchReddit("LocalLLaMA"),
      fetchReddit("singularity"),
      fetchReddit("OpenAI"),
      fetchReddit("artificial"),
      fetchReddit("StableDiffusion"),
      fetchReddit("ChatGPT"),
      fetchLobsters(),
      fetchArxiv(),
    ]),
    Promise.allSettled(RSS_FEEDS.map((f) => fetchRSS(f.url, f.label))),
  ]);
  const core: NewsItem[] = [];
  for (const r of coreS) if (r.status === "fulfilled") core.push(...r.value);
  const feeds = feedS.filter((r) => r.status === "fulfilled").map((r) => r.value);
  return dedupe([...core, ...interleave(feeds)]);
}
