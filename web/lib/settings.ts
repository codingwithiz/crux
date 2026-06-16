import type { Provider, Settings } from "./types";

const KEY = "ce.settings";

export const DEFAULT_MODELS: Record<Provider, string> = {
  // Fast, free default (speed was the top complaint).
  google: "gemini-2.5-flash",
  anthropic: "claude-opus-4-8",
  openai: "gpt-5.5",
  ollama: "llama3.1",
};

export type ModelTier = "fast" | "balanced" | "smart";

export interface ModelOption {
  id: string;
  label: string;
  tier: ModelTier;
  note: string;
}

/** Curated, selectable models per provider (so users pick, not type). */
export const MODEL_CATALOG: Record<Provider, ModelOption[]> = {
  google: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "fast", note: "Fastest · free" },
    { id: "gemini-flash-latest", label: "Gemini Flash (latest)", tier: "balanced", note: "Balanced · free" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "smart", note: "Smartest · free tier" },
  ],
  openai: [
    { id: "gpt-5-mini", label: "GPT-5 mini", tier: "fast", note: "Fastest · cheap" },
    { id: "gpt-5.5", label: "GPT-5.5", tier: "smart", note: "Smartest reasoning" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", tier: "fast", note: "Fastest" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", tier: "balanced", note: "Balanced" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8", tier: "smart", note: "Smartest reasoning" },
  ],
  ollama: [
    { id: "llama3.1", label: "Llama 3.1", tier: "balanced", note: "Local · free" },
    { id: "qwen2.5", label: "Qwen 2.5", tier: "balanced", note: "Local · free" },
    { id: "mistral", label: "Mistral", tier: "fast", note: "Local · free" },
  ],
};

export const TIER_LABEL: Record<ModelTier, string> = {
  fast: "Fastest",
  balanced: "Balanced",
  smart: "Smartest",
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google Gemini (free tier)",
  ollama: "Ollama (local, free)",
  anthropic: "Anthropic Claude (BYOK)",
  openai: "OpenAI (BYOK)",
};

export const PROVIDER_SHORT: Record<Provider, string> = {
  google: "Gemini",
  ollama: "Ollama",
  anthropic: "Claude",
  openai: "OpenAI",
};

/** Known model presets per provider (for the settings <datalist>; free-text still allowed). */
export const MODEL_PRESETS: Record<Provider, string[]> = {
  google: ["gemini-flash-latest", "gemini-2.5-pro", "gemini-2.5-flash"],
  anthropic: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-5.5", "gpt-5-mini"],
  ollama: ["llama3.1", "qwen2.5", "mistral"],
};

/** Fired on the window whenever settings are saved, so open views can re-read them. */
export const SETTINGS_EVENT = "ce:settings";

const DEFAULTS: Settings = { provider: "google", model: DEFAULT_MODELS.google };

/** Client-only. Reads the user's free/BYOK model settings from localStorage. */
export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  window.localStorage.setItem(KEY, JSON.stringify(s));
  // Let any open view (e.g. a mid-flow Adversary chat) pick up the new model.
  try {
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  } catch {
    /* SSR / no window */
  }
}

/** Does the chosen provider have what it needs to run from the browser? */
export function settingsReady(s: Settings): boolean {
  if (s.provider === "ollama") return true;
  return Boolean(s.apiKey && s.apiKey.trim());
}
