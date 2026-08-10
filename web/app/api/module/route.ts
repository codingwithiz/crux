import { generateStructured } from "@/lib/ai/generate";
import { modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { MODULE_FILL_SYSTEM } from "@/lib/ai/prompts";
import { ModuleSchema, normalizeModule } from "@/lib/carousel/llm";
import { MODULE_TYPES, type ModuleType } from "@/lib/carousel/design";
import type { Settings } from "@/lib/types";
import { guard, fail } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  headline?: string;
  body?: string;
  kicker?: string;
  type?: string;
  settings?: Settings;
}

// Fills one visual module with concrete, slide-specific data (used when the user
// switches a slide's module in the Studio — so the data is relevant, not a
// generic placeholder).
export async function POST(req: Request) {
  const caller = await guard("module");
  if (caller instanceof Response) return caller;

  const { headline, body, kicker, type, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  if (!type || !MODULE_TYPES.includes(type as ModuleType)) return Response.json({ error: "bad_type" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  try {
    const raw = await generateStructured({
      ms,
      schema: ModuleSchema,
      system: MODULE_FILL_SYSTEM,
      label: "module",
      caller,
      prompt: `SLIDE:\nkicker: ${kicker ?? ""}\nheadline: ${headline ?? ""}\nbody: ${body ?? ""}\n\nFill a "${type}" module with concrete, specific data drawn from this slide. The module "type" must be "${type}". Use real, meaningful labels — no "point 1"/"step 1" placeholders.`,
    });
    const module = normalizeModule({ ...raw, type: type as ModuleType });
    if (!module) return Response.json({ error: "empty" }, { status: 422 });
    return Response.json({ module });
  } catch (e) {
    return fail(caller, (e as Error).message ?? "module_failed", 500);
  }
}
