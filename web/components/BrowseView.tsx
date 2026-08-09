"use client";

import { useEffect, useState } from "react";
import { ConvictionFlow } from "./ConvictionFlow";
import { getSettings } from "@/lib/settings";
import { getLedger } from "@/lib/ledger";
import { rankItems, interestsAsPriors, type RankedItem } from "@/lib/rank";
import { getVoice } from "@/lib/voice";
import { WhyThis } from "@/components/WhyThis";
import type { BriefPick, NewsItem } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (HF)",
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  lobsters: "Lobsters",
  arxiv: "arXiv",
  news: "News",
};

const SOURCE_ICON: Record<NewsItem["source"], string> = {
  hf: "📄",
  hn: "💬",
  github: "🐙",
  reddit: "👽",
  lobsters: "🦞",
  arxiv: "🔬",
  news: "📰",
};

interface RadarSnapshot {
  capturedAt: string;
  items: NewsItem[];
  personalized?: boolean;
}

/**
 * `score` means different things per source (see lib/sources.ts): popularity for
 * most, but epoch minutes for the two feed-parsed ones. So age is only genuinely
 * recoverable for those — the rest get nothing rather than a guess.
 */
const TIMESTAMPED: NewsItem["source"][] = ["news", "arxiv"];

function itemAge(it: NewsItem): string | null {
  if (!TIMESTAMPED.includes(it.source) || !it.score) return null;
  const hours = (Date.now() - it.score * 60_000) / 3_600_000;
  if (hours < 0 || hours > 24 * 60) return null;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * A feed item you can open before you spend anything on it.
 *
 * Clicking a card used to fire a 5-15s model call immediately, which made every
 * moment of curiosity cost real money and time — you couldn't even read the
 * source first. Expanding is free; only "Synthesize" spends.
 */
function FeedItem({
  item,
  expanded,
  onToggle,
  onSynthesize,
  children,
}: {
  item: RankedItem;
  expanded: boolean;
  onToggle: () => void;
  onSynthesize: () => void;
  children?: React.ReactNode;
}) {
  const age = itemAge(item);
  return (
    <div
      className={`rounded-lg border bg-surface/40 transition ${
        expanded ? "border-accent" : "border-line hover:border-accent/60 hover:bg-surface"
      }`}
    >
      <button onClick={onToggle} aria-expanded={expanded} className="block w-full p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-accent">
            {SOURCE_ICON[item.source]} {SOURCE_LABELS[item.source]}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {[item.meta, age].filter(Boolean).join(" · ")}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium">{item.title}</p>
        {item.detail && !expanded && (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{item.detail}</p>
        )}
        <WhyThis why={item.why} />
      </button>

      {expanded && (
        <div className="border-t border-line px-3 py-3">
          {item.detail && <p className="text-sm text-muted">{item.detail}</p>}
          {children}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={onSynthesize}
              className="ce-press rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
            >
              Synthesize →
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm text-fg hover:bg-surface"
            >
              Read source ↗
            </a>
            <span className="text-xs text-muted">Reading is free — only Synthesize uses a model.</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One "explore the firehose" surface. Shows the full ranked list immediately
 * (free), with optional AI curation (the old Daily Brief — 3-5 picks + why it
 * matters) layered on top on demand. Both feed the same conviction pipeline.
 */
export function BrowseView() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [picked, setPicked] = useState<NewsItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          const [ledger, voice] = await Promise.all([getLedger(), getVoice()]);
          setItems(
            rankItems(raw, [
              ...ledger.map((t) => ({ topic: t.topic, statement: t.statement })),
              ...interestsAsPriors(voice?.interests ?? []),
            ]),
          );
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
            {picks.map((p) => (
              <FeedItem
                key={p.id}
                item={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onSynthesize={() => setPicked(p)}
              >
                <p className="mt-2 text-sm text-muted">
                  <span className="text-fg">Why it matters:</span> {p.whyItMatters}
                </p>
                {p.relevance && <p className="mt-1 text-sm text-cool">For you: {p.relevance}</p>}
              </FeedItem>
            ))}
          </div>
        )}
      </section>

      {/* Full ranked list */}
      <section>
        <p className="font-mono text-xs uppercase tracking-wide text-accent">All signal, ranked</p>
        <p className="mb-3 text-sm text-muted">
          Ranked by how much attention an item is getting, blended with how close it sits to what
          you&rsquo;ve already written about.
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
              <FeedItem
                key={it.id}
                item={it}
                expanded={expandedId === it.id}
                onToggle={() => setExpandedId(expandedId === it.id ? null : it.id)}
                onSynthesize={() => setPicked(it)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
