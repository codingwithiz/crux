"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, ChevronDown, ExternalLink, MoreHorizontal, Share2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RepurposeModal } from "@/components/RepurposeModal";
import { Skeleton } from "@/components/Skeleton";
import { ProgressSteps } from "@/components/ProgressSteps";
import { getLedger, removeThesis, updateThesis } from "@/lib/ledger";
import { ledgerStats, calibration, calibrationVerdict } from "@/lib/ledger-stats";
import { CalibrationChart } from "@/components/CalibrationChart";
import { Callout } from "@/components/ui/Callout";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { CONF_P } from "@/lib/ledger-stats";
import { saveDraft } from "@/lib/draft";
import { DEFAULT_SLIDE_SIZE } from "@/lib/carousel/size";
import { expressSlides } from "@/lib/express-client";
import { getBrandKit } from "@/lib/brand-kit";
import { saveFlow, parkedToFlow } from "@/lib/flow-session";
import { asCitations } from "@/lib/citations";
import type { Confidence, Outcome, Thesis } from "@/lib/types";

const CONF_COLOR: Record<Confidence, string> = {
  low: "text-muted",
  med: "text-cool",
  high: "text-accent",
};

const STATUS_BADGE: Record<Thesis["status"], string | null> = {
  active: null,
  updated: "border-cool/40 bg-cool/10 text-cool",
  abandoned: "border-line bg-surface text-muted",
  draft: "border-line bg-surface text-muted",
};

const OUTCOME_LABEL: Record<Outcome, string> = { held: "held up", mixed: "mixed", broke: "broke" };

/** Below this many scored takes, the accuracy number says so rather than
 *  presenting two data points with the confidence of twenty. */
const PROVISIONAL_AT = 5;

/** Quotes on this take that were matched word-for-word against the source. The
 *  legacy bare-string citation shape carries no verification, so it counts zero
 *  rather than being assumed good. */
const receiptCount = (t: Thesis) =>
  asCitations(t.synthesis?.citations).filter((c) => c.verified).length;
const OUTCOME_BADGE: Record<Outcome, string> = {
  held: "border-success/40 bg-success/10 text-success",
  mixed: "border-warning/40 bg-warning/10 text-warning",
  broke: "border-danger/40 bg-danger/10 text-danger",
};

type Filter = "all" | "active" | "updated" | "abandoned" | "draft";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "updated", label: "Revised" },
  { id: "abandoned", label: "Abandoned" },
  { id: "draft", label: "Saved for later" },
];

// "Make carousel" is a 10–20s call that used to report itself as "Building…".
const CAROUSEL_STEPS = ["Reading your take", "Drafting the slides", "Picking a layout", "Setting it in your voice"];

