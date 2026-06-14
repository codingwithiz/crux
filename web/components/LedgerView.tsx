"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLedger, removeThesis } from "@/lib/ledger";
import { saveDraft } from "@/lib/draft";
import { thesisToSlides } from "@/lib/slides";
import type { Confidence, Thesis } from "@/lib/types";

const CONF_COLOR: Record<Confidence, string> = {
  low: "text-muted",
  med: "text-cool",
  high: "text-accent",
};

export function LedgerView() {
  const router = useRouter();
  const [items, setItems] = useState<Thesis[] | null>(null);

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
      {items.map((t) => (
        <div key={t.id} className="rounded-xl border border-line bg-surface/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-fg">{t.statement}</p>
            <span className={`shrink-0 font-mono text-xs uppercase ${CONF_COLOR[t.confidence]}`}>
              {t.confidence}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t.topic} · {new Date(t.createdAt).toLocaleDateString()}
          </p>
          {t.changeMyMind && (
            <p className="mt-2 text-xs text-muted">
              <span className="text-cool">Would change my mind:</span> {t.changeMyMind}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => makeCarousel(t)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:brightness-110"
            >
              Make carousel
            </button>
            <button
              onClick={() => del(t.id)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
