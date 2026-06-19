"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConvictionFlow } from "./ConvictionFlow";
import { getLedger } from "@/lib/ledger";
import { ledgerStats, dailyStreak } from "@/lib/ledger-stats";
import { rankItems } from "@/lib/rank";
import type { NewsItem, Thesis } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Papers (HF)",
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  lobsters: "Lobsters",
  arxiv: "arXiv",
  news: "News",
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export function TodayView() {
  const [ledger, setLedger] = useState<Thesis[] | null>(null);
  const [pick, setPick] = useState<NewsItem | null>(null);
  const [started, setStarted] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    try {
      setShowTip(!window.localStorage.getItem("ce.guide.seen"));
    } catch {
      /* ignore */
    }
  }, []);
  function dismissTip() {
    try {
      window.localStorage.setItem("ce.guide.seen", "1");
    } catch {
      /* ignore */
    }
    setShowTip(false);
  }

  useEffect(() => {
    void (async () => {
      const items = await getLedger();
      setLedger(items);
      try {
        // Prefer the Cron-prepared radar snapshot; fall back to a live scan.
        let raw: NewsItem[] = [];
        let preRanked = false;
        try {
          const rj = (await (await fetch("/api/radar")).json()) as {
            snapshot?: { items?: NewsItem[]; personalized?: boolean } | null;
          };
          if (rj.snapshot?.items?.length) {
            raw = rj.snapshot.items;
            preRanked = Boolean(rj.snapshot.personalized);
          }
        } catch {
          /* fall through to live */
        }
        if (!raw.length) {
          const d = (await (await fetch("/api/news")).json()) as { items?: NewsItem[] };
          raw = d.items ?? [];
        }
        const ordered = preRanked
          ? raw
          : rankItems(raw, items.map((t) => ({ topic: t.topic, statement: t.statement })));
        // Skip items you've already formed a conviction on.
        const seen = new Set(
          items.map((t) => (t.source?.title ?? "").toLowerCase()).filter(Boolean),
        );
        setPick(ordered.find((i) => !seen.has(i.title.toLowerCase())) ?? ordered[0] ?? null);
      } catch {
        /* no pick today — the prompt still works via the quick links */
      }
    })();
  }, []);

  const stats = useMemo(() => ledgerStats(ledger ?? []), [ledger]);
  const streak = useMemo(() => dailyStreak(ledger ?? []), [ledger]);
  const doneToday = useMemo(
    () => (ledger ?? []).some((t) => t.createdAt.slice(0, 10) === todayKey()),
    [ledger],
  );
  // The oldest still-active thesis is the best candidate to re-examine.
  const revisit = useMemo(() => {
    const active = (ledger ?? []).filter((t) => t.status === "active");
    return active.length ? active[active.length - 1] : null;
  }, [ledger]);

  if (started && pick) {
    return (
      <div>
        <button onClick={() => setStarted(false)} className="mb-4 text-sm text-muted hover:text-fg">
          ← Back to Today
        </button>
        <div className="mb-5 rounded-lg border border-line bg-surface/40 p-3">
          <span className="font-mono text-xs text-accent">{SOURCE_LABELS[pick.source]}</span>
          <p className="mt-1 text-sm font-medium">{pick.title}</p>
        </div>
        <ConvictionFlow
          mode="news"
          initialInput={pick.detail || pick.title}
          sourceTitle={pick.title}
          sourceUrl={pick.url}
        />
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {showTip && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-cool/40 bg-cool/10 px-4 py-2.5 text-sm text-cool">
          <span>
            New here? The{" "}
            <Link href="/guide" className="font-medium underline underline-offset-4">
              2-minute guide
            </Link>{" "}
            shows how to turn one article into a defended take.
          </span>
          <button onClick={dismissTip} className="shrink-0 rounded-md px-2 py-1 text-xs hover:underline">
            Got it
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* Date is formatted in the user's locale/timezone, which the server
              can't match — suppress the expected hydration diff. */}
          <p className="font-mono text-xs text-accent" suppressHydrationWarning>
            {dateLabel}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {doneToday ? "Conviction formed today ✓" : "Form one conviction today"}
          </h1>
          <p className="mt-1 text-muted">
            Ten minutes of real thinking beats a day of scrolling. One item, one defended take.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface/40 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-accent">🔥 {streak}</p>
          <p className="text-xs text-muted">day streak</p>
        </div>
      </div>

      {/* Track record */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Convictions" value={stats.total} />
        <Stat label="This week" value={stats.thisWeek} accent />
        <Stat label="Revised" value={stats.updated} />
      </div>

      {/* Today's conviction */}
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">Today&rsquo;s conviction</p>
        {pick ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">{SOURCE_LABELS[pick.source]}</span>
              {pick.meta && <span className="text-xs text-muted">{pick.meta}</span>}
            </div>
            <p className="mt-1 text-lg font-semibold">{pick.title}</p>
            {pick.detail && <p className="mt-1 line-clamp-2 text-sm text-muted">{pick.detail}</p>}
            <button
              onClick={() => setStarted(true)}
              className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
            >
              {doneToday ? "Form another →" : "Form today's conviction →"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Scanning sources… or jump straight in via the links below.
          </p>
        )}
      </div>

      {/* Revisit your thinking */}
      {revisit && (
        <div className="rounded-2xl border border-cool/40 bg-cool/5 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-cool">Revisit your thinking</p>
          <p className="mt-2 text-sm text-fg">{revisit.statement}</p>
          <p className="mt-1 text-xs text-muted">
            Committed {new Date(revisit.createdAt).toLocaleDateString()} ·{" "}
            <span className="uppercase">{revisit.confidence}</span> confidence
          </p>
          <Link
            href="/ledger"
            className="mt-3 inline-block text-sm text-cool underline-offset-4 hover:underline"
          >
            Does today change it? Revise in your Ledger →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["/news", "Browse & curate the news"],
          ["/think", "Start from a thought"],
          ["/ledger", "Your Ledger"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-line px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
          >
            {label} →
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-3">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : "text-fg"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
