/**
 * How big a slide is.
 *
 * Every surface used to hardcode 1080×1350 — the canvas, the Studio preview, the
 * thumbnails, the gallery, the PNG export and the PDF page — so the deck shape
 * was a constant scattered across seven files rather than a choice.
 *
 * Both shapes are legitimate. Square is the safe universal: Instagram, LinkedIn
 * documents and X all take it without cropping. Portrait 4:5 is the taller of
 * the two aspect ratios Instagram allows, so it occupies more of the feed —
 * which is why most carousel accounts use it. Square is the default because it
 * is the one that is never wrong.
 */
export type SlideSize = "square" | "portrait";

export const SLIDE_SIZES: Record<SlideSize, { w: number; h: number; label: string; hint: string }> = {
  square: { w: 1080, h: 1080, label: "Square", hint: "1:1 — safe everywhere" },
  portrait: { w: 1080, h: 1350, label: "Portrait", hint: "4:5 — taller in the Instagram feed" },
};

export const DEFAULT_SLIDE_SIZE: SlideSize = "square";

/** Tolerates an absent or unknown value from stored decks. */
export function slideDims(size: SlideSize | undefined) {
  return SLIDE_SIZES[size ?? DEFAULT_SLIDE_SIZE] ?? SLIDE_SIZES[DEFAULT_SLIDE_SIZE];
}
