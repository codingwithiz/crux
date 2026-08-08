import type { Provider, Settings } from "../types";
import type { ModelSettings } from "./model";

export type Step = "synthesize" | "adversary" | "express";

/**
 * The Adversary is a fast back-and-forth chat, so when the user hasn't picked a
 * dedicated Adversary model we default it to a snappier model than the heavy
 * default used for Synthesize/Carousel. (gpt-5.5 has a ~1.6s time-to-first-token
 * and slow streaming; gpt-5-mini is ~2.7x faster end-to-end and still incisive.)
 * Only OpenAI is remapped — Gemini's default (flash) is already fast, and other
 * providers inherit the default model.
 */
const FAST_ADVERSARY_MODEL: Partial<Record<Provider, string>> = {
  openai: "gpt-5-mini",
};

/**
 * Per-step model routing. The Adversary defaults to a fast model (see above) and
 * can be upgraded to a stronger one (e.g. Claude Opus 4.8) via the override;
 * Synthesis and Express stay on the user's default. Pure function — safe on
 * client + server.
 */
export function stepModelSettings(s: Settings | undefined, step: Step): ModelSettings {
  if (!s) return {};

  if (step === "adversary") {
    // Explicit override. getModel supplies the provider's server key.
    if (s.adversaryProvider) {
      return { provider: s.adversaryProvider, model: s.adversaryModel };
    }
    // No override: inherit the default provider but prefer a faster model for
    // this chat step (e.g. gpt-5-mini instead of gpt-5.5).
    return {
      provider: s.provider,
      model: FAST_ADVERSARY_MODEL[s.provider] ?? s.model,
    };
  }

  return { provider: s.provider, model: s.model };
}
