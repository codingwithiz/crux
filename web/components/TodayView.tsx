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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Plate, PlateLabel } from "@/components/ui/Plate";
import { Section } from "@/components/ui/Section";
import { Mark } from "@/components/ui/Ink";
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
  // Active and never scored — the calibration ledger only compounds once these
  // get an outcome, so this is what "unresolved" means in §10's phrasing.
  const unresolved = useMemo(
    () => (ledger ?? []).filter((t) => t.status === "active" && !t.outcome).length,
    [ledger],
  );

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
          className="mb-4 inline-flex items-center gap-1.5 text-small text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Today
        </button>
        <div className="mb-6 border-b border-line pb-4">
          <span className="font-mono text-micro uppercase tracking-eyebrow text-accent">
            {SOURCE_LABELS[pick.source]}
          </span>
          <p className="mt-1 text-small font-medium text-fg">{pick.title}</p>
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
    <div>
      {/* Welcome. The one banner on this page that is chrome rather than
          content — a one-time onboarding nudge, not a record of anything —
          so it alone keeps the tinted callout box. It used to share the exact
          border/background recipe with Revisit below, which made an
          onboarding prompt and a record of your own past thinking read as the
          same kind of object. */}
      {ledger && stats.total === 0 && (
        <div className="rounded-surface border border-cool/40 bg-cool/5 p-5">
          <p className="font-mono text-micro uppercase tracking-eyebrow text-cool">Welcome</p>
          <h2 className="mt-1 text-lead font-serif font-semibold">Your first take, in three steps</h2>
          {/* Each step names the button you'll actually press and says what it
              does. The old list used the app's vocabulary as if you already had
              it — and nothing anywhere taught it. */}
          <ol className="mt-3 space-y-2.5 text-small">
            {[
              ["Break it down", "Pick a story or paste a link. Crux reads the real page and tells you what's actually new."],
              ["Talk it through", "Optional. A sparring partner pushes back until your take holds up. It never writes it for you."],
              ["Save my take", "Your take lands in your Ledger — and becomes a carousel in your voice."],
            ].map(([verb, what], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cool/40 bg-cool/10 text-micro font-semibold text-cool">
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
              className="ce-press inline-flex items-center gap-1.5 rounded-control bg-accent px-4 py-2 text-small font-medium text-accent-fg transition duration-(--dur-fast) ease-out hover:brightness-110"
            >
              Start now
            </Link>
            <Link href="/guide" className="text-small text-muted underline-offset-4 hover:text-fg hover:underline">
              or read the 2-minute guide
            </Link>
          </div>
        </div>
      )}

      {parked.length > 0 && (
        <Section label="Continue where you left off" className={ledger && stats.total === 0 ? "mt-8" : "border-t-0 pt-0"}>
          <ul>
            {parked.map((t, i) => (
              <li
                key={t.id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-small font-medium text-fg">{t.topic}</p>
                  <p className="mt-0.5 text-micro text-muted">
                    Saved {new Date(t.createdAt).toLocaleDateString()}
                    {t.synthesis?.grounded ? " · grounded in the source" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="primary" onClick={() => resumeParked(t)}>
                    <BookOpen className="h-4 w-4" /> Continue
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void discardParked(t)}>
                    Discard
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Masthead. The streak is a chip beside the date, not a boxed number —
          it was styled as the loudest thing on the page while the one item you
          came here to read sat fifth, below the fold. Given its own top margin
          rather than riding the page's uniform rhythm, since it opens the page
          and everything below it is subordinate to the pick. */}
      <div className={parked.length > 0 || (ledger && stats.total === 0) ? "mt-10" : ""}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date is formatted in the user's locale/timezone, which the server
              can't match — suppress the expected hydration diff. */}
          <p className="font-mono text-micro uppercase tracking-eyebrow text-accent" suppressHydrationWarning>
            {dateLabel}
          </p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-micro text-muted">
              <Flame className="h-3.5 w-3.5 text-accent" /> {streak}-day streak
            </span>
          )}
          {doneToday && (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-micro text-success">
              <Check className="h-3.5 w-3.5" /> saved today
            </span>
          )}
        </div>
        <h1 className="mt-2 font-serif text-display font-semibold">
          {doneToday ? "That's today done." : <>One strong <Mark>take</Mark> a day.</>}
        </h1>
        <p className="mt-2 max-w-xl text-lead text-muted">
          Ten minutes of real thinking beats a day of scrolling.
        </p>
      </div>

      {/* Today's pick. The single decision this page exists to put in front of
          you, so it is the one paper object on the screen — everything else is
          ink and steps back. It used to be one accent-tinted card competing with
          three stat tiles, a revisit card and three equal-weight ghost links.
          A larger gap above it than the page's other seams: this is the one
          thing the page is for, not another section in a list of sections. */}
      {pick ? (
        <Plate arrive className="mt-8 sm:p-8">
          <PlateLabel>
            Today&rsquo;s pick · {SOURCE_LABELS[pick.source]}
            {pick.meta ? ` · ${pick.meta}` : ""}
          </PlateLabel>
          <p className="ce-measure mt-3 font-serif text-title font-semibold leading-tight">
            {pick.title}
          </p>
          {pick.detail && (
            <p className="ce-measure mt-3 text-small leading-relaxed text-paper-muted">{pick.detail}</p>
          )}
          <WhyThis why={pick.why} related={pick.related} viaInterest={pick.viaInterest} />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => setStarted(true)}>
              {doneToday ? "Break down another →" : "Break it down →"}
            </Button>
            {/* The source was previously unreachable from here — you were asked
                to spend a synthesis on an item you couldn't read first. */}
            <a
              href={pick.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ce-press inline-flex items-center rounded-control border border-paper-fg/20 px-4 py-2.5 text-small text-paper-fg transition duration-(--dur-fast) ease-out hover:bg-paper-fg/5"
            >
              Read source ↗
            </a>
            {candidates.length > 1 && (
              <button
                onClick={() => setCursor((c) => (c + 1) % candidates.length)}
                className="text-small text-paper-muted underline-offset-4 hover:text-paper-fg hover:underline"
              >
                Show another
              </button>
            )}
          </div>
          {/* One line, once: the primary CTA is a verb nobody has met before. */}
          <p className="mt-4 text-micro text-paper-muted">
            Breaking it down reads the real page and shows you what&rsquo;s actually new before you
            form a view.
          </p>
        </Plate>
      ) : (
        <Card tone="accent" feature className="mt-8 p-5 sm:p-6">
          <p className="font-mono text-micro uppercase tracking-eyebrow text-accent">
            Today&rsquo;s pick
          </p>
          <p className="mt-2 text-small text-muted">Scanning sources…</p>
        </Card>
      )}

      {/* Your thinking. §10: a dashboard KPI row ("3 Takes / 0 This Week / 1
          Revised") is the anti-pattern this page most directly warns against —
          three bordered tiles, styled as loud as the pick itself. Editorial
          language instead: metrics as a sentence supporting the story, not the
          story. Hidden with nothing to report — the Welcome banner already
          covers a first-time zero state. */}
      {stats.total > 0 && (
        <Section label="Your thinking" className="mt-10">
          <p className="ce-tabular font-serif text-lead text-fg">
            {stats.thisWeek} conviction{stats.thisWeek === 1 ? "" : "s"} this week
          </p>
          <p className="mt-1 text-small text-muted">
            {stats.updated} revised · {unresolved} unresolved
          </p>
        </Section>
      )}

      {/* Revisit your thinking. Shares no chrome with Welcome above — this is a
          record surfaced from the Ledger, not a nudge, so it reads as content:
          a rule and a label, the same device the rest of the page uses, rather
          than a second tinted callout box. */}
      {revisit && (
        <Section label="Revisit your thinking" className="mt-10" labelClassName="text-cool">
          <p className="ce-measure text-fg">{revisit.statement}</p>
          <p className="mt-1.5 text-micro text-muted">
            Saved {new Date(revisit.createdAt).toLocaleDateString()} ·{" "}
            <span className="uppercase">{revisit.confidence}</span> confidence
          </p>
          <Link
            href="/ledger"
            className="mt-3 inline-block text-small text-cool underline-offset-4 hover:underline"
          >
            Does today change it? Update your Ledger →
          </Link>
        </Section>
      )}
    </div>
  );
}
