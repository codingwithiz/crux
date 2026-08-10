"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { X, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { repurpose, type Repurposed } from "@/lib/express-client";
import type { Thesis } from "@/lib/types";

/** Re-express a saved take as an X thread + a LinkedIn post, with copy. */
export function RepurposeModal({ thesis, onClose }: { thesis: Thesis; onClose: () => void }) {
  const [data, setData] = useState<Repurposed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"thread" | "linkedin">("thread");

  useEffect(() => {
    let alive = true;
    repurpose(thesis)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [thesis]);

  function copy(text: string, label = "Copied") {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  }

  return (
    <Dialog open onClose={onClose} title="Reuse this take" align="top" z={110} className="max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Reuse this take</h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{thesis.statement}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-muted hover:bg-ink hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-4 pt-3">
          {(["thread", "linkedin"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px rounded-t-lg px-3 py-1.5 text-sm ${
                tab === t ? "border-b-2 border-accent font-medium text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t === "thread" ? "X thread" : "LinkedIn"}
            </button>
          ))}
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-4">
          {err ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">{err}</p>
          ) : !data ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Rewriting it in your voice…
            </div>
          ) : tab === "thread" ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={() => copy(data.thread.join("\n\n"), "Copied the thread")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-ink hover:text-fg"
                >
                  <Copy className="h-3 w-3" /> Copy all
                </button>
              </div>
              {data.thread.map((p, i) => (
                <div key={i} className="rounded-lg border border-line bg-ink/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-sm text-fg">{p}</p>
                    <button
                      onClick={() => copy(p)}
                      aria-label="Copy post"
                      className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-fg"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {p.length} chars · {i + 1}/{data.thread.length}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={() => copy(data.linkedin, "Copied the post")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-ink hover:text-fg"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <div className="rounded-lg border border-line bg-ink/40 p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{data.linkedin}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2.5">
          <p className="text-[11px] text-muted">Same opinion, your voice — nothing invented. Edit before posting.</p>
        </div>
    </Dialog>
  );
}
