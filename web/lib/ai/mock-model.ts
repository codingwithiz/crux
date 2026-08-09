import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type { LanguageModel } from "ai";
// `ai/test` declares its own surface in terms of these, so they resolve here
// too. Type-only, so nothing is emitted.
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";

/**
 * A model that answers instantly, identically, and for free.
 *
 * CI needs to know that a page renders, a route is reachable, and a stream
 * arrives — none of which is a question about model quality. Running real
 * inference to answer it would make every push cost money and every run flaky
 * for reasons unrelated to the change. Model *quality* is measured separately
 * by the eval harness, against real providers, on demand.
 *
 * Enabled by `MOCK_LLM=1`. Safe to import here: this module is server-only
 * (it reads provider secrets), so it never reaches a browser bundle.
 */
const CANNED_TEXT =
  "**Strongest counter:** the cheap version of this argument ignores the cost curve.\n\n**The hard question:** what evidence would change your mind?";

const USAGE: LanguageModelV3Usage = {
  // Annotated with the SDK's own types, which is how the flat {inputTokens: 1}
  // shape I first wrote got caught — V3 nests token counts per cache tier.
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

const FINISH: LanguageModelV3FinishReason = { unified: "stop", raw: "stop" };

const STREAMED: LanguageModelV3StreamPart[] = [
  { type: "text-start", id: "0" },
  { type: "text-delta", id: "0", delta: CANNED_TEXT },
  { type: "text-end", id: "0" },
  { type: "finish", finishReason: FINISH, usage: USAGE },
];

/** A JSON Schema node, in the shape the SDK hands us for structured output. */
interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

/**
 * Build the smallest value a schema will accept.
 *
 * Structured routes validate every response against a Zod schema and retry
 * twice before failing, so a fixed blob of prose makes them all 500 — which in
 * CI is indistinguishable from a genuine break. Deriving the fixture from the
 * schema the SDK already passes means the mock can never drift from what the
 * callers actually ask for, and no route needs its own fixture.
 */
function fromSchema(schema: JsonSchema | undefined, depth = 0): unknown {
  if (!schema || depth > 8) return "mock";
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];

  const variants = schema.anyOf ?? schema.oneOf;
  if (variants?.length) return fromSchema(variants[0], depth + 1);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case "object": {
      const out: Record<string, unknown> = {};
      // Only required properties: the point is the minimum that validates.
      for (const key of schema.required ?? []) {
        out[key] = fromSchema(schema.properties?.[key], depth + 1);
      }
      return out;
    }
    case "array":
      return Array.from({ length: Math.max(schema.minItems ?? 1, 1) }, () =>
        fromSchema(schema.items, depth + 1),
      );
    case "number":
    case "integer":
      return 1;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return "mock";
  }
}

function generate(options: LanguageModelV3CallOptions): LanguageModelV3GenerateResult {
  const format = options.responseFormat;
  const text =
    format?.type === "json"
      ? JSON.stringify(fromSchema(format.schema as JsonSchema | undefined))
      : CANNED_TEXT;

  return {
    content: [{ type: "text", text }],
    finishReason: FINISH,
    usage: USAGE,
    warnings: [],
  };
}

export function mockModel(): LanguageModel {
  return new MockLanguageModelV3({
    provider: "mock",
    modelId: "mock-model",
    doGenerate: async (options) => generate(options),
    doStream: { stream: simulateReadableStream({ chunks: STREAMED }) },
  });
}

/** True when the app should answer from fixtures instead of a provider. */
export const usingMockModel = () => process.env.MOCK_LLM === "1";
