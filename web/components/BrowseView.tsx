"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConvictionFlow } from "./ConvictionFlow";
import { getSettings } from "@/lib/settings";
import { getLedger } from "@/lib/ledger";
import { rankItems, interestsAsPriors, type RankedItem } from "@/lib/rank";
import { getVoice } from "@/lib/voice";
import {
  FileText,
  FlaskConical,
  Flame,
  Code2,
  MessageSquare,
  Newspaper,
  Rss,
  type LucideIcon,
} from "lucide-react";
import { WhyThis } from "@/components/WhyThis";
import { ProgressSteps } from "./ProgressSteps";
import { Skeleton } from "@/components/Skeleton";
import { Callout } from "@/components/ui/Callout";
import type { BriefPick, NewsItem } from "@/lib/types";

// A 10–20s call that used to report itself as a greyed-out button.
const CURATE_STEPS = ["Reading today's feed", "Weighing it against your takes", "Choosing the best few"];

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (HF)",
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  lobsters: "Lobsters",
  arxiv: "arXiv",
  news: "News",
};

/** Emoji were the app's only iconography here, and they render as a different
 *  typeface at a different weight on every platform. */
const SOURCE_ICON: Record<NewsItem["source"], LucideIcon> = {
  hf: FileText,
  hn: MessageSquare,
  github: Code2,
  reddit: Flame,
  lobsters: Rss,
  arxiv: FlaskConical,
  news: Newspaper,
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
 * source first. Expanding is free; only "Break it down" spends.
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
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-accent">
            {(() => {
              const Icon = SOURCE_ICON[item.source];
              return <Icon className="h-3.5 w-3.5" aria-hidden />;
            })()}
            {SOURCE_LABELS[item.source]}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {[item.meta, age].filter(Boolean).join(" · ")}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium">{item.title}</p>
        {item.detail && !expanded && (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{item.detail}</p>
        )}
        <WhyThis why={item.why} related={item.related} viaInterest={item.viaInterest} />
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
              Break it down →
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm text-fg hover:bg-surface"
            >
              Read source ↗
            </a>
            <span className="text-xs text-muted">
              Reading is free. Breaking it down reads the real page and shows what&rsquo;s new.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Normalized title, the same key `dedupe` uses in lib/sources.ts. */
const titleKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);

/**
 * One "explore" surface. Shows the full ranked list immediately (free), the
 * items fetched for the topics you follow above it, and optional AI curation
 * layered on top on demand. All three feed the same pipeline.
 */
export function BrowseView() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [topicItems, setTopicItems] = useState<RankedItem[]>([]);
  /** Topics you follow that returned nothing today — said out loud, not hidden. */
  const [quietTopics, setQuietTopics] = useState<string[]>([]);
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
        // The voice is needed on every path now, not just the un-ranked one:
        // the topics you follow decide what we go and fetch, independently of
        // how the base feed got ordered.
        const voice = await getVoice().catch(() => null);
        const interests = voice?.interests ?? [];

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

        // Followed topics go and fetch. Best-effort: a failure here must never
        // cost you the main feed.
        let topics: NewsItem[] = [];
        if (interests.length) {
          try {
            const t = (await (
              await fetch(`/api/news?topics=${encodeURIComponent(interests.join(","))}`)
            ).json()) as { items?: NewsItem[] };
            topics = t.items ?? [];
          } catch {
            /* the base feed still stands */
          }
          const got = new Set(topics.map((i) => i.viaInterest));
          setQuietTopics(interests.filter((k) => !got.has(k)));
        }
        setTopicItems(topics);

        const base = alreadyRanked
          ? raw
          : rankItems(raw, [
              ...(await getLedger()).map((t) => ({ topic: t.topic, statement: t.statement })),
              ...interestsAsPriors(interests),
            ]);
        // Anything already shown under "topics you follow" doesn't need a second
        // slot in the general feed.
        const shown = new Set(topics.map((i) => titleKey(i.title)));
        setItems(base.filter((i) => !shown.has(titleKey(i.title))));
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
            ? "No AI model is configured for this deployment — add a provider key and try again."
            : j.error || "Couldn't pick right now. Try again.",
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
      {/* Fetched for the topics you follow. Before this existed, following a
          topic could only re-sort a fixed list of AI outlets — so following
          "robotics" or "biotech" changed the page by nothing at all. */}
      {(topicItems.length > 0 || quietTopics.length > 0) && (
        <section>
          <p className="font-mono text-xs uppercase tracking-wide text-cool">
            From the topics you follow
          </p>
          <p className="mb-3 text-sm text-muted">
            Fetched because you follow them — not just sorted.{" "}
            <Link href="/voice" className="text-cool underline-offset-4 hover:underline">
              Edit your topics
            </Link>
          </p>

          {topicItems.length > 0 && (
            <div className="space-y-2">
              {topicItems.map((it) => (
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

          {quietTopics.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Nothing on{" "}
              {quietTopics.map((k, i) => (
                <span key={k}>
                  {i > 0 && (i === quietTopics.length - 1 ? " or " : ", ")}
                  <span className="text-fg">{k}</span>
                </span>
              ))}{" "}
              today.
            </p>
          )}
        </section>
      )}

      {/* Curated picks (AI) */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent">Top picks</p>
            <p className="text-sm text-muted">
              Crux reads today&rsquo;s feed and picks the 3–5 stories most worth an opinion, weighted
              to what you&rsquo;ve already written about.
            </p>
          </div>
          <button
            onClick={curate}
            disabled={curating}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
          >
            {curating ? "Picking…" : picks ? "Pick again" : "Pick the best for me"}
          </button>
        </div>

        {curating && (
          <div className="mt-3">
            <ProgressSteps steps={CURATE_STEPS} />
          </div>
        )}

        {curateErr && (
          <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
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
        <p className="font-mono text-xs uppercase tracking-wide text-accent">Everything, ranked</p>
        <p className="mb-3 text-sm text-muted">
          Ranked by how much attention an item is getting, blended with how close it sits to what
          you&rsquo;ve already written about.
          {scannedAt ? (
            <span className="text-cool"> Auto-scanned daily · last update {new Date(scannedAt).toLocaleString()}</span>
          ) : (
            <span> Live scan.</span>
          )}
        </p>

        {/* A raw String(e) — "TypeError: Failed to fetch" — was the entire error
            state. It told the user nothing and offered nowhere to go. */}
        {err && (
          <Callout tone="warning">
            Couldn&rsquo;t load the feed just now. It&rsquo;s usually a source being slow — try
            reloading, or{" "}
            <Link href="/think" className="underline underline-offset-4">
              start from your own thought
            </Link>
            .
          </Callout>
        )}
        {!items && !err && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        {items && items.length === 0 && <p className="text-muted">Nothing right now — start from your own thought instead.</p>}

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
