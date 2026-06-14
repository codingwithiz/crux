import { generateText } from "ai";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { VOICE_DISTILL_SYSTEM } from "@/lib/ai/prompts";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  samples?: string[];
  settings?: Settings;
}

// Distills a person's writing samples into a compact, reusable style guide.
export async function POST(req: Request) {
  const { samples, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  const clean = (samples ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  if (clean.length === 0) return Response.json({ error: "no_samples" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  try {
    const { text } = await generateText({
      model: getModel(ms),
      system: VOICE_DISTILL_SYSTEM,
      prompt:
        `Here are my writing samples. Produce the style guide.\n\n` +
        clean.map((s, i) => `--- Sample ${i + 1} ---\n${s.slice(0, 2500)}`).join("\n\n"),
    });
    return Response.json({ guide: text.trim() });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "distill_failed" }, { status: 500 });
  }
}
