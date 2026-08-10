import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { HINTS_SYSTEM } from "@/lib/ai/prompts";
import type { Settings } from "@/lib/types";
import { guard, fail } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const Schema = z.object({ hints: z.array(z.string()).min(1).max(3) });

interface Body {
  question?: string;
  take?: string;
  settings?: Settings;
}

// Suggests angles to help the user answer the Adversary's hard question.
// Scaffolds THEIR articulation — never a conclusion (anti-slop).
export async function POST(req: Request) {
  const caller = await guard("hints");
  if (caller instanceof Response) return caller;

  const { question, take, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  if (!question?.trim()) return Response.json({ error: "no_question" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "adversary");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  try {
    const output = await generateStructured({ ms, schema: Schema, system: HINTS_SYSTEM, label: "hints", prompt: `My take: "${take ?? ""}"\n\nThe adversary asked:\n"""${question.slice(0, 1200)}"""\n\nGive me 2-3 angles I could take to respond — in my own words.` , caller });
    return Response.json(output);
  } catch (e) {
    return fail(caller, (e as Error).message ?? "hints_failed", 500);
  }
}
