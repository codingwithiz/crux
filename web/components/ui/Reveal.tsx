"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveals its children once, when they first scroll into view.
 *
 * The landing page has seven sections and zero scroll motion — everything is
 * simply already there, which is why it reads as a document rather than a
 * product. This is the one-shot version: it disconnects after firing, so
 * scrolling back up never replays it. Replaying is what makes scroll animation
 * feel cheap.
 *
 * `index` staggers siblings via `--i`, the same variable `.ce-stagger` already
 * uses for the synthesis rows.
 *
 * Rendered visible and *armed* by the effect rather than hidden by default, so
 * the content is on the page for a crawler, for a reader with JS off, and for
 * anyone whose observer never fires. It also keeps the whole thing out of React
 * state: the effect talks to the DOM, which is what an effect is for, and no
 * reveal causes a re-render.
 */
export function Reveal({
  index = 0,
  className = "",
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.setProperty("--i", String(index));
    el.classList.add("ce-reveal-armed");

    const io = new IntersectionObserver(
      ([entry]) => {
        // Intersecting is the normal case. The second clause is the one that
        // matters: on a jump — an anchor, Cmd+End, or restored scroll position —
        // a section can go straight from "below the fold" to "above the
        // viewport" without ever being on screen, and armed-but-never-revealed
        // means permanently invisible content. If it is already behind us, it
        // has been missed; show it.
        const passed = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !passed) return;
        el.classList.remove("ce-reveal-armed");
        if (!passed) el.classList.add("ce-stagger");
        io.disconnect();
      },
      // Fire slightly before the element reaches the fold, so the animation is
      // already settling by the time it is properly on screen.
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
