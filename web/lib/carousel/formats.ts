/**
 * Narrative formats — the storytelling templates the Expressor chooses from so
 * carousels don't all follow the same arc. Each format is a beat structure the
 * LLM fills with the user's grounded thesis. The LLM picks the ONE that best
 * fits the topic.
 */
export interface CarouselFormat {
  id: string;
  name: string;
  /** The slide-by-slide beat structure (guidance for the Expressor). */
  beats: string;
}

export const FORMATS: CarouselFormat[] = [
  { id: "argument", name: "Conviction arc", beats: "hook (your sharpest claim) → what actually happened → the conventional take → your argument + evidence → the strongest counter + your rebuttal → the 'so what' implication → CTA" },
  { id: "explainer", name: "How it works", beats: "hook (the question) → the simple mental model → 1-2 slides of how it works (use keyValue / timeline / iconFlow) → the surprising detail → why it matters → CTA" },
  { id: "mythVsReality", name: "Myth vs reality", beats: "hook (the common belief) → 'here's what's actually true' → the mechanism/evidence → what people get wrong (use comparison) → the better mental model → CTA" },
  { id: "levels", name: "N levels / tiers", beats: "hook ('there are N levels of X') → walk levels 1..N (use list/levels framing) → where most people stop → where the real value is → CTA" },
  { id: "beforeAfter", name: "Before vs after", beats: "hook (the shift) → the old way + its cost → the new way → a side-by-side (use comparison) → what changes for you → CTA" },
  { id: "hiddenCost", name: "The hidden cost", beats: "hook (the thing everyone loves) → the catch nobody mentions → why it happens → the real tradeoff → what to do about it → CTA" },
  { id: "contrarian", name: "Hot take", beats: "hook (a bold contrarian claim) → why the consensus exists → why it's wrong or incomplete → your evidence → the honest nuance → CTA" },
  { id: "listicle", name: "N things", beats: "hook ('N things about X') → one punchy point per slide (use callout/list) → the one that matters most → CTA" },
  { id: "timeline", name: "How we got here", beats: "hook → the key moments in order (use timeline) → the turning point → where it's heading → CTA" },
  { id: "caseStudy", name: "Case study", beats: "hook (the result, with a real number if grounded) → the situation → what was done → the mechanism → the lesson that generalizes → CTA" },
];

export const FORMAT_IDS = FORMATS.map((f) => f.id);

/** Bullet list of formats for the Expressor prompt. */
export function formatCatalog(): string {
  return FORMATS.map((f) => `- ${f.id}: ${f.name} — ${f.beats}`).join("\n");
}
