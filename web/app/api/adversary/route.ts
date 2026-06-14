import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, modelReady, type ModelSettings } from "@/lib/ai/model";
import { ADVERSARY_SYSTEM } from "@/lib/ai/prompts";
import type { Synthesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  messages: UIMessage[];
  synthesis?: Synthesis;
  take?: string;
  settings?: ModelSettings;
}

export async function POST(req: Request) {
  const { messages, synthesis, take, settings } = (await req.json()) as Body;

  if (!modelReady(settings)) {
    return Response.json({ error: "no_model" }, { status: 400 });
  }

  const context = [
    synthesis ? `Synthesis of the item under discussion:\n${JSON.stringify(synthesis)}` : "",
    take ? `The user's initial gut take: "${take}"` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = streamText({
    model: getModel(settings),
    system: context ? `${ADVERSARY_SYSTEM}\n\n${context}` : ADVERSARY_SYSTEM,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
