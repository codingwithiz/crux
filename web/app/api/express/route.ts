import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { EXPRESSOR_SYSTEM } from "@/lib/ai/prompts";
import type { Settings, Thesis, VoiceProfile } from "@/lib/types";

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
  settings?: Settings;
  voice?: VoiceProfile;
}

/** Compose the voice guide + a couple of short samples into a prompt block. */
function voiceBlock(voice?: VoiceProfile): string {
  if (!voice) return "";
  const parts: string[] = [];
  if (voice.guide) parts.push(`VOICE GUIDE:\n${voice.guide}`);
  if (voice.tone) parts.push(`Tone: ${voice.tone}`);
  parts.push(`Emoji: ${voice.emoji ? "use tasteful emojis like the samples do" : "do NOT use emojis"}`);
  const samples = (voice.samples ?? []).filter((s) => s.trim()).slice(0, 2);
  if (samples.length) {
    parts.push(
      `Reference samples of how I write (match the STYLE, not the content):\n` +
        samples.map((s, i) => `[${i + 1}] ${s.slice(0, 600)}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  const { thesis, settings: rawSettings, voice } = (await req.json()) as Body;
  if (!thesis?.statement) return Response.json({ error: "no_thesis" }, { status: 400 });
  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const system = vb ? `${EXPRESSOR_SYSTEM}\n\n${vb}` : EXPRESSOR_SYSTEM;

  try {
    const { output } = await generateText({
      model: getModel(ms),
      output: Output.object({ schema: Schema }),
      system,
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
