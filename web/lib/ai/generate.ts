import { generateText, Output, APICallError } from "ai";
import type { z } from "zod";
import { getModel, modelReady, RELAXED_SCHEMA } from "./model";
import type { ErrorCode } from "./cost";
import type { Caller } from "../api-guard";

type ModelSettings = Parameters<typeof getModel>[0];

/** No model call may hang a route to its 60s ceiling. */
const CALL_TIMEOUT_MS = 45_000;

/**
 * What went wrong, and whether trying again could possibly help.
 *
 * Everything used to be retried identically, with a "your previous response
 * failed validation, return valid JSON" nudge appended — so a 401 spent three
 * attempts and two backoffs pleading with the provider to fix its JSON. The
 * status code is right there on the SDK's error; using it means a bad key fails
 * in a second and says so, and only the failures that can improve are retried.
 */
export function classify(e: unknown): { code: ErrorCode; retry: boolean; repair: boolean } {
  if (APICallError.isInstance(e)) {
    const status = e.statusCode;
    if (status === 401 || status === 403) return { code: "auth", retry: false, repair: false };
    if (status === 429) return { code: "rate_limited", retry: true, repair: false };
    if (status === 408) return { code: "timeout", retry: true, repair: false };
    if (status && status >= 400 && status < 500) return { code: "bad_request", retry: false, repair: false };
    if (status && status >= 500) return { code: "server", retry: true, repair: false };
    return { code: "network", retry: true, repair: false };
  }
  if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) {
    return { code: "timeout", retry: true, repair: false };
  }
  // Anything else here is the SDK failing to produce an object matching the
  // schema — the one case the repair nudge exists for.
  return { code: "schema", retry: true, repair: true };
}

/** How long to wait before the next attempt. */
export function backoffMs(e: unknown, attempt: number): number {
  // A provider that tells you when to come back is worth believing.
  if (APICallError.isInstance(e)) {
    const header = e.responseHeaders?.["retry-after"];
    const secs = header ? Number(header) : NaN;
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 20_000);
  }
  // Jittered: without it, concurrent calls that fail together retry together.
  const base = 250 * 2 ** attempt;
  return base + Math.random() * base;
}

/**
 * Durable structured generation. Wraps the AI SDK's `generateText` +
 * `Output.object` with:
 *  - an error taxonomy, so only failures that can improve are retried,
 *  - schema-repair (re-ask with a "return valid JSON" nudge) for the one case
 *    that means,
 *  - jittered backoff that honours `retry-after`,
 *  - a hard timeout, so a stalled provider can't hold a route to its ceiling,
 *  - token/cost/latency recording when the caller supplies a recorder.
 * Throws the last error if every attempt fails (callers keep their own
 * deterministic fallback for graceful degradation).
 *
 * Deliberately no provider fallback: a second configured model is a plausible
 * idea that nothing here needed, and the parameter for it sat unused by all
 * twelve call sites while the README advertised the feature.
 */
export async function generateStructured<S extends z.ZodType>({
  ms,
  schema,
  system,
  prompt,
  retries = 2,
  label = "ai",
  caller,
}: {
  ms: ModelSettings;
  schema: S;
  system: string;
  prompt: string;
  retries?: number;
  label?: string;
  /** From `guard()`. Omitted in unmetered contexts (the dev-only eval route). */
  caller?: Pick<Caller, "record">;
}): Promise<z.infer<S>> {
  if (!modelReady(ms)) throw new Error("no_model");

  const started = Date.now();
  let lastErr: unknown;
  let lastCode: ErrorCode = "unknown";
  let repair = false;
  // What it actually took, not the ceiling: a 401 that fails on the first
  // attempt must not be recorded as three.
  let spent = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    spent = attempt + 1;
    try {
      const { output, usage } = await generateText({
        model: getModel(ms),
        output: Output.object({ schema }),
        providerOptions: RELAXED_SCHEMA,
        system,
        prompt:
          prompt +
          (repair
            ? "\n\n(Your previous response failed validation. Return ONLY valid JSON that matches the required schema, with every required field present.)"
            : ""),
        abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      });
      caller?.record({
        label,
        model: ms?.model,
        usage,
        latencyMs: Date.now() - started,
        attempts: attempt + 1,
        ok: true,
      });
      return output as z.infer<S>;
    } catch (e) {
      lastErr = e;
      const { code, retry, repair: shouldRepair } = classify(e);
      lastCode = code;
      repair = shouldRepair;
      const fatal = !retry || attempt === retries;
      console.warn(
        `[${label}] fail code=${code} provider=${ms?.provider ?? "default"} attempt=${attempt + 1}: ${(e as Error).message}`,
      );
      if (fatal) break;
      await new Promise((r) => setTimeout(r, backoffMs(e, attempt)));
    }
  }

  caller?.record({
    label,
    model: ms?.model,
    latencyMs: Date.now() - started,
    attempts: spent,
    ok: false,
    errorCode: lastCode,
  });
  throw lastErr ?? new Error("generation_failed");
}
