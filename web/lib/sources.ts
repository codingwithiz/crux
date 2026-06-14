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
      meta: `${h.points ?? 0} points`,
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
      meta: `${up} upvotes`,
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
    meta: `${r.stargazers_count.toLocaleString()} stars`,
    detail: r.description ?? undefined,
    score: r.stargazers_count,
  }));
}

/** Free, ToS-clean AI signal from a few primary sources. Resilient to any one failing. */
export async function getNews(): Promise<NewsItem[]> {
  const settled = await Promise.allSettled([fetchHN(), fetchHF(), fetchGitHub()]);
  const items: NewsItem[] = [];
  for (const r of settled) if (r.status === "fulfilled") items.push(...r.value);
  return items;
}
