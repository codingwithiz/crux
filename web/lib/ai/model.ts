import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { Provider } from "../types";
import { cleanSecret } from "../env";
import { mockModel, usingMockModel } from "./mock-model";

export interface ModelSettings {
  provider?: Provider;
  model?: string;
}

/**
 * Model switch. Every provider authenticates with a server env key; the browser
 * chooses which model to use, never how to reach it. The Ollama endpoint is
 * likewise server-configured — taking it from the request body would let any
 * caller point this server at an arbitrary internal URL.
 */
export function getModel(s: ModelSettings = {}): LanguageModel {
  // The seam sits here rather than in generateStructured because this is the
  // one point both generateText and streamText pass through — so the streaming
  // adversary is covered by the same switch as every structured call.
  if (usingMockModel()) return mockModel();

  switch (s.provider ?? "openai") {
    case "anthropic":
      return createAnthropic({
        apiKey: cleanSecret(process.env.ANTHROPIC_API_KEY),
      })(s.model ?? "claude-opus-4-8");

    case "openai":
      return createOpenAI({
        apiKey: cleanSecret(process.env.OPENAI_API_KEY),
      })(s.model ?? "gpt-5.5");

    case "ollama":
      return createOpenAICompatible({
        name: "ollama",
        baseURL: cleanSecret(process.env.OLLAMA_BASE_URL) ?? "http://localhost:11434/v1",
      })(s.model ?? "llama3.1");

    case "google":
    default:
      return createGoogleGenerativeAI({
        apiKey: cleanSecret(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
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

/**
 * True when the request can actually reach a model (server key present or
 * local). Checks the sanitized value, so a variable holding nothing but
 * invisible characters reports "not configured" instead of passing the gate and
 * failing later inside the provider SDK.
 */
export function modelReady(s: ModelSettings = {}): boolean {
  // Without this, every route would 400 with no_model before reaching getModel
  // and the mock would never be consulted.
  if (usingMockModel()) return true;

  const provider = s.provider ?? "openai";
  if (provider === "ollama") return true;
  if (provider === "anthropic") return Boolean(cleanSecret(process.env.ANTHROPIC_API_KEY));
  if (provider === "openai") return Boolean(cleanSecret(process.env.OPENAI_API_KEY));
  return Boolean(cleanSecret(process.env.GOOGLE_GENERATIVE_AI_API_KEY));
}
