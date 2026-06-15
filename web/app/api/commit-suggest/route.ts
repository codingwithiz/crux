import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { COMMIT_SUGGEST_SYSTEM } from "@/lib/ai/prompts";
import type { Settings, Synthesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  statement: z.string(),
  confidence: z.enum(["low", "med", "high"]),
  evidenceFor: z.string(),
  steelman: z.string(),
  changeMyMind: z.string(),
  topic: z.string(),
});

interface Body {
  synthesis?: Synthesis;
  take?: string;
  messages?: { role: string; text: string }[];
  settings?: Settings;
}

// Drafts the commit fields by ORGANIZING the user's own take + their answers in
// the Adversary discussion. Anti-slop: it never introduces a new opinion — the
// human still edits and owns the commit.
export async function POST(req: Request) {
  const { synthesis, take, messages, settings: rawSettings } = (await req
    .json()
    .catch(() => ({}))) as Body;

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const transcript = (messages ?? [])
    .filter((m) => m.text?.trim())
    .map((m) => `${m.role === "user" ? "ME" : "ADVERSARY"}: ${m.text.trim()}`)
    .join("\n");

  const prompt = `My initial gut take: "${take ?? ""}"

Synthesis context:
${synthesis ? JSON.stringify({ keyDebate: synthesis.keyDebate, skepticCase: synthesis.skepticCase }) : "(none)"}

The discussion (organize MY position from this — do not add anything I didn't argue):
${transcript || "(no discussion yet — base the draft on my gut take only)"}

Draft my commit fields.`;

  try {
    const { output } = await generateText({
      model: getModel(ms),
      output: Output.object({ schema: Schema }),
      system: COMMIT_SUGGEST_SYSTEM,
      prompt,
    });
    return Response.json(output);
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "suggest_failed" }, { status: 500 });
  }
}
