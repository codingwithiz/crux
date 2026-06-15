"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getLedger, removeThesis, updateThesis } from "@/lib/ledger";
import { ledgerStats, calibration } from "@/lib/ledger-stats";
import { saveDraft } from "@/lib/draft";
import { expressSlides } from "@/lib/express-client";
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
};

const OUTCOME_LABEL: Record<Outcome, string> = { held: "held up", mixed: "mixed", broke: "broke" };
const OUTCOME_BADGE: Record<Outcome, string> = {
  held: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  mixed: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  broke: "border-red-500/40 bg-red-500/10 text-red-300",
};

type Filter = "all" | "active" | "updated" | "abandoned";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "updated", label: "Revised" },
  { id: "abandoned", label: "Abandoned" },
];

export function LedgerView() {
  const router = useRouter();
  const [items, setItems] = useState<Thesis[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getLedger().then(setItems);
  }, []);

  const stats = useMemo(() => ledgerStats(items ?? []), [items]);
  const cal = useMemo(() => calibration(items ?? []), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (q && !`${t.topic} ${t.statement}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, query]);

  async function makeCarousel(t: Thesis) {
    setBusyId(t.id);
    try {
      const slides = await expressSlides(t, "@you");
      saveDraft({ slides, handle: "@you" });
      router.push("/studio");
    } finally {
      setBusyId(null);
    }
  }
  async function del(id: string) {
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

  if (!items) return <p className="text-muted">Loading…</p>;
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
        No committed theses yet.{" "}
        <a href="/think" className="text-accent underline-offset-4 hover:underline">
          Form your first one →
        </a>
      </div>
    );

  return (
    <div>
      {/* Track record — the "keep score" surface */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Convictions" value={stats.total} />
        <Stat label="This week" value={stats.thisWeek} accent />
        <Stat label="Revised" value={stats.updated} />
        <Stat label="Abandoned" value={stats.abandoned} />
      </div>
      <div className="mb-5 flex items-center gap-3 text-xs text-muted">
        <span className="font-mono uppercase tracking-wide">Confidence</span>
        <ConfBar low={stats.byConfidence.low} med={stats.byConfidence.med} high={stats.byConfidence.high} />
      </div>

      {cal.resolved > 0 && (
        <div className="mb-5 rounded-xl border border-line bg-surface/40 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">Calibration</p>
            <p className="text-xs text-muted">
              {cal.resolved} resolved ·{" "}
              <span className="text-fg">{cal.score}/100</span> calibrated
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {(["high", "med", "low"] as Confidence[]).map((c) => (
              <div key={c} className="rounded-lg border border-line bg-ink/40 p-2">
                <p className="text-sm font-bold text-fg">
                  {cal.byConfidence[c].hitRate === null
                    ? "—"
                    : `${Math.round((cal.byConfidence[c].hitRate as number) * 100)}%`}
                </p>
                <p className="text-[11px] capitalize text-muted">
                  {c} held ({cal.byConfidence[c].resolved})
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Were you right when you were confident? Resolve theses (expand a card) to keep score.
          </p>
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
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-fg ${t.status === "abandoned" ? "line-through" : ""}`}>{t.statement}</p>
                    <span className={`shrink-0 font-mono text-xs uppercase ${CONF_COLOR[t.confidence]}`}>
                      {t.confidence}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>
                      {t.topic} · {new Date(t.createdAt).toLocaleDateString()}
                      {t.updatedAt ? ` · revised ${new Date(t.updatedAt).toLocaleDateString()}` : ""}
                    </span>
                    {STATUS_BADGE[t.status] && (
                      <span className={`rounded-full border px-2 py-0.5 ${STATUS_BADGE[t.status]}`}>
                        {t.status === "updated" ? "revised" : t.status}
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
                    {t.steelman && <Detail label="Strongest counter I accept">{t.steelman}</Detail>}
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
                            {t.source.title} ↗
                          </a>
                        ) : (
                          t.source.title
                        )}
                      </Detail>
                    )}
                    {!t.evidenceFor && !t.steelman && !t.changeMyMind && !t.source?.title && (
                      <p className="text-xs text-muted">No extra detail captured for this thesis.</p>
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
                  <button
                    onClick={() => makeCarousel(t)}
                    disabled={busyId === t.id}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
                  >
                    {busyId === t.id ? "Building…" : "Make carousel"}
                  </button>
                  <button
                    onClick={() => setEditId(t.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg hover:bg-surface"
                  >
                    Revise
                  </button>
                  {t.status === "abandoned" ? (
                    <button
                      onClick={() => setStatus(t, "active")}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(t, "abandoned")}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
                    >
                      Abandon
                    </button>
                  )}
                  <button
                    onClick={() => del(t.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
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
