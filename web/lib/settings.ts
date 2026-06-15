import type { Provider, Settings } from "./types";

const KEY = "ce.settings";

export const DEFAULT_MODELS: Record<Provider, string> = {
  google: "gemini-flash-latest",
  anthropic: "claude-opus-4-8",
  openai: "gpt-5.5",
  ollama: "llama3.1",
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
