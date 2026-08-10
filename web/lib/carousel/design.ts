/**
 * The world-class carousel design system. A small set of cohesive "designs"
 * (color world + semantic palette) plus the rich slide / visual-module model.
 *
 * Aesthetic target: @itsnextwork — warm editorial paper, oversized serif
 * headlines, clean sans body, mono for code/data; semantic red/green data
 * modules; marker highlights, squiggle underlines, hand-drawn arrows, corner
 * doodles; real brand logos. Rendered as real HTML/CSS (no Satori) and exported
 * client-side via modern-screenshot, so the on-screen preview IS the PNG.
 */

export type DesignMode = "light" | "dark";

export interface CarouselDesign {
  id: string;
  name: string;
  mode: DesignMode;
  /** Base background + gradient end. */
  bg: string;
  bg2: string;
  /** Grain overlay strength (0 = none). */
  grain: number;
  /** Headline + body text. */
  fg: string;
  muted: string;
  /** Brand-driven accent (resolved per carousel by applyBrand). */
  accent: string;
  accentFg: string;
  /** Card surface + hairline. */
  card: string;
  cardBorder: string;
  /** Semantic data colors. */
  good: string;
  goodSoft: string;
  bad: string;
  badSoft: string;
  /** Marker-highlight swatches. */
  markerYellow: string;
  markerPink: string;
  /** Headline type personality: serif (default), sans, or mono. */
  headingFont?: "serif" | "sans" | "mono";
}

