"use client";

import { useEffect, useState } from "react";

/**
 * A cycling, labeled progress indicator. AI calls can take a few seconds; this
 * advances through descriptive steps so the user never thinks it's frozen.
 */
export function ProgressSteps({ steps, intervalMs = 1600 }: { steps: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);

  // Reset when the set of steps actually changes. Done during render (React's
  // supported "adjust state on prop change" pattern, keyed on content not array
  // reference) so a caller passing a fresh array literal each render can't churn.
  const key = steps.join("");
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setI(0);
  }

  useEffect(() => {
    if (i >= steps.length - 1) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, steps.length - 1)), intervalMs);
    return () => clearTimeout(t);
  }, [i, steps.length, intervalMs]);

  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="text-fg">{steps[i]}…</span>
      <span className="font-mono text-xs text-muted/60">
        {i + 1}/{steps.length}
      </span>
    </div>
  );
}
