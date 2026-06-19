import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { Provider } from "../types";

export interface ModelSettings {
  provider?: Provider;
  apiKey?: string;
  model?: string;
  ollamaBaseURL?: string;
}

/**
 * Model switch. Default = OpenAI (server OPENAI_API_KEY); Google Gemini free
 * tier and Ollama (fully-local) remain available; Anthropic when the user
 * brings their own key. A per-request apiKey (from the browser) overrides the
 * server env var.
 */
export function getModel(s: ModelSettings = {}): LanguageModel {
  switch (s.provider ?? "openai") {
    case "anthropic":
      return createAnthropic({
        apiKey: s.apiKey || process.env.ANTHROPIC_API_KEY,
      })(s.model ?? "claude-opus-4-8");

    case "openai":
      return createOpenAI({
        apiKey: s.apiKey || process.env.OPENAI_API_KEY,
      })(s.model ?? "gpt-5.5");

    case "ollama":
      return createOpenAICompatible({
        name: "ollama",
        baseURL: s.ollamaBaseURL ?? "http://localhost:11434/v1",
      })(s.model ?? "llama3.1");

    case "google":
    default:
      return createGoogleGenerativeAI({
        apiKey: s.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })(s.model ?? "gemini-flash-latest");
  }
}

/**
 * OpenAI's strict structured outputs reject any schema with optional fields
 * (every property must appear in `required`, or the API errors with
 * "Missing '<field>'"). Pass these provider options on structured-output calls
 * whose schema has optional/defaulted fields so OpenAI relaxes strict mode;
 * Google/Anthropic/Ollama ignore the unknown key.
 */
export const RELAXED_SCHEMA: { openai: { strictJsonSchema: boolean } } = {
  openai: { strictJsonSchema: false },
};

/** True when the request can actually reach a model (key present or local). */
export function modelReady(s: ModelSettings = {}): boolean {
  const provider = s.provider ?? "openai";
  if (provider === "ollama") return true;
  if (s.apiKey) return true;
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
