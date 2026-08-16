"use client";

import { useEffect, useState } from "react";

/** After this long, stop implying progress and say the honest thing. */
const SLOW_AFTER_MS = 12_000;

/**
 * A cycling, labelled activity indicator for calls that take a few seconds.
 *
 * Deliberately no "step 2 of 4": the steps advance on a timer, not on actual
 * work, so a counter claimed a precision the component does not have — and it
 * parked at n/n forever when a call ran long, which is exactly when the user
 * most needs to know something is still happening. Labels rotate; past the last
 * one it admits the call is slow rather than looking frozen.
 */
export function ProgressSteps({ steps, intervalMs = 1600 }: { steps: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  const [slow, setSlow] = useState(false);

  // Reset when the set of steps actually changes. Done during render (React's
  // supported "adjust state on prop change" pattern, keyed on content not array
  // reference) so a caller passing a fresh array literal each render can't churn.
  const key = steps.join("");
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setI(0);
    setSlow(false);
  }

  useEffect(() => {
    if (i >= steps.length - 1) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, steps.length - 1)), intervalMs);
    return () => clearTimeout(t);
  }, [i, steps.length, intervalMs]);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [prevKey]);

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm">
      <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
      {/* Keyed so React remounts the span and the crossfade replays. The label
          used to hard-swap every 1600ms, which read as a glitch rather than as
          the same process moving on. */}
      <span key={slow ? "slow" : i} className="ce-crossfade text-fg">
        {slow ? "Still working — this one's taking a while" : `${steps[i]}…`}
      </span>
    </div>
  );
}
