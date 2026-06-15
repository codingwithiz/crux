"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLedger, removeThesis, updateThesis } from "@/lib/ledger";
import { saveDraft } from "@/lib/draft";
import { thesisToSlides } from "@/lib/slides";
import type { Confidence, Thesis } from "@/lib/types";

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

export function LedgerView() {
  const router = useRouter();
  const [items, setItems] = useState<Thesis[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    getLedger().then(setItems);
  }, []);

  function makeCarousel(t: Thesis) {
    saveDraft({ slides: thesisToSlides(t, "@you"), handle: "@you" });
    router.push("/studio");
  }
  async function del(id: string) {
    await removeThesis(id);
    setItems(await getLedger());
  }
  async function setStatus(t: Thesis, status: Thesis["status"]) {
    await updateThesis({ ...t, status, updatedAt: new Date().toISOString() });
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
    <div className="space-y-3">
      {items.map((t) =>
        editId === t.id ? (
          <ReviseCard key={t.id} thesis={t} onSave={saveEdit} onCancel={() => setEditId(null)} />
        ) : (
          <div
            key={t.id}
            className={`rounded-xl border border-line bg-surface/40 p-4 ${t.status === "abandoned" ? "opacity-60" : ""}`}
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
              </span>
              {STATUS_BADGE[t.status] && (
                <span className={`rounded-full border px-2 py-0.5 ${STATUS_BADGE[t.status]}`}>
                  {t.status === "updated" ? "revised" : t.status}
                </span>
              )}
            </p>
            {t.changeMyMind && (
              <p className="mt-2 text-xs text-muted">
                <span className="text-cool">Would change my mind:</span> {t.changeMyMind}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => makeCarousel(t)}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110"
              >
                Make carousel
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
