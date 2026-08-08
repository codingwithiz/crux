import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { REVOICE_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import type { CarouselSlide } from "@/lib/carousel/design";
import type { Settings, VoiceProfile } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  slides: z
    .array(z.object({ headline: z.string(), body: z.string().optional(), kicker: z.string().optional() }))
    .min(1)
    .max(12),
});

interface Body {
  slides?: CarouselSlide[];
  settings?: Settings;
  voice?: VoiceProfile;
}

// Rewrites carousel copy (headline/body/kicker) in the user's voice, preserving
// order, count, and each slide's visual module + data.
export async function POST(req: Request) {
  const caller = await guard("revoice");
  if (caller instanceof Response) return caller;

  const { slides, settings: rawSettings, voice } = (await req.json().catch(() => ({}))) as Body;
  if (!Array.isArray(slides) || slides.length === 0) return Response.json({ error: "no_slides" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const system = vb ? `${REVOICE_SYSTEM}\n\n${vb}` : REVOICE_SYSTEM;
  const compact = slides.map((s) => ({ headline: s.headline, body: s.body, kicker: s.kicker }));

  try {
    const output = await generateStructured({
      ms,
      schema: Schema,
      system,
      label: "revoice",
      prompt: `Current slides (JSON):\n${JSON.stringify(compact)}\n\nRewrite them in my voice. Return the same ${slides.length} slides, in the same order. Only change headline, body, and kicker.`,
    });
    if (output.slides.length !== slides.length) return Response.json({ error: "shape_mismatch" }, { status: 422 });
    const merged: CarouselSlide[] = slides.map((orig, i) => ({
      ...orig,
      headline: output.slides[i].headline || orig.headline,
      body: output.slides[i].body ?? orig.body,
      kicker: output.slides[i].kicker ?? orig.kicker,
    }));
    return Response.json({ slides: merged });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "revoice_failed" }, { status: 500 });
  }
}