export const DESIGNS: CarouselDesign[] = [
  {
    id: "paper",
    name: "Editorial Paper",
    mode: "light",
    bg: "#f4f0e8",
    bg2: "#fbf9f3",
    grain: 0.5,
    fg: "#1b1714",
    muted: "#736c61",
    accent: "#c0392b",
    accentFg: "#ffffff",
    card: "#ffffff",
    cardBorder: "rgba(27,23,20,0.10)",
    good: "#2f8a5b",
    goodSoft: "#e3f0e7",
    bad: "#c0563e",
    badSoft: "#f6e2db",
    markerYellow: "#fbe36b",
    markerPink: "#f4c9c2",
  },
  {
    id: "dusk",
    name: "Atmospheric Dusk",
    mode: "dark",
    bg: "#18242b",
    bg2: "#0e171d",
    grain: 0.35,
    fg: "#f5f1e8",
    muted: "#9fb1b6",
    accent: "#e8b04b",
    accentFg: "#1a1206",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.14)",
    good: "#5fb98a",
    goodSoft: "rgba(95,185,138,0.16)",
    bad: "#e08a6b",
    badSoft: "rgba(224,138,107,0.16)",
    markerYellow: "#e8b04b",
    markerPink: "#e08a6b",
  },
  {
    id: "ink",
    name: "Ink",
    mode: "dark",
    bg: "#0c0d11",
    bg2: "#161922",
    grain: 0.25,
    fg: "#f3f4f6",
    muted: "#9499a6",
    accent: "#f4b740",
    accentFg: "#1a1206",
    card: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.12)",
    good: "#5eead4",
    goodSoft: "rgba(94,234,212,0.15)",
    bad: "#fb7185",
    badSoft: "rgba(251,113,133,0.15)",
    markerYellow: "#f4b740",
    markerPink: "#fb7185",
  },
  {
    id: "product", name: "Clean Product", mode: "light", headingFont: "sans",
    bg: "#ffffff", bg2: "#f6f7f9", grain: 0.25, fg: "#0b0d12", muted: "#5b6472",
    accent: "#4f46e5", accentFg: "#ffffff", card: "#ffffff", cardBorder: "rgba(11,13,18,0.08)",
    good: "#16a34a", goodSoft: "#e7f6ec", bad: "#dc2626", badSoft: "#fdeaea",
    markerYellow: "#fde68a", markerPink: "#fbcfe8",
  },
  {
    id: "brutalist", name: "Brutalist", mode: "light", headingFont: "sans",
    bg: "#f4f3ee", bg2: "#ffffff", grain: 0.2, fg: "#0a0a0a", muted: "#555555",
    accent: "#ff4d00", accentFg: "#ffffff", card: "#ffffff", cardBorder: "rgba(10,10,10,0.85)",
    good: "#1f7a3d", goodSoft: "#e3f0e7", bad: "#c0392b", badSoft: "#f6e2db",
    markerYellow: "#ffe600", markerPink: "#ff9ec7",
  },
  {
    id: "pastel", name: "Soft Pastel", mode: "light", headingFont: "serif",
    bg: "#f6f0fb", bg2: "#fdf6f0", grain: 0.3, fg: "#2a2433", muted: "#7a7088",
    accent: "#a855f7", accentFg: "#ffffff", card: "#ffffff", cardBorder: "rgba(42,36,51,0.08)",
    good: "#2f9e6e", goodSoft: "#e6f5ee", bad: "#e0697a", badSoft: "#fbe7ea",
    markerYellow: "#fce7a0", markerPink: "#f6c9e0",
  },
  {
    id: "magazine", name: "Magazine", mode: "light", headingFont: "serif",
    bg: "#faf6ef", bg2: "#fffdf8", grain: 0.4, fg: "#1a1208", muted: "#6b5d48",
    accent: "#b91c1c", accentFg: "#ffffff", card: "#ffffff", cardBorder: "rgba(26,18,8,0.1)",
    good: "#2f8a5b", goodSoft: "#e3f0e7", bad: "#b91c1c", badSoft: "#f6e2db",
    markerYellow: "#fbe36b", markerPink: "#f4c9c2",
  },
  {
    id: "blueprint", name: "Blueprint", mode: "dark", headingFont: "mono",
    bg: "#0b1f3a", bg2: "#0a1830", grain: 0.3, fg: "#e6f0ff", muted: "#8fb0d9",
    accent: "#38bdf8", accentFg: "#04293f", card: "rgba(255,255,255,0.05)", cardBorder: "rgba(120,180,255,0.25)",
    good: "#34d399", goodSoft: "rgba(52,211,153,0.15)", bad: "#fb7185", badSoft: "rgba(251,113,133,0.15)",
    markerYellow: "#38bdf8", markerPink: "#fb7185",
  },
  {
    id: "terminal", name: "Terminal", mode: "dark", headingFont: "mono",
    bg: "#0a0e0a", bg2: "#0e140e", grain: 0.25, fg: "#d7ffd9", muted: "#6b8f6f",
    accent: "#22c55e", accentFg: "#04140a", card: "rgba(255,255,255,0.04)", cardBorder: "rgba(80,200,120,0.25)",
    good: "#22c55e", goodSoft: "rgba(34,197,94,0.15)", bad: "#ff6b6b", badSoft: "rgba(255,107,107,0.15)",
    markerYellow: "#22c55e", markerPink: "#ff6b6b",
  },
  {
    id: "mesh", name: "Aurora Mesh", mode: "dark", headingFont: "sans",
    bg: "#1a1033", bg2: "#2a1259", grain: 0.3, fg: "#f3ecff", muted: "#b3a3d4",
    accent: "#ec4899", accentFg: "#ffffff", card: "rgba(255,255,255,0.06)", cardBorder: "rgba(255,255,255,0.14)",
    good: "#34d399", goodSoft: "rgba(52,211,153,0.16)", bad: "#fb7185", badSoft: "rgba(251,113,133,0.16)",
    markerYellow: "#f5d76e", markerPink: "#ec4899",
  },
  {
    id: "neon", name: "Neon Night", mode: "dark", headingFont: "sans",
    bg: "#060608", bg2: "#0d0d12", grain: 0.25, fg: "#eafcff", muted: "#7f8a99",
    accent: "#00e5ff", accentFg: "#042027", card: "rgba(255,255,255,0.05)", cardBorder: "rgba(0,229,255,0.25)",
    good: "#34d399", goodSoft: "rgba(52,211,153,0.15)", bad: "#ff3b6b", badSoft: "rgba(255,59,107,0.15)",
    markerYellow: "#00e5ff", markerPink: "#ff3b6b",
  },
  {
    id: "slate", name: "Slate Dark", mode: "dark", headingFont: "sans",
    bg: "#0b0d12", bg2: "#14171f", grain: 0.2, fg: "#f3f5f9", muted: "#98a2b3",
    accent: "#7c93ff", accentFg: "#0b0d12", card: "rgba(255,255,255,0.05)", cardBorder: "rgba(255,255,255,0.12)",
    good: "#4ade80", goodSoft: "rgba(74,222,128,0.15)", bad: "#fb7185", badSoft: "rgba(251,113,133,0.15)",
    markerYellow: "#fbbf24", markerPink: "#fb7185",
  },
];

