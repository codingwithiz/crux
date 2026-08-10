import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { REVOICE_SYSTEM, REVISE_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import type { CarouselSlide } from "@/lib/carousel/design";
import type { Settings, VoiceProfile } from "@/lib/types";
import { guard, fail } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Long enough for a real instruction, short enough not to become a new prompt. */
const DIRECTION_MAX = 300;

const Schema = z.object({
  slides: z
    .array(z.object({ headline: z.string(), body: z.string().optional(), kicker: z.string().optional() }))
    .min(1)
    .max(12),
});

interface Body {
  slides?: CarouselSlide[];
  /** Free-text instruction, e.g. "punchier" or "drop the jargon". */
  direction?: string;
  /** What the deck is about, when the caller has it — the Studio often doesn't. */
  context?: { thesis?: string; sourceTitle?: string };
  settings?: Settings;
  voice?: VoiceProfile;
}

/**
 * Rewrites carousel copy — in the user's voice, or toward a direction they typed
 * — preserving order, count, and each slide's visual module + data.
 *
 * A free-text direction is the riskiest input in the product: it's the one place
 * a user can ask the model for anything. It is safe here and would not be on the
 * express route, because the merge below copies only headline/body/kicker back
 * onto the caller's own slides. A direction that tried to add slides, swap a
 * layout or change a module physically cannot: the extra output is discarded,
 * and a changed slide count 422s before any of it is applied.
 */
export async function POST(req: Request) {
  const caller = await guard("revoice");
  if (caller instanceof Response) return caller;

  const {
    slides,
    direction: rawDirection,
    context,
    settings: rawSettings,
    voice,
  } = (await req.json().catch(() => ({}))) as Body;
  if (!Array.isArray(slides) || slides.length === 0) return Response.json({ error: "no_slides" }, { status: 400 });

  const direction = typeof rawDirection === "string" ? rawDirection.trim().slice(0, DIRECTION_MAX) : "";

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const base = direction ? REVISE_SYSTEM : REVOICE_SYSTEM;
  const system = vb ? `${base}\n\n${vb}` : base;
  const compact = slides.map((s) => ({ headline: s.headline, body: s.body, kicker: s.kicker }));

  const about = [
    context?.thesis && `The opinion this deck argues: "${context.thesis}"`,
    context?.sourceTitle && `Source: ${context.sourceTitle}`,
  ]
    .filter(Boolean)
    .join("\n");

  // The direction sits last and is clearly fenced as user input, so it reads as
  // an instruction about the copy rather than as further system rules.
  const task = direction
    ? `Rewrite them following this DIRECTION, keeping every rule above:\n"""\n${direction}\n"""`
    : `Rewrite them in my voice.`;

  try {
    const output = await generateStructured({
      ms,
      schema: Schema,
      system,
      label: direction ? "revise" : "revoice",
      caller,
      prompt: `${about ? `${about}\n\n` : ""}Current slides (JSON):\n${JSON.stringify(compact)}\n\n${task}\n\nReturn the same ${slides.length} slides, in the same order. Only change headline, body, and kicker.`,
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
    return fail(caller, (e as Error).message ?? "revoice_failed", 500);
  }
}
