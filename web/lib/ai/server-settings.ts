import type { Provider, Settings, Tier } from "../types";
import { modelReady } from "./model";

const TIERS: Tier[] = ["speed", "balanced", "deep"];

/** The concrete provider + model each step will actually run on. */
export interface ResolvedSettings {
  provider: Provider;
  model?: string;
  adversaryProvider?: Provider;
  adversaryModel?: string;
}

/**
 * What each tier means per provider. Kept beside `modelReady` rather than in the
 * client bundle: the mapping is only meaningful for providers this deployment
 * can actually reach.
 */
const TIER_MODELS: Record<Provider, Record<Tier, string>> = {
  openai: { speed: "gpt-5-mini", balanced: "gpt-5.5", deep: "gpt-5.5" },
  google: { speed: "gemini-2.5-flash", balanced: "gemini-flash-latest", deep: "gemini-2.5-pro" },
  anthropic: { speed: "claude-haiku-4-5", balanced: "claude-sonnet-4-6", deep: "claude-opus-4-8" },
  ollama: { speed: "mistral", balanced: "llama3.1", deep: "llama3.1" },
};

/** Preference order when several providers are configured. */
const PREFERENCE: Provider[] = ["openai", "google", "anthropic", "ollama"];

/** Providers this deployment can actually reach right now. */
export function availableProviders(): Provider[] {
  return PREFERENCE.filter((p) => modelReady({ provider: p }));
}

/**
 * Turn the browser's tier into a provider and model.
 *
 * The request body is untrusted, so nothing is taken from it but the tier — an
 * unrecognised value falls back to balanced. Choosing the provider here, from
 * what the server can reach, is what makes it impossible to select a provider
 * with no key: the client never names one.
 */
export function resolveServerSettings(s: Settings | undefined): ResolvedSettings {
  const raw = (s ?? {}) as Partial<Settings>;
  const tier: Tier = TIERS.includes(raw.tier as Tier) ? (raw.tier as Tier) : "balanced";
  const provider = availableProviders()[0] ?? "openai";
  const models = TIER_MODELS[provider];

  return {
    provider,
    model: models[tier],
    // Deep buys its extra latency where reasoning actually pays: the
    // back-and-forth that pressure-tests your take.
    ...(tier === "deep" ? { adversaryProvider: provider, adversaryModel: models.deep } : {}),
  };
}
