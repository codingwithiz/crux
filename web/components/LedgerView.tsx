"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, ChevronDown, ExternalLink, MoreHorizontal, Share2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RepurposeModal } from "@/components/RepurposeModal";
import { Skeleton } from "@/components/Skeleton";
import { ProgressSteps } from "@/components/ProgressSteps";
import { getLedger, removeThesis, updateThesis } from "@/lib/ledger";
import { ledgerStats, calibration } from "@/lib/ledger-stats";
import { saveDraft } from "@/lib/draft";
import { DEFAULT_SLIDE_SIZE } from "@/lib/carousel/size";
import { expressSlides } from "@/lib/express-client";
import { getBrandKit } from "@/lib/brand-kit";
import { saveFlow, parkedToFlow } from "@/lib/flow-session";
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

  useEffect(() => {
    getLedger().then(setItems);
  }, []);

  const stats = useMemo(() => ledgerStats(items ?? []), [items]);
  const cal = useMemo(() => calibration(items ?? []), [items]);
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
    return (items ?? []).filter((t) => {
      // "All" means all your opinions. Parked drafts aren't opinions yet, so
      // they live behind their own chip instead of diluting the ledger.
      if (filter === "all" ? t.status === "draft" : t.status !== filter) return false;
      if (q && !`${t.topic} ${t.statement}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, query]);

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
  if (!items.length)
    return (
      <EmptyState
        icon={BookMarked}
        title="No takes yet"
        description="Every take you save lands here. Score them as reality weighs in, and you find out whether you're right when you're confident."
        cta={{ href: "/think", label: "Write your first take" }}
      />
    );

  return (
    <div>
      {/* One scorecard, not five stacked panels. Counts, accuracy and the
          confidence mix are one thought — "how am I doing" — and they used to be
          three separate bordered boxes you scrolled past to reach a take. */}
      <div className="mb-6 rounded-xl border border-line bg-surface/40 p-5 shadow-[0_1px_0_0_var(--color-line),0_18px_40px_-28px_rgba(0,0,0,0.8)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">Accuracy</p>
            {/* The number this whole surface exists to produce, at the size that
                says so. It used to be 11px text at the end of a row. */}
            <p className="mt-1 font-serif text-display font-semibold leading-none tabular-nums">
              {cal.resolved > 0 ? (
                <>
                  {cal.score}
                  <span className="text-lead text-muted">/100</span>
                </>
              ) : (
                <span className="text-title text-muted">not scored yet</span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted">
              {cal.resolved > 0 ? `from ${cal.resolved} scored` : `${stats.total} saved, none scored`}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-sm sm:grid-cols-4">
            <Stat label="Takes" value={stats.total} />
            <Stat label="This week" value={stats.thisWeek} accent />
            <Stat label="Revised" value={stats.updated} />
            <Stat label="Abandoned" value={stats.abandoned} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {(["high", "med", "low"] as Confidence[]).map((c) => (
            <div key={c} className="rounded-lg border border-line bg-ink/40 p-2">
              <p className="text-sm font-bold tabular-nums text-fg">
                {cal.byConfidence[c].hitRate === null
                  ? "—"
                  : `${Math.round((cal.byConfidence[c].hitRate as number) * 100)}%`}
              </p>
              <p className="text-xs capitalize text-muted">
                {c} held ({cal.byConfidence[c].resolved})
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted">
          <span className="font-mono uppercase tracking-[0.14em]">Confidence</span>
          <ConfBar low={stats.byConfidence.low} med={stats.byConfidence.med} high={stats.byConfidence.high} />
        </div>

        {/* Shown from zero. This score is what makes a track record worth
            keeping, and it used to be invisible until you'd already scored
            something — as did the only text explaining how to score anything. */}
        <p className="mt-3 text-xs text-muted">
          {cal.resolved > 0
            ? "Were you right when you were confident?"
            : "Once reality has weighed in, open a take and say whether it held up. Do that a few times and this becomes a real measure of whether your confidence is worth trusting."}
        </p>
      </div>

      {due.length > 0 && (
        <div className="mb-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-warning">Time to score these</p>
          <p className="mt-1 text-xs text-muted">
            You saved these a while ago. How did they hold up? Scoring keeps your accuracy honest.
          </p>
          <div className="mt-3 space-y-2">
            {due.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink/40 p-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-fg" title={t.statement}>{t.statement}</span>
                <span className="shrink-0 text-[11px] text-muted">{daysAgo(t.createdAt)}d ago</span>
                {(["held", "mixed", "broke"] as Outcome[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setOutcome(t, o)}
                    title={`Mark as ${OUTCOME_LABEL[o]}`}
                    className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] capitalize text-muted hover:bg-surface hover:text-fg"
                  >
                    {OUTCOME_LABEL[o]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
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
          className="ml-auto w-44 rounded-lg border border-line bg-surface/40 px-3 py-1.5 text-xs outline-none focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Nothing matches.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) =>
            editId === t.id ? (
              <ReviseCard key={t.id} thesis={t} onSave={saveEdit} onCancel={() => setEditId(null)} />
            ) : (
              <div
                key={t.id}
                className={`rounded-xl border border-line bg-surface/40 p-4 ${t.status === "abandoned" ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  aria-expanded={expandedId === t.id}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* A parked draft has no statement yet — that's the point of
                        parking — so lead with the topic instead of a blank line. */}
                    {/* The committed opinion is the artefact this whole page
                        exists for — it should not read like table data. */}
                    <p
                      className={`font-serif text-[1.0625rem] leading-snug text-fg ${
                        t.status === "abandoned" ? "line-through" : ""
                      }`}
                    >
                      {t.status === "draft" ? t.topic : t.statement}
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      {t.status !== "draft" && (
                        <span className={`font-mono text-xs uppercase ${CONF_COLOR[t.confidence]}`}>
                          {t.confidence}
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
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
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
                </button>

                {expandedId === t.id && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                    {t.evidenceFor && (
                      <Detail label="Evidence for">{t.evidenceFor}</Detail>
                    )}
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
                      <p className="text-xs text-muted">No extra detail captured for this take.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs uppercase tracking-wide text-muted">How did it hold up?</span>
                      {(["held", "mixed", "broke"] as Outcome[]).map((o) => (
                        <button
                          key={o}
                          onClick={() => setOutcome(t, o)}
                          className={`rounded-lg border px-2.5 py-1 text-xs capitalize ${
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
                    // Parked work has one sensible next move: go back and finish
                    // thinking. Carousels and repurposing need an opinion first.
                    <>
                      <button
                        onClick={() => resumeParked(t)}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => del(t.id)}
                        onBlur={() => confirmDelete === t.id && setConfirmDelete(null)}
                        className={`rounded-lg border px-3 py-1.5 text-xs ${
                          confirmDelete === t.id
                            ? "border-danger/60 text-danger"
                            : "border-line text-muted hover:text-danger"
                        }`}
                      >
                        {confirmDelete === t.id ? "Tap again to discard" : "Discard"}
                      </button>
                    </>
                  ) : (
                  <>
                  {/* One primary action, then a menu. Five peer buttons gave
                      Delete the same weight as Make carousel. */}
                  <button
                    onClick={() => makeCarousel(t)}
                    disabled={busyId === t.id}
                    className="ce-press rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg shadow-[2px_2px_0_0_var(--color-accent-fg)] transition hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                  >
                    {busyId === t.id ? "Building…" : "Make carousel"}
                  </button>
                  <button
                    onClick={() => setRepTo(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-fg transition hover:border-accent/50 hover:bg-surface"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Reuse
                  </button>

                  <details
                    className="relative"
                    open={menuFor === t.id}
                    onToggle={(e) => setMenuFor((e.currentTarget as HTMLDetailsElement).open ? t.id : null)}
                  >
                    <summary
                      aria-label="More actions"
                      className="ce-press inline-flex cursor-pointer list-none items-center rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-fg"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
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
            ),
          )}
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
      className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-ink ${
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

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-3">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : "text-fg"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function ConfBar({ low, med, high }: { low: number; med: number; high: number }) {
  const total = Math.max(1, low + med + high);
  return (
    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface">
      <div style={{ width: `${(high / total) * 100}%` }} className="bg-accent" />
      <div style={{ width: `${(med / total) * 100}%` }} className="bg-cool" />
      <div style={{ width: `${(low / total) * 100}%` }} className="bg-line" />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm text-fg">
      <span className="text-xs uppercase tracking-wide text-muted">{label}: </span>
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
    <div className="rounded-xl border border-cool/40 bg-cool/5 p-4">
      <p className="mb-2 text-xs font-medium text-cool">Revise — new evidence changed your view?</p>
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        {(["low", "med", "high"] as Confidence[]).map((c) => (
          <button
            key={c}
            onClick={() => setConfidence(c)}
            className={`rounded-lg border px-3 py-1 text-xs capitalize ${
              confidence === c ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        value={changeMyMind}
        onChange={(e) => setChangeMyMind(e.target.value)}
        placeholder="What would change your mind now?"
        className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            onSave({ ...thesis, statement: statement.trim() || thesis.statement, confidence, changeMyMind: changeMyMind.trim() || undefined })
          }
          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110"
        >
          Save revision
        </button>
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-fg">
          Cancel
        </button>
      </div>
    </div>
  );
}
