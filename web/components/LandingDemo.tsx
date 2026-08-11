"use client";

import { useEffect, useState } from "react";
import { SlideCanvas } from "@/components/carousel/SlideCanvas";
import { DESIGNS, getDesign, type CarouselSlide } from "@/lib/carousel/design";
import { slideDims, type SlideSize } from "@/lib/carousel/size";

const SIZE: SlideSize = "square";

/**
 * The hero's proof: a real carousel, rendered by the same component the product
 * exports from, cycling through the actual design catalog.
 *
 * The landing used to show a GIF — a recording of a thing, which any tool can
 * fake. This is the thing itself, and it stays honest for free: add a design and
 * it appears here; break the renderer and the front page breaks with it.
 */
const SLIDE: CarouselSlide = {
  layout: "hero",
  kicker: "MY TAKE",
  headline: "Agents will eat the dashboard, not the database",
  highlight: "eat the dashboard",
  body: "Every SaaS product is a table with opinions bolted on. The opinions are the part a model can hold.",
  arrow: true,
};

/** Four of the twelve, alternating light and dark so the range is obvious.
 *  Filtered against the catalog so renaming a design can't leave a blank frame. */
const SHOWN = ["paper", "ink", "magazine", "blueprint"].filter((id) =>
  DESIGNS.some((d) => d.id === id),
);
const CYCLE = SHOWN.length ? SHOWN : DESIGNS.slice(0, 4).map((d) => d.id);

export function LandingDemo({ width = 300 }: { width?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    // Slow enough to read a slide before it changes.
    const t = setInterval(() => setI((x) => (x + 1) % CYCLE.length), 3200);
    return () => clearInterval(t);
  }, [paused]);

  const dims = slideDims(SIZE);
  const scale = width / dims.w;
  const design = getDesign(CYCLE[i]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex flex-col items-center gap-3"
    >
      <div
        className="overflow-hidden rounded-xl ring-1 ring-line shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
        style={{ width, height: dims.h * scale }}
      >
        {/* The fade lives on a wrapper, never on the scaled element: ce-fade-up
            animates `transform`, and a running animation overrides an inline
            one — which silently dropped the scale and rendered a 1080px slide
            inside a 300px frame, i.e. a blank cream rectangle. */}
        <div key={CYCLE[i]} className="ce-fade-up">
          <div
            style={{ width: dims.w, height: dims.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <SlideCanvas slide={SLIDE} design={design} index={0} total={7} handle="@you" size={SIZE} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        {CYCLE.map((id, n) => (
          <button
            key={id}
            onClick={() => setI(n)}
            aria-label={`Show ${id} style`}
            className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}
