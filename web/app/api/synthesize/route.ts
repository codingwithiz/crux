import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady, type ModelSettings } from "@/lib/ai/model";
import { SYNTHESIZER_SYSTEM } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  happened: z.string(),
  newVsRepackaged: z.string(),
  keyDebate: z.string(),
  skepticCase: z.string(),
  implications: z.array(z.string()),
  questions: z.array(z.string()),
});

interface Body {
  input?: string;
  kind?: string;
  sourceTitle?: string;
  settings?: ModelSettings;
}

export async function POST(req: Request) {
  const { input, kind, sourceTitle, settings } = (await req
    .json()
    .catch(() => ({}))) as Body;

  if (!input || !input.trim()) return Response.json({ error: "empty" }, { status: 400 });
  if (!modelReady(settings)) return Response.json({ error: "no_model" }, { status: 400 });

  const subject =
    kind === "news"
      ? `A trending AI/tech item.\nTitle: ${sourceTitle ?? ""}\nDetails: ${input}`
      : `My raw take / thought:\n"${input}"`;

  try {
    const { output } = await generateText({
      model: getModel(settings),
      output: Output.object({ schema: Schema }),
      system: SYNTHESIZER_SYSTEM,
      prompt: `${subject}\n\nReturn the synthesis: what happened, what is genuinely new vs. repackaged, the single biggest debate or uncertainty, the skeptic's strongest case, 1-3 concrete second-order implications, and exactly 3 questions I must answer before I have a publishable opinion.`,
    });
    return Response.json(output);
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "synthesis_failed" }, { status: 500 });
  }
}
