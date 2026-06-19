import type { CarouselSlide } from "./carousel/design";

const KEY = "ce.draft";

export interface Draft {
  slides: CarouselSlide[];
  handle: string;
  designId?: string;
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
