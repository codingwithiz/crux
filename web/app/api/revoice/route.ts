import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { REVOICE_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import type { Settings, Slide, VoiceProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["hook", "context", "conventional", "argument", "counter", "sowhat", "cta"] as const;
const LAYOUTS = ["statement", "stat", "quote", "list", "split"] as const;

const Schema = z.object({
  slides: z
    .array(
      z.object({
        kind: z.enum(KINDS),
        kicker: z.string(),
        title: z.string(),
        body: z.string(),
        layout: z.enum(LAYOUTS).optional(),
        bullets: z.array(z.string()).optional(),
        stat: z.object({ value: z.string(), label: z.string() }).optional(),
        icon: z.string().optional(),
      }),
    )
    .min(1)
    .max(12),
});

interface Body {
  slides?: Slide[];
  settings?: Settings;
  voice?: VoiceProfile;
}

// Rewrites existing carousel slides in the user's voice, preserving meaning,
// order, count, and each slide's kind.
export async function POST(req: Request) {
  const { slides, settings: rawSettings, voice } = (await req.json().catch(() => ({}))) as Body;
  if (!Array.isArray(slides) || slides.length === 0)
    return Response.json({ error: "no_slides" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const system = vb ? `${REVOICE_SYSTEM}\n\n${vb}` : REVOICE_SYSTEM;

  const compact = slides.map((s) => ({
    kind: s.kind,
    kicker: s.kicker,
    title: s.title,
    body: s.body,
    layout: s.layout,
    bullets: s.bullets,
    stat: s.stat,
    icon: s.icon,
  }));

  try {
    const { output } = await generateText({
      model: getModel(ms),
      output: Output.object({ schema: Schema }),
      system,
      prompt: `Current slides (JSON):\n${JSON.stringify(compact)}\n\nRewrite them in my voice. Return the same ${slides.length} slides, same order, same kinds, and KEEP each slide's "layout" and any "stat" values. If a slide has "bullets", rewrite the bullet text in my voice but keep the same number of bullets.`,
    });

    // Guard: if the model changed the count, keep the originals to stay safe.
    if (output.slides.length !== slides.length) {
      return Response.json({ error: "shape_mismatch" }, { status: 422 });
    }
    // Preserve original layout/stat/icon/source if the model dropped them.
    const merged = output.slides.map((s, i) => ({
      ...s,
      layout: s.layout ?? slides[i].layout,
      stat: s.stat ?? slides[i].stat,
      icon: s.icon ?? slides[i].icon,
      source: slides[i].source,
    }));
    return Response.json({ slides: merged });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "revoice_failed" }, { status: 500 });
  }
}
