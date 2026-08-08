import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { TAKE_DRAFTS_SYSTEM } from "@/lib/ai/prompts";
import type { Settings, Synthesis } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const Schema = z.object({ drafts: z.array(z.string()).min(2).max(3) });

interface Body {
  synthesis?: Synthesis;
  settings?: Settings;
}

// Suggests 2-3 DIVERGENT candidate takes the user can react to and edit when
// they're stuck forming an opinion. They still must defend the one they pick
// against the Adversary — so this scaffolds a start, never a conclusion.
export async function POST(req: Request) {
  const caller = await guard("take-drafts");
  if (caller instanceof Response) return caller;

  const { synthesis, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  if (!synthesis) return Response.json({ error: "no_synthesis" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "synthesize");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const context = [
    synthesis.keyDebate ? `Key debate: ${synthesis.keyDebate}` : "",
    synthesis.skepticCase ? `Skeptic's case: ${synthesis.skepticCase}` : "",
    synthesis.questions?.length ? `Open questions:\n- ${synthesis.questions.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const output = await generateStructured({ ms, schema: Schema, system: TAKE_DRAFTS_SYSTEM, label: "take-drafts", prompt: `${context}\n\nGive me 2-3 divergent draft takes I could react to.` });
    return Response.json(output);
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "drafts_failed" }, { status: 500 });
  }
}
