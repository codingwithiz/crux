export type Provider = "google" | "anthropic" | "openai" | "ollama";

export interface Settings {
  provider: Provider;
  apiKey?: string;
  model?: string;
  ollamaBaseURL?: string;
  // Optional premium override for the Adversary (the reasoning-critical step).
  adversaryProvider?: Provider;
  adversaryApiKey?: string;
  adversaryModel?: string;
}

export interface SourceRef {
  title: string;
  url?: string;
}

/** Output of the Synthesizer (grounded, citation-aware). */
export interface Synthesis {
  happened: string;
  newVsRepackaged: string;
  keyDebate: string;
  skepticCase: string;
  implications: string[];
  questions: string[];
}

export type Confidence = "low" | "med" | "high";

/** A committed opinion in the Thesis Ledger (the compounding moat). */
export interface Thesis {
  id: string;
  topic: string;
  statement: string;
  confidence: Confidence;
  evidenceFor?: string;
  steelman?: string;
  changeMyMind?: string;
  createdAt: string; // ISO
  source?: SourceRef;
  status: "active" | "updated" | "abandoned";
}

export type SlideKind =
  | "hook"
  | "context"
  | "conventional"
  | "argument"
  | "counter"
  | "sowhat"
  | "cta";

export interface Slide {
  kind: SlideKind;
  kicker: string;
  title: string;
  body: string;
}

export interface NewsItem {
  id: string;
  source: "hf" | "hn" | "github" | "reddit" | "lobsters";
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
  slides: Slide[];
  themeId: string;
  handle: string;
  createdAt: string;
  /** Public URLs of the rendered PNGs in Supabase Storage (signed-in users). */
  imageUrls?: string[];
}
