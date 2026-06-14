"use client";

import { useEffect, useState } from "react";
import { ConvictionFlow } from "./ConvictionFlow";
import type { NewsItem } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (Hugging Face)",
  hn: "Hacker News",
  github: "GitHub trending",
};
const ORDER: NewsItem["source"][] = ["hf", "hn", "github"];

export function NewsPicker() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [picked, setPicked] = useState<NewsItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => setItems(d.items ?? []))
      .catch((e) => setErr(String(e)));
  }, []);

  if (picked) {
    return (
      <div>
        <button onClick={() => setPicked(null)} className="mb-4 text-sm text-muted hover:text-fg">
          ← Pick another
        </button>
        <div className="mb-5 rounded-lg border border-line bg-surface/40 p-3">
          <span className="font-mono text-xs text-accent">{SOURCE_LABELS[picked.source]}</span>
          <p className="mt-1 text-sm font-medium">{picked.title}</p>
          <a
            href={picked.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            view source ↗
          </a>
        </div>
        <ConvictionFlow
          mode="news"
          initialInput={picked.detail || picked.title}
          sourceTitle={picked.title}
          sourceUrl={picked.url}
        />
      </div>
    );
  }

  if (err) return <p className="text-muted">Could not load news right now ({err}). Try the thought path.</p>;
  if (!items) return <p className="text-muted">Loading the AI firehose…</p>;
  if (!items.length) return <p className="text-muted">No items right now — try the thought path.</p>;

  return (
    <div className="space-y-6">
      {ORDER.map((src) => {
        const list = items.filter((i) => i.source === src);
        if (!list.length) return null;
        return (
          <div key={src}>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
              {SOURCE_LABELS[src]}
            </h2>
            <div className="space-y-2">
              {list.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setPicked(it)}
                  className="block w-full rounded-lg border border-line bg-surface/40 p-3 text-left transition hover:border-accent hover:bg-surface"
                >
                  <p className="text-sm font-medium">{it.title}</p>
                  {it.detail && <p className="mt-1 line-clamp-2 text-xs text-muted">{it.detail}</p>}
                  <p className="mt-1 text-xs text-muted">{it.meta}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
