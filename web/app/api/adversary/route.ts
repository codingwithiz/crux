import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { ADVERSARY_SYSTEM, COACH_SYSTEM } from "@/lib/ai/prompts";
import type { Settings, Synthesis } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  messages: UIMessage[];
  synthesis?: Synthesis;
  take?: string;
  settings?: Settings;
  /** "coach" = supportive (default, helps you find a take); "spar" = hard adversary. */
  mode?: "coach" | "spar";
}

// Fastest reasoning effort accepted by each OpenAI model — they disagree:
// gpt-5.5 accepts "none" (rejects "minimal"); gpt-5-mini/nano accept "minimal"
// (reject "none"). "low" is the safe fallback for any other/custom id.
function fastReasoningEffort(model?: string): "none" | "minimal" | "low" {
  const m = (model ?? "gpt-5.5").toLowerCase();
  if (m.includes("mini") || m.includes("nano")) return "minimal";
  if (m.startsWith("gpt-5.5")) return "none";
  return "low";
}

export async function POST(req: Request) {
  const caller = await guard("adversary");
  if (caller instanceof Response) return caller;

  const { messages, synthesis, take, settings: rawSettings, mode } = (await req.json()) as Body;
  const settings = await resolveServerSettings(rawSettings);
  const baseSystem = mode === "spar" ? ADVERSARY_SYSTEM : COACH_SYSTEM;

  const ms = stepModelSettings(settings, "adversary");
  if (!modelReady(ms)) {
    return Response.json({ error: "no_model" }, { status: 400 });
  }

  const context = [
    synthesis ? `Synthesis of the item under discussion:\n${JSON.stringify(synthesis)}` : "",
    take ? `The user's initial gut take: "${take}"` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // The only streaming call in the product, so its spend arrives at the end
  // rather than as a return value — and it is the chattiest step, so leaving it
  // unmetered would have hidden the largest share of a session's cost.
  const started = Date.now();

  const result = streamText({
    model: getModel(ms),
    system: context ? `${baseSystem}\n\n${context}` : baseSystem,
    messages: await convertToModelMessages(messages),
    // Keep the back-and-forth snappy: minimize hidden reasoning (value is
    // model-specific, see fastReasoningEffort) and keep replies terse. Only
    // affects OpenAI reasoning models; ignored by other providers.
    providerOptions: { openai: { reasoningEffort: fastReasoningEffort(ms.model), textVerbosity: "low" } },
    abortSignal: AbortSignal.timeout(60_000),
    onFinish: ({ usage }) =>
      caller.record({
        label: mode === "spar" ? "spar" : "coach",
        model: ms.model,
        usage,
        latencyMs: Date.now() - started,
        attempts: 1,
        ok: true,
      }),
    onError: ({ error }) => {
      caller.record({
        label: mode === "spar" ? "spar" : "coach",
        model: ms.model,
        latencyMs: Date.now() - started,
        attempts: 1,
        ok: false,
        errorCode: "unknown",
      });
      console.warn(`[adversary] stream failed: ${(error as Error)?.message}`);
    },
  });

  return result.toUIMessageStreamResponse();
}
