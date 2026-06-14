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
  source: "hf" | "hn" | "github";
  title: string;
  url: string;
  meta?: string;
  detail?: string;
  score: number;
}

export interface CarouselTheme {
  id: string;
  name: string;
  bg: string;
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
}
