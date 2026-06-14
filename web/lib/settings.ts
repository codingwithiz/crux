import type { Provider, Settings } from "./types";

const KEY = "ce.settings";

export const DEFAULT_MODELS: Record<Provider, string> = {
  google: "gemini-flash-latest",
  anthropic: "claude-opus-4-8",
  openai: "gpt-5.1",
  ollama: "llama3.1",
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google Gemini (free tier)",
  ollama: "Ollama (local, free)",
  anthropic: "Anthropic Claude (BYOK)",
  openai: "OpenAI (BYOK)",
};

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
}

/** Does the chosen provider have what it needs to run from the browser? */
export function settingsReady(s: Settings): boolean {
  if (s.provider === "ollama") return true;
  return Boolean(s.apiKey && s.apiKey.trim());
}
