/**
 * Deterministic carousel skeleton from a committed thesis — the no-LLM / no-key
 * fallback so the Studio is never empty. Mirrors the Expressor arc in the new
 * CarouselSlide model.
 */
import type { Thesis } from "../types";
import type { CarouselSlide } from "./design";

export function thesisToCarousel(thesis: Thesis, handle = "@you"): CarouselSlide[] {
  const syn = thesis.synthesis;
  const slides: CarouselSlide[] = [
    { layout: "hero", kicker: thesis.topic, headline: thesis.statement },
  ];
  if (syn?.happened)
    slides.push({ layout: "explainer", kicker: "What happened", headline: "The context", body: syn.happened });
  if (thesis.evidenceFor)
    slides.push({ layout: "explainer", kicker: "Why I think so", headline: "My case", body: thesis.evidenceFor });
  if (thesis.steelman)
    slides.push({
      layout: "explainer",
      kicker: "The strongest counter",
      headline: "Consensus vs. my take",
      module: {
        type: "comparison",
        left: { title: "The counter", items: [thesis.steelman] },
        right: { title: "My take", items: [thesis.statement] },
      },
    });
  if (thesis.changeMyMind)
    slides.push({ layout: "explainer", kicker: "What would change my mind", headline: "I'd update if…", body: thesis.changeMyMind });
  slides.push({ layout: "cta", headline: "Takes that survive scrutiny.", body: handle });
  return slides;
}
