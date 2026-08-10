/**
 * What a call cost, in dollars.
 *
 * A hardcoded table rather than a pricing API: prices change a few times a year,
 * this is a personal deployment, and a wrong number here is visible the moment
 * you look at a total. The cost is computed at call time and stored, so a later
 * price edit can't silently rewrite what past calls appear to have cost.
 *
 * Keys are matched by longest prefix, so `gpt-5-mini-2026-01-01` prices as
 * `gpt-5-mini`. An unknown model returns null — recorded honestly as "unpriced"
 * rather than as zero, which would quietly understate a total.
 */

/** USD per 1M tokens. */
const PRICE: Record<string, { in: number; out: number }> = {
  // OpenAI
  "gpt-5.5": { in: 1.25, out: 10 },
  "gpt-5-mini": { in: 0.25, out: 2 },
  "gpt-5-nano": { in: 0.05, out: 0.4 },
  // Google
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-flash-latest": { in: 0.3, out: 2.5 },
  // Anthropic
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  // Local models cost nothing to call.
  mistral: { in: 0, out: 0 },
  "llama3.1": { in: 0, out: 0 },
};

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/** The priced entry for a model id, by longest matching prefix. */
function priceFor(model: string | undefined): { in: number; out: number } | null {
  if (!model) return null;
  const id = model.toLowerCase();
  let best: { key: string; price: { in: number; out: number } } | null = null;
  for (const [key, price] of Object.entries(PRICE)) {
    if (id.startsWith(key) && (!best || key.length > best.key.length)) best = { key, price };
  }
  return best?.price ?? null;
}

/** Dollars for this call, or null when the model isn't in the table. */
export function costUsd(model: string | undefined, usage: TokenUsage | undefined): number | null {
  const p = priceFor(model);
  if (!p || !usage) return null;
  const cost =
    ((usage.inputTokens ?? 0) * p.in + (usage.outputTokens ?? 0) * p.out) / 1_000_000;
  // Six decimals matches the column; a sub-micro-dollar call rounds to 0, which
  // is the honest answer rather than a rounding artefact.
  return Math.round(cost * 1e6) / 1e6;
}

/**
 * Why a call failed, as a short stable code rather than a provider's prose.
 *
 * The taxonomy is the point: "auth" must never be retried with a
 * "return valid JSON" nudge, and "rate_limited" wants a different wait than a
 * network blip. Aggregating on a message string would give you one bucket per
 * provider wording.
 */
export type ErrorCode =
  | "auth"
  | "rate_limited"
  | "bad_request"
  | "timeout"
  | "server"
  | "schema"
  | "network"
  | "unknown";
