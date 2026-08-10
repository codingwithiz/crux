import type { CarouselSlide } from "./carousel/design";
import type { Synthesis, Thesis } from "./types";

const KEY = "ce.draft";

/**
 * What the deck was made from.
 *
 * The Studio only ever received finished slides, so it could restyle and reword
 * them but could never ask for a genuinely different deck — there was nothing
 * left to generate from. Carrying the source material through the handoff is
 * what makes "try another version" possible. Absent for decks reopened from the
 * Library, which is why that button is conditional rather than always shown.
 */
export interface DraftContext {
  mode: "express" | "explain";
  thesis?: Thesis;
  synthesis?: Synthesis;
  sourceTitle?: string;
  /** The format this deck used, so a variant can deliberately pick another. */
  format?: string;
}

export interface Draft {
  slides: CarouselSlide[];
  handle: string;
  designId?: string;
  context?: DraftContext;
}

/** Hand a carousel draft from the conviction flow to the Studio (client-only). */
export function saveDraft(d: Draft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
