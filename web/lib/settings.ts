import type { Provider, Settings, Tier } from "./types";

const KEY = "ce.settings";

/**
 * What you get, not which vendor.
 *
 * The old dialog asked users to pick a provider, then a model id, then whether
 * to upgrade "the Adversary" — three questions that require knowing this
 * codebase to answer. Worse, it offered providers with no key configured, so a
 * legitimate-looking choice silently broke every generation. A tier says what
 * changes for the user; Crux maps it onto whatever is actually available.
 */
export const TIERS: { id: Tier; label: string; blurb: string }[] = [
  { id: "speed", label: "Speed", blurb: "Answers fastest. Good for browsing and quick takes." },
  { id: "balanced", label: "Balanced", blurb: "The default. Quick enough, and thinks properly." },
  { id: "deep", label: "Deep", blurb: "Slowest and most considered. Best when you want a real argument." },
];

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google Gemini",
  ollama: "Ollama (local)",
  anthropic: "Anthropic Claude",
  openai: "OpenAI",
};

export const PROVIDER_SHORT: Record<Provider, string> = {
  google: "Gemini",
  ollama: "Ollama",
  anthropic: "Claude",
  openai: "OpenAI",
};

/** Fired on the window whenever settings are saved, so open views can re-read them. */
export const SETTINGS_EVENT = "ce:settings";

/**
 * No hardcoded provider. The previous default named OpenAI regardless of what
 * was configured, so on a deployment without that key every new user started
 * broken and only found out when a generation failed. Left unset, the server
 * falls back to whatever it can actually reach.
 */
const DEFAULTS: Settings = { tier: "balanced" };

/** Client-only. Reads the user's model preferences from localStorage. */
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
  // Let any open view (e.g. a mid-flow chat) pick up the new choice.
  try {
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  } catch {
    /* SSR / no window */
  }
}