export function LedgerView() {
  const router = useRouter();
  const [items, setItems] = useState<Thesis[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [repTo, setRepTo] = useState<Thesis | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  /** Which card's overflow menu is open — one at a time. */
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Without the catch, a store failure left four skeletons pulsing forever —
    // the one screen holding work you cannot regenerate, silently stuck.
    getLedger()
      .then(setItems)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Couldn't load your Ledger.");
        setItems([]);
      });
  }, []);

  const stats = useMemo(() => ledgerStats(items ?? []), [items]);
  const cal = useMemo(() => calibration(items ?? []), [items]);
  const verdict = useMemo(() => calibrationVerdict(cal), [cal]);
  // Re-surface convictions committed a while ago that still have no recorded
  // outcome — the nudge that closes the calibration loop.
  // `now` is read once per mount rather than inside the memo: calling Date.now()
  // during render means the same inputs can yield different output, which is the
  // definition of an impure render.
  const [now] = useState(() => Date.now());
  const due = useMemo(() => {
    const cutoff = now - 14 * 86400000;
    return (items ?? [])
      .filter((t) => t.status === "active" && !t.outcome && new Date(t.createdAt).getTime() < cutoff)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5);
  }, [items, now]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? [])
      .filter((t) => {
        // "All" means all your opinions. Parked drafts aren't opinions yet, so
        // they live behind their own chip instead of diluting the ledger.
        if (filter === "all" ? t.status === "draft" : t.status !== filter) return false;
        if (q && !`${t.topic} ${t.statement}`.toLowerCase().includes(q)) return false;
        return true;
      })
      // Newest first, independent of storage order — the timeline reads top
      // to bottom as "most recent thinking first," and date grouping below
      // assumes this order.
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, filter, query]);

  /** Month headers for the timeline — "August 2026" wherever the month changes
   *  going down the sorted list. Computed once per `filtered` rather than by
   *  mutating a variable during render, which the compiler (rightly) rejects
   *  as an impure render. */
  const withMonths = useMemo(() => {
    const monthOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    // `filtered` is already newest-first, so each item's header is purely a
    // function of itself and its predecessor — no running accumulator needed.
    return filtered.map((t, i) => {
      const month = monthOf(t.createdAt);
      const showHeader = i === 0 || month !== monthOf(filtered[i - 1].createdAt);
      return { thesis: t, month, showHeader };
    });
  }, [filtered]);

  function resumeParked(t: Thesis) {
    saveFlow(parkedToFlow(t));
    router.push("/think");
  }

  async function makeCarousel(t: Thesis) {
    setBusyId(t.id);
    try {
      const handle = getBrandKit().handle;
      const { slides, designId, format } = await expressSlides(t, handle);
      saveDraft({
        slides: slides.map((sl) => ({ ...sl, size: DEFAULT_SLIDE_SIZE })),
        handle,
        designId,
        context: { mode: "express", thesis: t, synthesis: t.synthesis, sourceTitle: t.source?.title, format },
      });
      router.push("/studio");
    } finally {
      setBusyId(null);
    }
  }
  /**
   * Two-step delete. A committed thesis is the one thing here that can't be
   * regenerated — it's your record of what you thought and when — so a stray
   * click shouldn't be able to destroy it. First click arms, second confirms.
   */
  async function del(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    await removeThesis(id);
    setItems(await getLedger());
  }
  async function setStatus(t: Thesis, status: Thesis["status"]) {
    await updateThesis({ ...t, status, updatedAt: new Date().toISOString() });
    setItems(await getLedger());
  }
  async function setOutcome(t: Thesis, outcome: Outcome) {
    const next = t.outcome === outcome ? undefined : outcome;
    await updateThesis({ ...t, outcome: next, resolvedAt: next ? new Date().toISOString() : undefined });
    setItems(await getLedger());
  }
  async function saveEdit(t: Thesis) {
    await updateThesis({ ...t, status: "updated", updatedAt: new Date().toISOString() });
    setEditId(null);
    setItems(await getLedger());
  }

  if (!items)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  if (loadError)
    return (
      <Callout tone="danger">
        {loadError} Your takes are safe — this is a read failure. Reload to try again.
      </Callout>
    );
  if (!items.length)
    return (
      <EmptyState
        icon={BookMarked}
        title="Your Ledger is quiet."
        description="Give yourself something worth being wrong about. Score it as reality weighs in, and find out whether you were right when you were confident."
        cta={{ href: "/think", label: "Write your first take" }}
      />
    );

  return (
    <div>
      {/* The scorecard, decomposed. It was one bordered card holding roughly a
          dozen numeric encodings — four nested Stat tiles, an unlabelled
          three-segment bar, and the calibration chart all competing for the
          same weight. §12: confidence should read as an editorial judgment,
          not a KPI panel. Accuracy keeps the page's largest numeral; the chart
          — "the one picture this product is actually about" — gets its own
          section and more size than a hairline plot buried under four tiles;
          the counts and mix are now a sentence, the same device Today uses. */}
      <div>
        <p className="font-mono text-micro uppercase tracking-eyebrow text-accent">Accuracy</p>
        {/* The number this whole surface exists to produce, at the size that
            says so. It used to be 11px text at the end of a row. */}
        <p className="ce-tabular mt-1 font-serif text-display font-semibold leading-none">
          {cal.resolved > 0 ? (
            <>
              {cal.score}
              <span className="text-lead text-muted">/100</span>
            </>
          ) : (
            <span className="text-title text-muted">not scored yet</span>
          )}
        </p>
        {/* A 97 drawn from two scored takes is not a 97. The product's whole
            claim is that it does not overstate, so the one number that could
            overstate says how thin it is, at the size it deserves. */}
        <p className="mt-1 text-small text-muted">
          {cal.resolved === 0
            ? `${stats.total} saved, none scored`
            : cal.resolved < PROVISIONAL_AT
              ? `provisional — from only ${cal.resolved} scored`
              : `from ${cal.resolved} scored`}
        </p>
      </div>

      <Section label="Were you right when you were confident?" className="mt-8">
        <CalibrationChart cal={cal} verdict={verdict} />
      </Section>

      <Section label="Your thinking" className="mt-8">
        <p className="ce-tabular font-serif text-lead text-fg">
          {stats.total} take{stats.total === 1 ? "" : "s"} saved
        </p>
        <p className="mt-1 text-small text-muted">
          {stats.thisWeek} this week · {stats.updated} revised
          {stats.abandoned > 0 ? ` · ${stats.abandoned} abandoned` : ""}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <ConfBar low={stats.byConfidence.low} med={stats.byConfidence.med} high={stats.byConfidence.high} />
          <span className="font-mono text-micro text-muted">
            <span className="text-accent">{stats.byConfidence.high} high</span> ·{" "}
            <span className="text-cool">{stats.byConfidence.med} med</span> ·{" "}
            <span>{stats.byConfidence.low} low</span>
          </span>
        </div>
      </Section>

      {due.length > 0 && (
        <Section label="Time to score these" className="mt-8" labelClassName="text-warning">
          <p className="text-small text-muted">
            You saved these a while ago. How did they hold up? Scoring keeps your accuracy honest.
          </p>
          <div className="mt-3">
            {due.map((t, i) => (
              <div
                key={t.id}
                className={`flex flex-wrap items-center gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate text-small text-fg" title={t.statement}>{t.statement}</span>
                <span className="shrink-0 text-micro text-muted">{daysAgo(t.createdAt)}d ago</span>
                {(["held", "mixed", "broke"] as Outcome[]).map((o) => (
                  <Button
                    key={o}
                    size="sm"
                    variant="ghost"
                    onClick={() => setOutcome(t, o)}
                    title={`Mark as ${OUTCOME_LABEL[o]}`}
                    className="capitalize"
                  >
                    {OUTCOME_LABEL[o]}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Filters + search */}
      <div className="mt-8 mb-4 flex flex-wrap items-center gap-2 border-t border-line pt-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-control border px-3 py-1.5 text-small transition duration-(--dur-fast) ease-out ${
              filter === f.id ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topic or text…"
          className="ml-auto w-44 rounded-control border border-line bg-surface/40 px-3 py-1.5 text-small outline-none focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="border-t border-dashed border-line py-8 text-center text-small text-muted">
          Nothing matches.
        </p>
      ) : (
        /* The timeline spine. §10: "use timeline and provenance patterns more
           than card grids... a conviction should feel like a record, not a
           database row." This was a stack of identical bordered cards with no
           spine, no date grouping and chronology only legible as text inside
           each card — the list happened to be sorted; nothing on screen said
           so. The rule on the left plus a month header wherever the month
           changes is what turns "a list of cards" into "a record over time." */
        <div className="relative border-l border-line pl-6 sm:pl-8">
          {withMonths.map(({ thesis: t, month, showHeader }, i) => {
            return (
              <Fragment key={t.id}>
                {showHeader && (
                  <p
                    className={`-ml-6 pl-6 font-mono text-micro uppercase tracking-eyebrow text-muted sm:-ml-8 sm:pl-8 ${i > 0 ? "mt-6" : ""}`}
                  >
                    {month}
                  </p>
                )}
                {editId === t.id ? (
                  <div className="py-3">
                    <ReviseCard thesis={t} onSave={saveEdit} onCancel={() => setEditId(null)} />
                  </div>
                ) : (
                  <div
                    className={`relative py-4 ${showHeader ? "" : "border-t border-line"} ${
                      t.status === "abandoned" ? "opacity-60" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className="absolute top-6 left-[calc(-1.5rem-4px)] h-[7px] w-[7px] rounded-full bg-line sm:left-[calc(-2rem-4px)]"
                    />
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      aria-expanded={expandedId === t.id}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* A parked draft has no statement yet — that's the point
                            of parking — so lead with the topic instead of a blank
                            line. The committed opinion is the artefact this whole
                            page exists for — it should not read like table data. */}
                        <p
                          className={`font-serif text-lead leading-snug text-fg ${
                            t.status === "abandoned" ? "line-through" : ""
                          }`}
                        >
                          {t.status === "draft" ? t.topic : t.statement}
                        </p>
                        <span className="flex shrink-0 items-center gap-2">
                          {/* Confidence as the forecast it is (§12), not the
                              11px word it used to be. */}
                          {t.status !== "draft" && (
                            <span
                              className={`ce-tabular font-mono text-small font-semibold ${CONF_COLOR[t.confidence]}`}
                              title={`${t.confidence} confidence`}
                            >
                              {Math.round(CONF_P[t.confidence] * 100)}%
                            </span>
                          )}
                          {/* Nothing used to signal these open — and the outcome
                              buttons that drive calibration live inside. */}
                          <ChevronDown
                            aria-hidden
                            className={`h-4 w-4 text-muted transition-transform ${
                              expandedId === t.id ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-micro text-muted">
                        <span>
                          {t.topic} · {new Date(t.createdAt).toLocaleDateString()}
                          {t.updatedAt ? ` · revised ${new Date(t.updatedAt).toLocaleDateString()}` : ""}
                        </span>
                        {STATUS_BADGE[t.status] && (
                          <span className={`rounded-full border px-2 py-0.5 ${STATUS_BADGE[t.status]}`}>
                            {t.status === "updated" ? "revised" : t.status === "draft" ? "saved for later" : t.status}
                          </span>
                        )}
                        {t.outcome && (
                          <span className={`rounded-full border px-2 py-0.5 ${OUTCOME_BADGE[t.outcome]}`}>
                            {OUTCOME_LABEL[t.outcome]}
                          </span>
                        )}
                      </p>
                      {/* The falsifier the user wrote themselves, on the collapsed
                          record. It was three levels down — behind a click, under
                          two other fields — and it is the most valuable line on
                          the page: the condition under which they would come back
                          and change this. A ledger without it is just a list. */}
                      {t.changeMyMind && expandedId !== t.id && (
                        <p className="ce-measure mt-2 border-l border-cool/40 pl-2.5 text-micro text-cool/80">
                          Changes if: {t.changeMyMind}
                        </p>
                      )}
                      {/* Provenance, drawn as a chain rather than a plain line.
                          source → take → receipts is all in storage and was
                          never connected visually — which is most of why a list
                          of takes didn't feel like it accumulated into anything. */}
                      {(t.source?.title || receiptCount(t) > 0) && (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-micro text-muted">
                          {t.source?.title && (
                            <>
                              <span className="max-w-[16rem] truncate">{t.source.title}</span>
                              {receiptCount(t) > 0 && <span aria-hidden>→</span>}
                            </>
                          )}
                          {receiptCount(t) > 0 && (
                            <span className="text-success">
                              <span className="ce-tabular">{receiptCount(t)}</span> verified{" "}
                              {receiptCount(t) === 1 ? "receipt" : "receipts"}
                            </span>
                          )}
                        </p>
                      )}
                    </button>

                    {expandedId === t.id && (
                      <div className="mt-3 space-y-2 border-t border-line pt-3 text-small">
                        {t.evidenceFor && <Detail label="Evidence for">{t.evidenceFor}</Detail>}
                        {t.steelman && <Detail label="The other side's best case">{t.steelman}</Detail>}
                        {t.changeMyMind && <Detail label="Would change my mind">{t.changeMyMind}</Detail>}
                        {t.source?.title && (
                          <Detail label="Source">
                            {t.source.url ? (
                              <a
                                href={t.source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cool underline-offset-4 hover:underline"
                              >
                                {t.source.title} <ExternalLink className="inline h-3 w-3 align-middle" />
                              </a>
                            ) : (
                              t.source.title
                            )}
                          </Detail>
                        )}
                        {!t.evidenceFor && !t.steelman && !t.changeMyMind && !t.source?.title && (
                          <p className="text-micro text-muted">No extra detail captured for this take.</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="font-mono text-micro uppercase tracking-eyebrow text-muted">
                            How did it hold up?
                          </span>
                          {(["held", "mixed", "broke"] as Outcome[]).map((o) => (
                            <button
                              key={o}
                              onClick={() => setOutcome(t, o)}
                              className={`ce-press min-h-11 rounded-control border px-3.5 text-small capitalize transition duration-(--dur-fast) ease-out ${
                                t.outcome === o ? OUTCOME_BADGE[o] : "border-line text-muted hover:bg-surface"
                              }`}
                            >
                              {OUTCOME_LABEL[o]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.status === "draft" ? (
                        // Parked work has one sensible next move: go back and
                        // finish thinking. Carousels and repurposing need an
                        // opinion first.
                        <>
                          <Button size="sm" variant="primary" onClick={() => resumeParked(t)}>
                            Continue
                          </Button>
                          <Button
                            size="sm"
                            variant={confirmDelete === t.id ? "danger" : "ghost"}
                            onClick={() => del(t.id)}
                            onBlur={() => confirmDelete === t.id && setConfirmDelete(null)}
                          >
                            {confirmDelete === t.id ? "Tap again to discard" : "Discard"}
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* One primary action, then a menu. Five peer buttons
                              gave Delete the same weight as Make carousel. */}
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => makeCarousel(t)}
                            loading={busyId === t.id}
                            loadingLabel="Building…"
                          >
                            Make carousel
                          </Button>
                          <Button size="sm" onClick={() => setRepTo(t)}>
                            <Share2 className="h-3.5 w-3.5" /> Reuse
                          </Button>

                          <details
                            className="relative"
                            open={menuFor === t.id}
                            onToggle={(e) => setMenuFor((e.currentTarget as HTMLDetailsElement).open ? t.id : null)}
                          >
                            <summary
                              aria-label="More actions"
                              className="ce-press inline-flex h-9 cursor-pointer list-none items-center rounded-control border border-line px-3 text-muted transition duration-(--dur-fast) ease-out hover:bg-surface hover:text-fg"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-control border border-line bg-surface shadow-2xl">
                              <MenuItem onClick={() => { setMenuFor(null); setEditId(t.id); }}>Revise</MenuItem>
                              <MenuItem
                                onClick={() => { setMenuFor(null); void setStatus(t, t.status === "abandoned" ? "active" : "abandoned"); }}
                              >
                                {t.status === "abandoned" ? "Reactivate" : "Abandon"}
                              </MenuItem>
                              <MenuItem
                                danger
                                onClick={() => void del(t.id)}
                                onBlur={() => confirmDelete === t.id && setConfirmDelete(null)}
                              >
                                {confirmDelete === t.id ? "Click again to delete" : "Delete"}
                              </MenuItem>
                            </div>
                          </details>
                        </>
                      )}
                    </div>

                    {busyId === t.id && (
                      <div className="mt-3">
                        <ProgressSteps steps={CAROUSEL_STEPS} />
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {repTo && <RepurposeModal thesis={repTo} onClose={() => setRepTo(null)} />}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  onBlur,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onBlur?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onBlur={onBlur}
      className={`block w-full px-3 py-2 text-left text-small transition duration-(--dur-fast) ease-out hover:bg-ink ${
        danger ? "text-danger" : "text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function ConfBar({ low, med, high }: { low: number; med: number; high: number }) {
  const total = Math.max(1, low + med + high);
  return (
    <div className="flex h-2 w-32 overflow-hidden rounded-full bg-surface" aria-hidden>
      <div style={{ width: `${(high / total) * 100}%` }} className="bg-accent" />
      <div style={{ width: `${(med / total) * 100}%` }} className="bg-cool" />
      <div style={{ width: `${(low / total) * 100}%` }} className="bg-line" />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-small text-fg">
      <span className="text-micro uppercase tracking-wide text-muted">{label}: </span>
      {children}
    </p>
  );
}

function ReviseCard({
  thesis,
  onSave,
  onCancel,
}: {
  thesis: Thesis;
  onSave: (t: Thesis) => void;
  onCancel: () => void;
}) {
  const [statement, setStatement] = useState(thesis.statement);
  const [confidence, setConfidence] = useState<Confidence>(thesis.confidence);
  const [changeMyMind, setChangeMyMind] = useState(thesis.changeMyMind ?? "");

  return (
    <div className="rounded-surface border border-cool/40 bg-cool/5 p-4">
      <p className="mb-2 text-small font-medium text-cool">Revise — new evidence changed your view?</p>
      <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={2} />
      <div className="mt-2 flex items-center gap-2">
        {(["low", "med", "high"] as Confidence[]).map((c) => (
          <button
            key={c}
            onClick={() => setConfidence(c)}
            className={`rounded-control border px-3 py-1 text-small capitalize transition duration-(--dur-fast) ease-out ${
              confidence === c ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <Input
        value={changeMyMind}
        onChange={(e) => setChangeMyMind(e.target.value)}
        placeholder="What would change your mind now?"
        className="mt-2"
      />
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() =>
            onSave({ ...thesis, statement: statement.trim() || thesis.statement, confidence, changeMyMind: changeMyMind.trim() || undefined })
          }
        >
          Save revision
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