export function getDesign(id: string): CarouselDesign {
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
}

// ─── Slide + visual-module model ───────────────────────────────────────────

/** A labelled, optionally-segmented bar (Redis "disk vs memory" comparison). */
export interface StatBarRow {
  label: string;
  /** Right-side value, e.g. "~10 ms". */
  value: string;
  /** Bar fill 0–100. */
  pct: number;
  tone?: "good" | "bad" | "neutral";
  /** Optional inline segments rendered inside the bar (e.g. disk lookup | parse | lock). */
  segments?: string[];
}

/** Element tone — "brand" rides the per-topic accent; good/bad are semantic. */
export type ChartTone = "brand" | "good" | "bad" | "neutral";

/**
 * The visualization library — the set of concrete visual modules the Expressor
 * can choose per slide (one chart/diagram per slide, @itsnextwork-style).
 * comparison/sequence/proportion/trend/relational are all covered.
 */
export type SlideModule =
  // data + comparison
  | { type: "statBars"; caption?: string; rows: StatBarRow[]; note?: { title: string; body?: string; tone?: "good" | "bad" } }
  | { type: "barChart"; caption?: string; max?: number; bars: { label: string; value: number; display?: string; tone?: ChartTone }[] }
  | { type: "lineChart"; caption?: string; labels?: string[]; series: { points: number[]; tone?: ChartTone }[] }
  | { type: "donut"; caption?: string; value: number; label: string; tone?: ChartTone }
  | { type: "bigStat"; value: string; label: string }
  // structure + sequence
  | { type: "timeline"; steps: { label: string; sub?: string }[] }
  | { type: "iconFlow"; steps: { label: string; slug?: string }[] }
  | { type: "comparison"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  // code / data shape
  | { type: "keyValue"; heading?: string; rows: { key: string; value: string; pill?: string }[]; caption?: string }
  // emphasis
  | { type: "callout"; title: string; body?: string; tone?: "good" | "bad" | "neutral" };

/** Every module the engine can render — handy for the Studio picker + LLM enum. */
export const MODULE_TYPES = [
  "statBars",
  "barChart",
  "lineChart",
  "donut",
  "bigStat",
  "timeline",
  "iconFlow",
  "comparison",
  "keyValue",
  "callout",
] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export type SlideLayout = "hero" | "explainer" | "statement" | "cta";

export interface BrandRef {
  /** Display name, e.g. "Redis". */
  name: string;
  /** simple-icons slug for the logo, e.g. "redis". */
  slug?: string;
  /** Optional brand hex override. */
  hex?: string;
}

export interface CarouselSlide {
  layout?: SlideLayout;
  /** Small uppercase label (top-left chip / brand lockup caption). */
  kicker?: string;
  /** The big serif headline. */
  headline: string;
  /** A phrase inside the headline to marker-highlight. */
  highlight?: string;
  highlightTone?: "yellow" | "pink";
  /** A phrase inside the headline to squiggle-underline. */
  underline?: string;
  /** Supporting sans-serif paragraph. */
  body?: string;
  /** The concrete visual module under the text. */
  module?: SlideModule;
  /** Brand whose logo + color world this slide rides on. */
  brand?: BrandRef;
  /** Show playful corner doodles (hero slides). */
  doodles?: boolean;
  /** Show a hand-drawn swipe arrow under the headline (hero slides). */
  arrow?: boolean;
  /** Overrides the deck's style for this one slide — a cover that stands apart,
   *  or a single quote in a different world. Unset means "follow the deck".
   *  Persists free: slides are already stored as jsonb. */
  designId?: string;
}
