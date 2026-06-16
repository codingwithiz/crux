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

/** A short "where it's from" label for the source credit (domain, else a short title). */
export function sourceLabel(t: Pick<Thesis, "source">): string | undefined {
  const src = t.source;
  if (!src) return undefined;
  if (src.url) {
    try {
      return new URL(src.url).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  return src.title ? src.title.slice(0, 40) : undefined;
}

/** Build a default carousel skeleton from a committed thesis (with layouts + icons). */
export function thesisToSlides(t: Thesis, handle = "@you"): Slide[] {
  const src = sourceLabel(t);
  const slides: Slide[] = [
    { kind: "hook", kicker: KICKERS.hook, title: t.statement, body: t.topic, layout: "quote", icon: "💡", source: src },
  ];
  if (t.source?.title)
    slides.push({ kind: "context", kicker: KICKERS.context, title: t.source.title, body: "", layout: "statement", icon: "globe" });
  if (t.evidenceFor)
    slides.push({ kind: "argument", kicker: KICKERS.argument, title: "", body: t.evidenceFor, layout: "statement", icon: "bulb" });
  if (t.steelman)
    slides.push({ kind: "counter", kicker: KICKERS.counter, title: "The strongest counter", body: t.steelman, layout: "split", icon: "scale" });
  if (t.changeMyMind)
    slides.push({ kind: "sowhat", kicker: "WHAT WOULD CHANGE MY MIND", title: "", body: t.changeMyMind, layout: "statement", icon: "trend" });
  slides.push({ kind: "cta", kicker: KICKERS.cta, title: "Takes that survive scrutiny.", body: handle, layout: "statement", icon: "🚀" });
  return slides;
}

/**
 * Build a ready-to-post caption from the carousel — deterministic, no LLM, no
 * cost. The human still posts (no auto-publish — that's the slop trap); this
 * just removes the last bit of busywork between a committed take and a post.
 */
export function buildCaption(slides: Slide[], handle = "@you"): string {
  const hook = slides.find((s) => s.kind === "hook");
  const opener = (hook?.title || slides[0]?.title || slides[0]?.body || "").trim();

  const points = slides
    .filter((s) => ["argument", "counter", "sowhat", "conventional"].includes(s.kind))
    .map((s) => (s.title || s.body).trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => `• ${p}`);

  const tags = "#AI #GenAI #BuildInPublic";
  return [opener, points.length ? points.join("\n") : "", "My full take 👇 swipe through.", `${handle} · ${tags}`]
    .filter(Boolean)
    .join("\n\n");
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
