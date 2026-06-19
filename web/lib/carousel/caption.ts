/**
 * Build a ready-to-post caption from a carousel — deterministic, no LLM, no
 * cost. The human still posts (no auto-publish); this just removes busywork.
 */
import type { CarouselSlide } from "./design";

export function buildCaption(slides: CarouselSlide[], handle = "@you"): string {
  const opener = (slides[0]?.headline ?? "").trim();
  const points = slides
    .slice(1)
    .map((s) => (s.body || s.module?.type === "callout" ? s.body ?? (s.module as { title?: string }).title : "") || s.headline)
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => `• ${p}`);
  const tags = "#AI #GenAI #BuildInPublic";
  return [opener, points.join("\n"), "My full take 👇 swipe through.", `${handle} · ${tags}`]
    .filter(Boolean)
    .join("\n\n");
}
