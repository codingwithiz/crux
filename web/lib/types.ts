import type { CarouselSlide } from "./carousel/design";

export type Provider = "google" | "anthropic" | "openai" | "ollama";

/**
 * Per-request model preferences. Chosen in the browser and sent with each call,
 * so this carries preferences ONLY — never credentials or endpoints. Keys come
 * from server env, and the Ollama base URL from OLLAMA_BASE_URL: both would be
 * server-side request forgery if the client could set them.
 */
export interface Settings {
  provider: Provider;
  model?: string;
  // Optional premium override for the Adversary (the reasoning-critical step).
  adversaryProvider?: Provider;
  adversaryModel?: string;
  /** When set, pins this carousel design for all carousels (brand-lock). */
  brandLockDesignId?: string;
}

export interface SourceRef {
  title: string;
  url?: string;
}

/**
 * A quote the synthesis leaned on, with the receipt attached. `verified` is a
 * deterministic substring check against the source text — not the model's word.
 */
export interface Citation {
  quote: string;
  url?: string;
  sourceTitle?: string;
  verified: boolean;
}

/** Output of the Synthesizer (grounded, citation-aware). */
export interface Synthesis {
  /** A 2-3 sentence plain-English ELI5 of the item — the lead "explain it simply" card. */
  plainEnglish?: string;
  happened: string;
  newVsRepackaged: string;
  keyDebate: string;
  skepticCase: string;
  implications: string[];
  questions: string[];
  /**
   * Short verbatim quotes from the source the synthesis relied on ("receipts").
   * Strings are the legacy shape, still readable from theses committed before
   * citations carried verification.
   */
  citations?: (Citation | string)[];
  /** True when synthesis was grounded in real source text, not just the model's memory. */
  grounded?: boolean;
  /** What was synthesized, so a carousel built later can cite the same source. */
  source?: SourceRef;
}

export type Confidence = "low" | "med" | "high";

/** How a committed thesis turned out, once reality has weighed in (for calibration). */
export type Outcome = "held" | "mixed" | "broke";

/** A committed opinion in the Thesis Ledger (the compounding moat). */
export interface Thesis {
  id: string;
  topic: string;
  statement: string;
  confidence: Confidence;
  evidenceFor?: string;
  steelman?: string;
  changeMyMind?: string;
  /** The synthesis that grounded this thesis — lets the carousel cite what happened. */
  synthesis?: Synthesis;
  createdAt: string; // ISO
  updatedAt?: string; // ISO, set when revised
  source?: SourceRef;
  /**
   * "draft" is a parked synthesis — understanding saved without an opinion, so
   * reading something worth thinking about doesn't force a take on the spot.
   * Drafts carry an empty `statement` and are excluded from the ledger's
   * calibration surfaces.
   */
  status: "active" | "updated" | "abandoned" | "draft";
  /** Resolved outcome — how the call turned out (drives calibration scoring). */
  outcome?: Outcome;
  resolvedAt?: string; // ISO, set when an outcome is recorded
}

export type SlideKind =
  | "hook"
  | "context"
  | "conventional"
  | "argument"
  | "counter"
  | "sowhat"
  | "cta";

/** Visual layout for a slide — the bold/punchy template gallery. */
export type SlideLayout = "statement" | "stat" | "quote" | "list" | "split";

export interface Slide {
  kind: SlideKind;
  kicker: string;
  title: string;
  body: string;
  /** Chosen template layout; defaults from `kind` when absent (back-compat). */
  layout?: SlideLayout;
  /** For the "list" layout — short bullet points. */
  bullets?: string[];
  /** For the "stat" layout — a big number + its label. */
  stat?: { value: string; label: string };
  /** A topic icon: an emoji (hook/CTA) or a line-icon keyword (content slides). */
  icon?: string;
  /** Optional source credit shown on the slide (e.g. "arXiv · Attention…"). */
  source?: string;
}

export type NewsSource = "hf" | "hn" | "github" | "reddit" | "lobsters" | "arxiv" | "news";

export interface NewsItem {
  id: string;
  source: NewsSource;
  title: string;
  url: string;
  meta?: string;
  detail?: string;
  score: number;
}

/** A Curator pick — a news item the agent selected as worth forming an opinion on. */
export interface BriefPick extends NewsItem {
  whyItMatters: string;
  relevance: string;
}

/**
 * The user's writing voice — the moat. A small corpus of their real posts plus
 * a distilled style guide, used to tune the Expressor so carousels sound like
 * THEM, not generic AI. Stored per-user (cloud) or in localStorage.
 */
export interface VoiceProfile {
  /** Raw writing samples (the user's own posts). */
  samples: string[];
  /** A compact, distilled style guide (hand-written default or AI-derived). */
  guide?: string;
  /** Optional freeform tone knob, e.g. "energetic, concrete, humble-confident". */
  tone?: string;
  /** Whether the Expressor may use emojis (the user's posts use them tastefully). */
  emoji: boolean;
  /**
   * Topics you want surfaced, in your own words. Feed ranking blends popularity
   * with overlap against your committed theses — on day one you have none, so
   * these give that half of the signal something to work with.
   */
  interests: string[];
  updatedAt: string;
}

export interface CarouselTheme {
  id: string;
  name: string;
  bg: string;
  /** Gradient end colour for the slide background (falls back to `bg`). */
  bg2?: string;
  panel: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
}

export interface Carousel {
  id: string;
  title: string;
  slides: CarouselSlide[];
  /** Base design id (paper/dusk/ink) — persisted in the carousels.theme_id column. */
  designId: string;
  handle: string;
  createdAt: string;
  /** Public URLs of the rendered PNGs in Supabase Storage (signed-in users). */
  imageUrls?: string[];
}
