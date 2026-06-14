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
 * Free-forever model switch. Default = Google Gemini free tier; Ollama for a
 * fully-local fallback; Anthropic/OpenAI when the user brings their own key.
 * A per-request apiKey (from the browser) overrides the server env var.
 */
export function getModel(s: ModelSettings = {}): LanguageModel {
  switch (s.provider ?? "google") {
    case "anthropic":
      return createAnthropic({
        apiKey: s.apiKey ?? process.env.ANTHROPIC_API_KEY,
      })(s.model ?? "claude-sonnet-4-6");

    case "openai":
      return createOpenAI({
        apiKey: s.apiKey ?? process.env.OPENAI_API_KEY,
      })(s.model ?? "gpt-5.1");

    case "ollama":
      return createOpenAICompatible({
        name: "ollama",
        baseURL: s.ollamaBaseURL ?? "http://localhost:11434/v1",
      })(s.model ?? "llama3.1");

    case "google":
    default:
      return createGoogleGenerativeAI({
        apiKey: s.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })(s.model ?? "gemini-flash-latest");
  }
}

/** True when the request can actually reach a model (key present or local). */
export function modelReady(s: ModelSettings = {}): boolean {
  const provider = s.provider ?? "google";
  if (provider === "ollama") return true;
  if (s.apiKey) return true;
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
