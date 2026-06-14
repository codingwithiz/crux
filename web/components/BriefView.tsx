"use client";

import { useState } from "react";
import { ConvictionFlow } from "./ConvictionFlow";
import { getSettings, settingsReady } from "@/lib/settings";
import { getLedger } from "@/lib/ledger";
import type { BriefPick, NewsItem } from "@/lib/types";

const SOURCE_LABELS: Record<NewsItem["source"], string> = {
  hf: "Paper",
  hn: "Hacker News",
  github: "GitHub",
};

export function BriefView() {
  const [picks, setPicks] = useState<BriefPick[] | null>(null);
  const [picked, setPicked] = useState<BriefPick | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setErr(null);
    setPicks(null);
    const s = getSettings();
    if (!settingsReady(s)) {
      setErr("Add a model key in the Model menu (top-right) — free from Google AI Studio.");
      return;
    }
    setLoading(true);
    try {
      const ledger = await getLedger();
      const theses = ledger.slice(0, 12).map((t) => ({ topic: t.topic, statement: t.statement }));
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theses, settings: s }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error === "no_model" ? "No model configured." : j.error || "Brief failed");
      }
      const j = (await res.json()) as { picks?: BriefPick[] };
      setPicks(j.picks ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (picked) {
    return (
      <div>
        <button onClick={() => setPicked(null)} className="mb-4 text-sm text-muted hover:text-fg">
          ← Back to the brief
        </button>
        <div className="mb-5 rounded-lg border border-line bg-surface/40 p-3">
          <span className="font-mono text-xs text-accent">{SOURCE_LABELS[picked.source]}</span>
          <p className="mt-1 text-sm font-medium">{picked.title}</p>
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
    <div>
      {!picks && !loading && (
        <button
          onClick={generate}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110"
        >
          Generate today&rsquo;s brief →
        </button>
      )}

      {loading && <p className="text-muted">Scanning sources and ranking what&rsquo;s worth your opinion…</p>}

      {err && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {err}
        </div>
      )}

      {picks && picks.length === 0 && (
        <p className="text-muted">Nothing stood out today. Try the News or Think paths.</p>
      )}

      {picks && picks.length > 0 && (
        <div className="space-y-3">
          {picks.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPicked(p)}
              className="block w-full rounded-xl border border-line bg-surface/40 p-4 text-left transition hover:border-accent hover:bg-surface"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")} · {SOURCE_LABELS[p.source]}
                </span>
                <span className="text-xs text-muted">{p.meta}</span>
              </div>
              <p className="mt-2 font-medium">{p.title}</p>
              <p className="mt-1 text-sm text-muted">
                <span className="text-fg">Why it matters:</span> {p.whyItMatters}
              </p>
              {p.relevance && <p className="mt-1 text-sm text-cool">For you: {p.relevance}</p>}
              <span className="mt-3 inline-block text-sm text-fg">Form a conviction →</span>
            </button>
          ))}
          <button
            onClick={generate}
            className="mt-1 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
