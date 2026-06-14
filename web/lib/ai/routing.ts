import type { Settings } from "../types";
import type { ModelSettings } from "./model";

export type Step = "synthesize" | "adversary" | "express";

/**
 * Per-step model routing. The Adversary (the reasoning-critical step) can use a
 * stronger model (e.g. Claude Opus 4.8) when configured; synthesis and express
 * stay on the default free/cheap model. Pure function — safe on client + server.
 */
export function stepModelSettings(s: Settings | undefined, step: Step): ModelSettings {
  if (!s) return {};

  if (step === "adversary" && s.adversaryProvider) {
    const ready = s.adversaryProvider === "ollama" || Boolean(s.adversaryApiKey);
    if (ready) {
      return {
        provider: s.adversaryProvider,
        apiKey: s.adversaryApiKey,
        model: s.adversaryModel,
        ollamaBaseURL: s.ollamaBaseURL,
      };
    }
  }

  return {
    provider: s.provider,
    apiKey: s.apiKey,
    model: s.model,
    ollamaBaseURL: s.ollamaBaseURL,
  };
}
