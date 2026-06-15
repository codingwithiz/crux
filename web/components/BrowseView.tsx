"use client";

import { useEffect, useState } from "react";
import { ConvictionFlow } from "./ConvictionFlow";
import { getSettings } from "@/lib/settings";
import { getLedger } from "@/lib/ledger";
import { rankItems } from "@/lib/rank";
import type { BriefPick, NewsItem } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (HF)",
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  lobsters: "Lobsters",
};

interface RadarSnapshot {
  capturedAt: string;
  items: NewsItem[];
  personalized?: boolean;
}

/**
 * One "explore the firehose" surface. Shows the full ranked list immediately
 * (free), with optional AI curation (the old Daily Brief — 3-5 picks + why it
 * matters) layered on top on demand. Both feed the same conviction pipeline.
 */
export function BrowseView() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [picked, setPicked] = useState<NewsItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const [picks, setPicks] = useState<BriefPick[] | null>(null);
  const [curating, setCurating] = useState(false);
  const [curateErr, setCurateErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        let raw: NewsItem[] = [];
        let alreadyRanked = false;
        try {
          const rj = (await (await fetch("/api/radar")).json()) as { snapshot?: RadarSnapshot | null };
          if (rj.snapshot?.items?.length) {
            raw = rj.snapshot.items;
            setScannedAt(rj.snapshot.capturedAt);
            alreadyRanked = Boolean(rj.snapshot.personalized);
          }
        } catch {
          /* live fallback below */
        }
        if (!raw.length) {
          const d = (await (await fetch("/api/news")).json()) as { items?: NewsItem[] };
          raw = d.items ?? [];
        }
        if (alreadyRanked) {
          setItems(raw);
        } else {
          const theses = (await getLedger()).map((t) => ({ topic: t.topic, statement: t.statement }));
          setItems(rankItems(raw, theses));
        }
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  async function curate() {
    setCurating(true);
    setCurateErr(null);
    try {
      const ledger = await getLedger();
      const theses = ledger.slice(0, 12).map((t) => ({ topic: t.topic, statement: t.statement }));
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theses, settings: getSettings() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          j.error === "no_model"
            ? "No model key found — add one in the Model menu (top-right)."
            : j.error || "Curation failed",
        );
      }
      const j = (await res.json()) as { picks?: BriefPick[] };
      setPicks(j.picks ?? []);
    } catch (e) {
      setCurateErr((e as Error).message);
    } finally {
      setCurating(false);
    }
  }

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

  return (
    <div className="space-y-8">
      {/* Curated picks (AI) */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent">Curated for you</p>
            <p className="text-sm text-muted">
              Let the Curator pick the 3–5 items most worth an opinion — weighted to your ledger.
            </p>
          </div>
          <button
            onClick={curate}
            disabled={curating}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
          >
            {curating ? "Curating…" : picks ? "Re-curate" : "Curate top picks"}
          </button>
        </div>

        {curateErr && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
            {curateErr}
          </div>
        )}

        {picks && picks.length > 0 && (
          <div className="mt-4 space-y-3">
            {picks.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPicked(p)}
                className="block w-full rounded-xl border border-line bg-surface/40 p-4 text-left transition hover:border-accent hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent">
                    {String(i + 1).padStart(2, "0")} · {SOURCE_LABELS[p.source]}
                  </span>
                  <span className="text-xs text-muted">{p.meta}</span>
                </div>
                <p className="mt-2 font-medium">{p.title}</p>
                <p className="mt-1 text-sm text-muted">
                  <span className="text-fg">Why it matters:</span> {p.whyItMatters}
                </p>
                {p.relevance && <p className="mt-1 text-sm text-cool">For you: {p.relevance}</p>}
                <span className="mt-3 inline-block text-sm text-fg">Form a conviction →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Full ranked list */}
      <section>
        <p className="font-mono text-xs uppercase tracking-wide text-accent">All signal, ranked</p>
        <p className="mb-3 text-sm text-muted">
          Normalized popularity blended with relevance to your ledger.
          {scannedAt ? (
            <span className="text-cool"> Auto-scanned daily · last update {new Date(scannedAt).toLocaleString()}</span>
          ) : (
            <span> Live scan.</span>
          )}
        </p>

        {err && <p className="text-muted">Could not load news right now ({err}). Try the thought path.</p>}
        {!items && !err && <p className="text-muted">Loading the AI firehose…</p>}
        {items && items.length === 0 && <p className="text-muted">No items right now — try the thought path.</p>}

        {items && items.length > 0 && (
          <div className="space-y-2">
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
        )}
      </section>
    </div>
  );
}
