import type { Provider, Settings } from "../types";

const PROVIDERS: Provider[] = ["google", "anthropic", "openai", "ollama"];

const asProvider = (v: unknown): Provider | undefined =>
  PROVIDERS.includes(v as Provider) ? (v as Provider) : undefined;

// A model id goes into a provider URL path, so keep it to the shape real ids
// take rather than passing arbitrary strings through.
const asModel = (v: unknown): string | undefined =>
  typeof v === "string" && /^[\w.:-]{1,64}$/.test(v) ? v : undefined;

/**
 * Narrow client-supplied settings to the fields the server will honor.
 *
 * The request body is untrusted input: it may carry extra fields (older clients
 * still send `apiKey` and `ollamaBaseURL`, which used to be respected) and the
 * only safe handling is to drop everything not listed here. Credentials and
 * endpoints come from server env — see getModel.
 */
export function resolveServerSettings(s: Settings | undefined): Settings {
  const raw = (s ?? {}) as Partial<Settings>;
  return {
    provider: asProvider(raw.provider) ?? "openai",
    model: asModel(raw.model),
    adversaryProvider: asProvider(raw.adversaryProvider),
    adversaryModel: asModel(raw.adversaryModel),
    brandLockDesignId:
      typeof raw.brandLockDesignId === "string" ? raw.brandLockDesignId : undefined,
  };
}
