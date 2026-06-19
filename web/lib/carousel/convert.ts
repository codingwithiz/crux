/**
 * Back-compat: coerce persisted slide data into the new CarouselSlide model.
 * Old carousels (and old drafts) stored the legacy `Slide` shape (kind/title/
 * body/...); map them so saved work still opens after the engine rebuild.
 */
import type { CarouselSlide, SlideLayout } from "./design";

interface LegacySlide {
  kind?: string;
  kicker?: string;
  title?: string;
  body?: string;
}

function legacyLayout(kind?: string): SlideLayout {
  if (kind === "hook") return "hero";
  if (kind === "cta") return "cta";
  return "explainer";
}

function isNew(s: unknown): s is CarouselSlide {
  return !!s && typeof s === "object" && "headline" in s;
}

/** Accept either new CarouselSlides or legacy Slides; always return new ones. */
export function coerceSlides(raw: unknown[]): CarouselSlide[] {
  return (raw ?? []).map((s) => {
    if (isNew(s)) return s;
    const l = s as LegacySlide;
    return {
      layout: legacyLayout(l.kind),
      kicker: l.kicker,
      headline: (l.title || l.body || "").trim(),
      body: l.title ? l.body : undefined,
    } satisfies CarouselSlide;
  });
}
