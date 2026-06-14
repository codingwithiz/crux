import type { CarouselTheme, Slide, SlideKind, Thesis } from "./types";

export const THEMES: CarouselTheme[] = [
  { id: "ink", name: "Ink & Gold", bg: "#0a0b0e", bg2: "#171922", panel: "#14151b", fg: "#f3f4f6", muted: "#9499a6", accent: "#f4b740", accentFg: "#1a1206" },
  { id: "paper", name: "Paper", bg: "#f4f1ea", bg2: "#fbfaf6", panel: "#ffffff", fg: "#181512", muted: "#6b665d", accent: "#c0392b", accentFg: "#ffffff" },
  { id: "signal", name: "Signal", bg: "#0b1220", bg2: "#15233f", panel: "#111a2e", fg: "#eaf0ff", muted: "#8aa2ff", accent: "#5eead4", accentFg: "#04261f" },
  { id: "dusk", name: "Dusk", bg: "#140d22", bg2: "#2a1745", panel: "#1d1235", fg: "#f1ecff", muted: "#b3a3d4", accent: "#a78bfa", accentFg: "#160a2e" },
  { id: "mono", name: "Mono", bg: "#0c0c0d", bg2: "#171718", panel: "#161617", fg: "#fafafa", muted: "#8a8a8f", accent: "#fafafa", accentFg: "#0c0c0d" },
];

export function getTheme(id: string): CarouselTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

const KICKERS: Record<SlideKind, string> = {
  hook: "THE TAKE",
  context: "WHAT HAPPENED",
  conventional: "THE CONSENSUS",
  argument: "WHY I THINK SO",
  counter: "THE STRONGEST COUNTER",
  sowhat: "SO WHAT",
  cta: "WRAP-UP",
};

/** Build a default carousel skeleton from a committed thesis. */
export function thesisToSlides(t: Thesis, handle = "@you"): Slide[] {
  const slides: Slide[] = [
    { kind: "hook", kicker: KICKERS.hook, title: t.statement, body: t.topic },
  ];
  if (t.source?.title)
    slides.push({ kind: "context", kicker: KICKERS.context, title: t.source.title, body: "" });
  if (t.evidenceFor)
    slides.push({ kind: "argument", kicker: KICKERS.argument, title: "", body: t.evidenceFor });
  if (t.steelman)
    slides.push({ kind: "counter", kicker: KICKERS.counter, title: "", body: t.steelman });
  if (t.changeMyMind)
    slides.push({ kind: "sowhat", kicker: "WHAT WOULD CHANGE MY MIND", title: "", body: t.changeMyMind });
  slides.push({ kind: "cta", kicker: KICKERS.cta, title: "Takes that survive scrutiny.", body: handle });
  return slides;
}

export interface SlidePayload {
  slide: Slide;
  themeId: string;
  index: number;
  total: number;
  handle: string;
}

/** Browser-safe URL for the /api/slide PNG route (no Buffer). */
export function slideSrc(p: SlidePayload): string {
  return `/api/slide?d=${encodeURIComponent(JSON.stringify(p))}`;
}
