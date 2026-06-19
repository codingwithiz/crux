import { getSettings } from "./settings";
import { getVoice, effectiveVoice } from "./voice";
import { thesisToCarousel } from "./carousel/fallback";
import type { CarouselSlide, SlideModule } from "./carousel/design";
import type { Thesis } from "./types";

/**
 * Fill one visual module with concrete, slide-specific data via the LLM (used
 * when switching a slide's module in the Studio). Returns null on any failure so
 * the caller can fall back to the instant heuristic.
 */
export async function fillModule(slide: CarouselSlide, type: string): Promise<SlideModule | null> {
  try {
    const res = await fetch("/api/module", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: slide.headline, body: slide.body, kicker: slide.kicker, type, settings: getSettings() }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { module?: SlideModule };
    return j.module ?? null;
  } catch {
    return null;
  }
}

/**
 * Turn a committed thesis into carousel slides via the Expressor (the LLM picks
 * a visual module + brand per slide), tuned by the user's saved voice and
 * grounded in the thesis's synthesis. Falls back to a deterministic skeleton
 * when there's no model key or the call fails — so it never blocks.
 */
export async function expressSlides(
  thesis: Thesis,
  handle = "@you",
): Promise<{ slides: CarouselSlide[]; designId?: string }> {
  let slides = thesisToCarousel(thesis, handle);
  let designId: string | undefined;
  try {
    const voice = effectiveVoice(await getVoice());
    const res = await fetch("/api/express", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thesis, synthesis: thesis.synthesis, settings: getSettings(), voice }),
    });
    if (res.ok) {
      const j = (await res.json()) as { slides?: CarouselSlide[]; designId?: string };
      if (Array.isArray(j.slides) && j.slides.length) slides = j.slides;
      designId = j.designId;
    }
  } catch {
    /* keep the deterministic fallback */
  }
  return { slides, designId };
}
