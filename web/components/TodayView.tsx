"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Check, ArrowLeft, BookOpen } from "lucide-react";
import { ConvictionFlow } from "./ConvictionFlow";
import { getLedger, removeThesis } from "@/lib/ledger";
import { saveFlow, parkedToFlow } from "@/lib/flow-session";
import { ledgerStats, dailyStreak } from "@/lib/ledger-stats";
import { rankItems, interestsAsPriors, type RankedItem } from "@/lib/rank";
import { getVoice } from "@/lib/voice";
import { WhyThis } from "@/components/WhyThis";
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
  const router = useRouter();
  const [ledger, setLedger] = useState<Thesis[] | null>(null);
  // The whole shortlist, not just its head: one unexplained take-it-or-leave-it
  // pick is a dead end when it misses. `cursor` walks it.
  const [candidates, setCandidates] = useState<RankedItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [started, setStarted] = useState(false);
  const pick = candidates[cursor] ?? null;

  useEffect(() => {
    void (async () => {
      const [items, voice] = await Promise.all([getLedger(), getVoice().catch(() => null)]);
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
        const ranked = preRanked
          ? raw
          : rankItems(raw, [
              ...items.map((t) => ({ topic: t.topic, statement: t.statement })),
              ...interestsAsPriors(voice?.interests ?? []),
            ]);

        // Something fetched for a topic you chose beats anything the general
        // scan happened to surface, so it leads the shortlist.
        let ordered = ranked;
        const interests = voice?.interests ?? [];
        if (interests.length) {
          try {
            const t = (await (
              await fetch(`/api/news?topics=${encodeURIComponent(interests.join(","))}`)
            ).json()) as { items?: RankedItem[] };
            if (t.items?.length) {
              const lead = new Set(t.items.map((i) => i.title.toLowerCase()));
              ordered = [...t.items, ...ranked.filter((i) => !lead.has(i.title.toLowerCase()))];
            }
          } catch {
            /* the general scan still stands */
          }
        }

        // Skip items you've already written a take on.
        const seen = new Set(
          items.map((t) => (t.source?.title ?? "").toLowerCase()).filter(Boolean),
        );
        const fresh = ordered.filter((i) => !seen.has(i.title.toLowerCase()));
        setCandidates(fresh.length ? fresh : ordered);
      } catch {
        /* no pick today — the prompt still works via the quick links */
      }
    })();
  }, []);

  const stats = useMemo(() => ledgerStats(ledger ?? []), [ledger]);
  const streak = useMemo(() => dailyStreak(ledger ?? []), [ledger]);
  // Parking is explicitly declining to take a position, so it doesn't count.
  const doneToday = useMemo(
    () => (ledger ?? []).some((t) => t.status !== "draft" && t.createdAt.slice(0, 10) === todayKey()),
    [ledger],
  );
  // The oldest still-active thesis is the best candidate to re-examine.
  const revisit = useMemo(() => {
    const active = (ledger ?? []).filter((t) => t.status === "active");
    return active.length ? active[active.length - 1] : null;
  }, [ledger]);
  const parked = useMemo(() => (ledger ?? []).filter((t) => t.status === "draft"), [ledger]);

  function resumeParked(t: Thesis) {
    saveFlow(parkedToFlow(t));
    router.push("/think");
  }

  async function discardParked(t: Thesis) {
    await removeThesis(t.id);
    setLedger((prev) => (prev ?? []).filter((x) => x.id !== t.id));
  }

  if (started && pick) {
    return (
      <div>
        <button
          onClick={() => setStarted(false)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Today
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
      {ledger && stats.total === 0 && (
        <div className="rounded-2xl border border-cool/40 bg-cool/5 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-cool">Welcome</p>
          <h2 className="mt-1 text-lg font-semibold">Your first take, in three steps</h2>
          {/* Each step names the button you'll actually press and says what it
              does. The old list used the app's vocabulary as if you already had
              it — and nothing anywhere taught it. */}
          <ol className="mt-3 space-y-2.5 text-sm">
            {[
              ["Break it down", "Pick a story or paste a link. Crux reads the real page and tells you what's actually new."],
              ["Talk it through", "Optional. A sparring partner pushes back until your take holds up. It never writes it for you."],
              ["Save my take", "Your take lands in your track record — and becomes a carousel in your voice."],
            ].map(([verb, what], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cool/40 bg-cool/10 text-xs font-semibold text-cool">
                  {i + 1}
                </span>
                <span className="text-muted">
                  <span className="font-medium text-fg">{verb}</span> — {what}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/think"
              className="ce-press inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
            >
              Start now
            </Link>
            <Link href="/guide" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
              or read the 2-minute guide
            </Link>
          </div>
        </div>
      )}

      {parked.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface/40 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">Continue where you left off</p>
          <ul className="mt-3 space-y-2">
            {parked.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{t.topic}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Saved {new Date(t.createdAt).toLocaleDateString()}
                    {t.synthesis?.grounded ? " · grounded in the source" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => resumeParked(t)}
                    className="ce-press inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:brightness-110"
                  >
                    <BookOpen className="h-4 w-4" /> Continue
                  </button>
                  <button
                    onClick={() => void discardParked(t)}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
            {doneToday ? (
              <span className="inline-flex items-center gap-2">
                Take saved today <Check className="h-6 w-6 text-emerald-400" />
              </span>
            ) : (
              "One strong take a day"
            )}
          </h1>
          <p className="mt-1 text-muted">
            Ten minutes of real thinking beats a day of scrolling. One item, one defended take.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface/40 px-4 py-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-2xl font-bold text-accent">
            <Flame className="h-5 w-5" /> {streak}
          </p>
          <p className="text-xs text-muted">day streak</p>
        </div>
      </div>

      {/* Track record */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Takes" value={stats.total} />
        <Stat label="This week" value={stats.thisWeek} accent />
        <Stat label="Revised" value={stats.updated} />
      </div>

      {/* Today's pick */}
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">Today&rsquo;s pick</p>
        {pick ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">{SOURCE_LABELS[pick.source]}</span>
              {pick.meta && <span className="text-xs text-muted">{pick.meta}</span>}
            </div>
            <p className="mt-1 text-lg font-semibold">{pick.title}</p>
            {pick.detail && <p className="mt-1 text-sm text-muted">{pick.detail}</p>}
            <WhyThis why={pick.why} related={pick.related} viaInterest={pick.viaInterest} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStarted(true)}
                className="ce-press rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
              >
                {doneToday ? "Break down another →" : "Break it down →"}
              </button>
              {/* The source was previously unreachable from here — you were asked
                  to spend a synthesis on an item you couldn't read first. */}
              <a
                href={pick.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line px-4 py-2.5 text-sm text-fg hover:bg-surface"
              >
                Read source ↗
              </a>
              {candidates.length > 1 && (
                <button
                  onClick={() => setCursor((c) => (c + 1) % candidates.length)}
                  className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  Show another
                </button>
              )}
            </div>
            {/* One line, once: the primary CTA is a verb nobody has met before. */}
            <p className="mt-2 text-xs text-muted">
              Breaking it down reads the real page and shows you what&rsquo;s actually new before you
              form a view.
            </p>
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
            Saved {new Date(revisit.createdAt).toLocaleDateString()} ·{" "}
            <span className="uppercase">{revisit.confidence}</span> confidence
          </p>
          <Link
            href="/ledger"
            className="mt-3 inline-block text-sm text-cool underline-offset-4 hover:underline"
          >
            Does today change it? Update your track record →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["/explore", "Explore what’s happening"],
          ["/think", "Start from a thought"],
          ["/ledger", "Your track record"],
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
