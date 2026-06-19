/**
 * The Expressor's structured-output contract + normalizer. The LLM emits a
 * FLAT per-slide shape (robust with strict structured output); we normalize it
 * into the rich CarouselSlide model the renderer consumes. Numeric modules are
 * dropped unless the model actually supplied data (anti-fabrication).
 */
import { z } from "zod";
import { MODULE_TYPES, type CarouselSlide, type ChartTone, type SlideModule } from "./design";

const Tone = z.enum(["brand", "good", "bad", "neutral"]);
const NoteTone = z.enum(["good", "bad", "neutral"]);

export const ModuleSchema = z
  .object({
    type: z.enum(MODULE_TYPES).optional(),
    caption: z.string().optional(),
    heading: z.string().optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    label: z.string().optional(),
    value: z.string().optional(), // bigStat ("2x", "40%")
    percent: z.number().optional(), // donut 0-100
    tone: Tone.optional(),
    bars: z.array(z.object({ label: z.string(), value: z.number(), display: z.string().optional(), tone: Tone.optional() })).optional(),
    statRows: z.array(z.object({ label: z.string(), value: z.string(), pct: z.number(), tone: NoteTone.optional(), segments: z.array(z.string()).optional() })).optional(),
    kvRows: z.array(z.object({ key: z.string(), value: z.string(), pill: z.string().optional() })).optional(),
    points: z.array(z.number()).optional(),
    labels: z.array(z.string()).optional(),
    steps: z.array(z.object({ label: z.string(), sub: z.string().optional(), slug: z.string().optional() })).optional(),
    left: z.object({ title: z.string(), items: z.array(z.string()) }).optional(),
    right: z.object({ title: z.string(), items: z.array(z.string()) }).optional(),
  });

export const SlideSchema = z.object({
  layout: z.enum(["hero", "explainer", "statement", "cta"]).optional(),
  kicker: z.string().optional(),
  headline: z.string(),
  highlight: z.string().optional(),
  highlightTone: z.enum(["yellow", "pink"]).optional(),
  underline: z.string().optional(),
  body: z.string().optional(),
  brandName: z.string().optional(),
  brandSlug: z.string().optional(),
  module: ModuleSchema.optional(),
});

export const CarouselSchema = z.object({
  /** Chosen narrative format id (see lib/carousel/formats.ts). */
  format: z.string().optional(),
  /** Chosen style/design id that fits the topic (see lib/carousel/design.ts). */
  designId: z.string().optional(),
  slides: z.array(SlideSchema).min(4).max(9),
});

export type RawSlide = z.infer<typeof SlideSchema>;
type RawMod = z.infer<typeof ModuleSchema>;

function noteTone(t?: ChartTone): "good" | "bad" | "neutral" | undefined {
  if (t === "good" || t === "bad") return t;
  return t === "neutral" ? "neutral" : undefined;
}

export function normalizeModule(m?: RawMod): SlideModule | undefined {
  if (!m || !m.type) return undefined;
  switch (m.type) {
    case "callout":
      return m.title || m.body ? { type: "callout", title: m.title ?? "", body: m.body, tone: noteTone(m.tone) } : undefined;
    case "comparison":
      return m.left && m.right ? { type: "comparison", left: m.left, right: m.right } : undefined;
    case "keyValue":
      return m.kvRows?.length ? { type: "keyValue", heading: m.heading, rows: m.kvRows, caption: m.caption } : undefined;
    case "timeline":
      return m.steps?.length ? { type: "timeline", steps: m.steps.map((s) => ({ label: s.label, sub: s.sub })) } : undefined;
    case "iconFlow":
      return m.steps?.length ? { type: "iconFlow", steps: m.steps.map((s) => ({ label: s.label, slug: s.slug })) } : undefined;
    case "statBars":
      return m.statRows?.length ? { type: "statBars", caption: m.caption, rows: m.statRows } : undefined;
    case "barChart":
      return m.bars?.length ? { type: "barChart", caption: m.caption, bars: m.bars } : undefined;
    case "lineChart":
      return m.points?.length ? { type: "lineChart", caption: m.caption, labels: m.labels, series: [{ points: m.points }] } : undefined;
    case "donut":
      return typeof m.percent === "number" ? { type: "donut", value: m.percent, label: m.label ?? m.title ?? "", caption: m.caption } : undefined;
    case "bigStat":
      return m.value ? { type: "bigStat", value: m.value, label: m.label ?? m.title ?? "" } : undefined;
    default:
      return undefined;
  }
}

export function normalizeSlide(r: RawSlide): CarouselSlide {
  return {
    layout: r.layout,
    kicker: r.kicker,
    headline: r.headline,
    highlight: r.highlight,
    highlightTone: r.highlightTone,
    underline: r.underline,
    body: r.body,
    brand: r.brandName ? { name: r.brandName, slug: r.brandSlug } : undefined,
    module: normalizeModule(r.module),
  };
}
