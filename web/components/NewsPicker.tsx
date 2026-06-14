"use client";

import { useEffect, useState } from "react";
import { ConvictionFlow } from "./ConvictionFlow";
import { getLedger } from "@/lib/ledger";
import { rankItems } from "@/lib/rank";
import type { NewsItem } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (HF)",
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  lobsters: "Lobsters",
};

interface RadarSnapshot {
  capturedAt: string;
  count: number;
  items: NewsItem[];
}

export function NewsPicker() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [picked, setPicked] = useState<NewsItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Prefer the daily-radar snapshot (Cron-prepared); fall back to live.
        let raw: NewsItem[] = [];
        try {
          const r = await fetch("/api/radar");
          const rj = (await r.json()) as { snapshot?: RadarSnapshot | null };
          if (rj.snapshot?.items?.length) {
            raw = rj.snapshot.items;
            setScannedAt(rj.snapshot.capturedAt);
          }
        } catch {
          /* radar not available — live fetch below */
        }
        if (!raw.length) {
          const res = await fetch("/api/news");
          const d = (await res.json()) as { items?: NewsItem[] };
          raw = d.items ?? [];
        }
        const theses = (await getLedger()).map((t) => ({ topic: t.topic, statement: t.statement }));
        setItems(rankItems(raw, theses));
      } catch (e) {
        setErr(String(e));
      }
    })();
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
    <div className="space-y-2">
      <p className="mb-2 text-xs text-muted">
        Ranked for you — normalized popularity blended with relevance to your ledger.
        {scannedAt ? (
          <>
            {" "}
            <span className="text-cool">
              Auto-scanned daily · last update {new Date(scannedAt).toLocaleString()}
            </span>
          </>
        ) : (
          <> Live scan.</>
        )}
      </p>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setPicked(it)}
          className="block w-full rounded-lg border border-line bg-surface/40 p-3 text-left transition hover:border-accent hover:bg-surface"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-accent">{SOURCE_LABELS[it.source]}</span>
            <span className="shrink-0 text-xs text-muted">{it.meta}</span>
          </div>
          <p className="mt-1 text-sm font-medium">{it.title}</p>
          {it.detail && <p className="mt-1 line-clamp-2 text-xs text-muted">{it.detail}</p>}
        </button>
      ))}
    </div>
  );
}
