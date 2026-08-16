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
import { FeedItemSkeleton } from "@/components/Skeleton";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
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
  rank,
  children,
}: {
  item: RankedItem;
  expanded: boolean;
  onToggle: () => void;
  onSynthesize: () => void;
  /** 1-based position in the ranked list. Omitted in sections that aren't ranked. */
  rank?: number;
  children?: React.ReactNode;
}) {
  const age = itemAge(item);
  // The section is headed "Everything, ranked" and every row looked identical,
  // which makes the ranking a claim rather than something you can see. The top
  // three carry the weight the ordering already assigned them.
  const lead = rank !== undefined && rank <= 3;
  return (
    <div
      className={`rounded-control border bg-surface/40 transition duration-(--dur-fast) ease-out ${
        expanded ? "border-accent" : "border-line hover:border-accent/60 hover:bg-surface"
      }`}
    >
      <button onClick={onToggle} aria-expanded={expanded} className="block w-full p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-micro text-accent">
            {rank !== undefined && (
              <span className={`ce-tabular ${lead ? "text-accent" : "text-muted"}`}>
                {String(rank).padStart(2, "0")}
              </span>
            )}
            {(() => {
              const Icon = SOURCE_ICON[item.source];
              return <Icon className="h-3.5 w-3.5" aria-hidden />;
            })()}
            {SOURCE_LABELS[item.source]}
          </span>
          <span className="shrink-0 text-micro text-muted">
            {[item.meta, age].filter(Boolean).join(" · ")}
          </span>
        </div>
        {/* Three tiers, not two. The top three carried the ranking's full
            weight and everything else — rank 4 and rank 40 alike — was one
            flat text-sm row, so "ranked" stopped being visible past third
            place. Ranks 4-10 now step down gradually instead of falling off a
            cliff. */}
        <p
          className={`mt-1 ${
            lead
              ? "font-serif text-lg leading-snug"
              : rank !== undefined && rank <= 10
                ? "text-small font-medium text-fg"
                : "text-small font-medium text-muted"
          }`}
        >
          {item.title}
        </p>
        {item.detail && !expanded && (
          <p className="mt-1 line-clamp-2 text-micro text-muted">{item.detail}</p>
        )}
        <WhyThis why={item.why} related={item.related} viaInterest={item.viaInterest} />
      </button>

      {expanded && (
        <div className="border-t border-line px-3 py-3">
          {item.detail && <p className="text-small text-muted">{item.detail}</p>}
          {children}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={onSynthesize}>
              Break it down →
            </Button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ce-press inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-small text-fg transition duration-(--dur-fast) ease-out hover:bg-surface"
            >
              Read source ↗
            </a>
            <span className="text-micro text-muted">
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
        <button onClick={() => setPicked(null)} className="mb-4 text-small text-muted hover:text-fg">
          ← Pick another
        </button>
        <div className="mb-6 border-b border-line pb-4">
          <span className="font-mono text-micro uppercase tracking-eyebrow text-accent">
            {SOURCE_LABELS[picked.source]}
          </span>
          <p className="mt-1 text-small font-medium text-fg">{picked.title}</p>
          <a
            href={picked.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-micro text-muted underline-offset-4 hover:text-fg hover:underline"
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
    // Two panes from xl. A single centred column left roughly two thirds of a
    // 1920px screen as empty ink while the personal sections pushed the ranked
    // feed — the reason to be on this page — below the fold.
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8 xl:sticky xl:top-20 xl:order-2">
      {/* Fetched for the topics you follow. Before this existed, following a
          topic could only re-sort a fixed list of AI outlets — so following
          "robotics" or "biotech" changed the page by nothing at all. */}
      {(topicItems.length > 0 || quietTopics.length > 0) && (
        <section>
          <h2 className="font-mono text-micro uppercase tracking-eyebrow text-cool">
            From the topics you follow
          </h2>
          <p className="mb-3 text-small text-muted">
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
            <p className="mt-2 text-micro text-muted">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-micro uppercase tracking-eyebrow text-accent">Top picks</h2>
            <p className="text-small text-muted">
              The 3–5 stories most worth an opinion, weighted to what you&rsquo;ve written.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={curate} loading={curating} loadingLabel="Picking…" className="shrink-0">
            {picks ? "Pick again" : "Pick the best for me"}
          </Button>
        </div>

        {curating && (
          <div className="mt-3">
            <ProgressSteps steps={CURATE_STEPS} />
          </div>
        )}

        {curateErr && (
          <div className="mt-3 rounded-control border border-warning/40 bg-warning/10 px-4 py-2.5 text-small text-warning">
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
                <p className="mt-2 text-small text-muted">
                  <span className="text-fg">Why it matters:</span> {p.whyItMatters}
                </p>
                {p.relevance && <p className="mt-1 text-small text-cool">For you: {p.relevance}</p>}
              </FeedItem>
            ))}
          </div>
        )}
      </section>

      </div>

      {/* Full ranked list */}
      <section className="xl:order-1">
        <h2 className="font-mono text-micro uppercase tracking-eyebrow text-accent">Everything, ranked</h2>
        {/* Was two lines restating the ranking method. The numbers do that now. */}
        <p className="mb-3 text-small text-muted">
          Attention, blended with how close it sits to what you&rsquo;ve written.
          {scannedAt ? (
            <span className="text-cool"> Scanned {new Date(scannedAt).toLocaleString()}</span>
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
              <FeedItemSkeleton key={i} />
            ))}
          </div>
        )}
        {items && items.length === 0 && <p className="text-muted">Nothing right now — start from your own thought instead.</p>}

        {items && items.length > 0 && (
          <div className="space-y-2">
            {items.map((it, i) => (
              <FeedItem
                key={it.id}
                item={it}
                rank={i + 1}
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
