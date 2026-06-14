import type { NewsItem } from "./types";

const UA = { "user-agent": "conviction-engine/0.1 (personal project)" };

async function jget(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { ...UA, ...headers },
      signal: ctrl.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
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
async function fetchHN(): Promise<NewsItem[]> {
  const d = (await jget(
    "https://hn.algolia.com/api/v1/search?tags=story&query=AI&hitsPerPage=10",
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

/** Free, ToS-clean AI signal from several primary sources. Resilient to any one failing. */
export async function getNews(): Promise<NewsItem[]> {
  const settled = await Promise.allSettled([
    fetchHN(),
    fetchHF(),
    fetchGitHub(),
    fetchReddit("MachineLearning"),
    fetchReddit("LocalLLaMA"),
    fetchLobsters(),
  ]);
  const items: NewsItem[] = [];
  for (const r of settled) if (r.status === "fulfilled") items.push(...r.value);
  return items;
}
