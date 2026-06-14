import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady, type ModelSettings } from "@/lib/ai/model";
import { EXPRESSOR_SYSTEM } from "@/lib/ai/prompts";
import type { Thesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["hook", "context", "conventional", "argument", "counter", "sowhat", "cta"] as const;

const Schema = z.object({
  slides: z
    .array(
      z.object({
        kind: z.enum(KINDS),
        kicker: z.string(),
        title: z.string(),
        body: z.string(),
      }),
    )
    .min(5)
    .max(8),
});

interface Body {
  thesis: Thesis;
  settings?: ModelSettings;
}

export async function POST(req: Request) {
  const { thesis, settings } = (await req.json()) as Body;
  if (!thesis?.statement) return Response.json({ error: "no_thesis" }, { status: 400 });
  if (!modelReady(settings)) return Response.json({ error: "no_model" }, { status: 400 });

  try {
    const { output } = await generateText({
      model: getModel(settings),
      output: Output.object({ schema: Schema }),
      system: EXPRESSOR_SYSTEM,
      prompt: `My committed thesis: "${thesis.statement}"
Topic: ${thesis.topic}
Confidence: ${thesis.confidence}
My evidence: ${thesis.evidenceFor ?? "(none given)"}
Strongest counter I accept: ${thesis.steelman ?? "(none)"}
What would change my mind: ${thesis.changeMyMind ?? "(none)"}

Write the carousel slides in my voice.`,
    });
    return Response.json(output);
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "express_failed" }, { status: 500 });
  }
}
