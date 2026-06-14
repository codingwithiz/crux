import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { ADVERSARY_SYSTEM } from "@/lib/ai/prompts";
import type { Settings, Synthesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  messages: UIMessage[];
  synthesis?: Synthesis;
  take?: string;
  settings?: Settings;
}

export async function POST(req: Request) {
  const { messages, synthesis, take, settings: rawSettings } = (await req.json()) as Body;
  const settings = await resolveServerSettings(rawSettings);

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

  const result = streamText({
    model: getModel(ms),
    system: context ? `${ADVERSARY_SYSTEM}\n\n${context}` : ADVERSARY_SYSTEM,
    messages: await convertToModelMessages(messages),
    // Only affects OpenAI reasoning models (e.g. gpt-5.5); ignored by others.
    providerOptions: { openai: { reasoningEffort: "medium" } },
  });

  return result.toUIMessageStreamResponse();
}
