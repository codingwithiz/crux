import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { REPURPOSE_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import type { Settings, Synthesis, Thesis, VoiceProfile } from "@/lib/types";
import { guard, fail } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  thread: z.array(z.string()).min(2),
  linkedin: z.string(),
});

interface Body {
  thesis?: Thesis;
  settings?: Settings;
  voice?: VoiceProfile;
}

// Re-expresses the user's OWN committed thesis in other post formats. Anti-slop:
// same opinion, their voice, grounded only in the thesis — never a new claim.
export async function POST(req: Request) {
  const caller = await guard("repurpose");
  if (caller instanceof Response) return caller;

  const { thesis, settings: rawSettings, voice } = (await req.json().catch(() => ({}))) as Body;
  if (!thesis?.statement) return Response.json({ error: "no_thesis" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const system = vb ? `${REPURPOSE_SYSTEM}\n\n${vb}` : REPURPOSE_SYSTEM;
  const synthesis = thesis.synthesis as Synthesis | undefined;
  const newsContext = synthesis
    ? `\nNews context (ground in this, do not exceed it): ${synthesis.happened} | key debate: ${synthesis.keyDebate}`
    : "";

  const prompt = `My committed thesis: "${thesis.statement}"
Topic: ${thesis.topic}
Confidence: ${thesis.confidence}
My evidence: ${thesis.evidenceFor ?? "(none given)"}
Strongest counter I accept: ${thesis.steelman ?? "(none)"}
What would change my mind: ${thesis.changeMyMind ?? "(none)"}${newsContext}

Repurpose this into "thread" and "linkedin" — same opinion, my voice, nothing invented.`;

  try {
    const output = await generateStructured({ ms, schema: Schema, system, label: "repurpose", prompt , caller });
    return Response.json(output);
  } catch (e) {
    return fail(caller, (e as Error).message ?? "repurpose_failed", 500);
  }
}
