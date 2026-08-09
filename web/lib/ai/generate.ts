import { generateText, Output } from "ai";
import type { z } from "zod";
import { getModel, modelReady, RELAXED_SCHEMA } from "./model";

type ModelSettings = Parameters<typeof getModel>[0];

/**
 * Durable structured generation. Wraps the AI SDK's `generateText` +
 * `Output.object` with:
 *  - retries with backoff on transient/provider errors,
 *  - schema-repair (re-ask with a "return valid JSON" nudge when validation fails),
 *  - latency/attempt logging.
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
}: {
  ms: ModelSettings;
  schema: S;
  system: string;
  prompt: string;
  retries?: number;
  label?: string;
}): Promise<z.infer<S>> {
  if (!modelReady(ms)) throw new Error("no_model");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const t0 = Date.now();
    try {
      const repair =
        attempt === 0
          ? ""
          : "\n\n(Your previous response failed validation. Return ONLY valid JSON that matches the required schema, with every required field present.)";
      const { output } = await generateText({
        model: getModel(ms),
        output: Output.object({ schema }),
        providerOptions: RELAXED_SCHEMA,
        system,
        prompt: prompt + repair,
      });
      console.info(`[${label}] ok provider=${ms?.provider ?? "default"} attempt=${attempt + 1} ms=${Date.now() - t0}`);
      return output as z.infer<S>;
    } catch (e) {
      lastErr = e;
      console.warn(`[${label}] fail provider=${ms?.provider ?? "default"} attempt=${attempt + 1} ms=${Date.now() - t0}: ${(e as Error).message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("generation_failed");
}
