import { getSettings } from "./settings";
import { getVoice, effectiveVoice } from "./voice";
import { thesisToCarousel } from "./carousel/fallback";
import type { CarouselSlide, SlideModule } from "./carousel/design";
import type { Synthesis, Thesis } from "./types";

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
export interface Repurposed {
  thread: string[];
  linkedin: string;
}

/**
 * "Explain it" mode: build a NEUTRAL educational carousel from an ALREADY-computed
 * synthesis (no opinion, no commit, no voice). Falls back to a deterministic
 * skeleton if the express step fails — so it never blocks.
 */
export async function explainerFromSynthesis(
  synthesis: Synthesis,
  sourceTitle?: string,
  handle = "@you",
): Promise<{ slides: CarouselSlide[]; designId?: string }> {
  let slides = thesisToCarousel(
    {
      id: "explainer",
      topic: sourceTitle || "Explainer",
      statement: synthesis.plainEnglish || sourceTitle || "Explainer",
      confidence: "med",
      createdAt: new Date().toISOString(),
      status: "active",
    },
    handle,
  );
  let designId: string | undefined;
  try {
    const eRes = await fetch("/api/express", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "explain", synthesis, sourceTitle, settings: getSettings() }),
    });
    if (eRes.ok) {
      const j = (await eRes.json()) as { slides?: CarouselSlide[]; designId?: string };
      if (Array.isArray(j.slides) && j.slides.length) slides = j.slides;
      designId = j.designId;
    }
  } catch {
    /* keep the deterministic fallback */
  }
  return { slides, designId };
}

/**
 * Re-express a committed thesis as an X thread + a LinkedIn post (same opinion,
 * the user's voice, grounded only in the thesis). Throws on no-model/failure so
 * the caller can surface a clear message.
 */
export async function repurpose(thesis: Thesis): Promise<Repurposed> {
  const voice = effectiveVoice(await getVoice());
  const res = await fetch("/api/repurpose", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ thesis, settings: getSettings(), voice }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      j.error === "no_model" ? "No model key — add one in the Model menu (top-right)." : j.error || "Repurpose failed",
    );
  }
  return (await res.json()) as Repurposed;
}

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
