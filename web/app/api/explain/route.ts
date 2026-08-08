import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { EXPLAINER_SYSTEM } from "@/lib/ai/prompts";
import { CarouselSchema, normalizeSlide } from "@/lib/carousel/llm";
import { DESIGNS } from "@/lib/carousel/design";
import { formatCatalog, FORMAT_IDS } from "@/lib/carousel/formats";
import type { Settings, Synthesis } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  synthesis?: Synthesis;
  sourceTitle?: string;
  sourceUrl?: string;
  settings?: Settings;
}

// The "Explain it" mode: a NEUTRAL educational carousel built from a synthesis —
// no opinion, no commit. Same engine + design system as the Expressor.
export async function POST(req: Request) {
  const caller = await guard("explain");
  if (caller instanceof Response) return caller;

  const { synthesis, sourceTitle, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  if (!synthesis?.happened) return Response.json({ error: "no_synthesis" }, { status: 400 });

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const system = EXPLAINER_SYSTEM;
  const designList = DESIGNS.map((d) => `- ${d.id}: ${d.name} (${d.mode})`).join("\n");

  try {
    const output = await generateStructured({
      ms,
      schema: CarouselSchema,
      system,
      label: "explain",
      prompt: `SOURCE BREAKDOWN (ground ONLY in this — it is what actually happened; never invent beyond it):
- In plain English: ${synthesis.plainEnglish ?? ""}
- What happened: ${synthesis.happened}
- Genuinely new vs. repackaged: ${synthesis.newVsRepackaged}
- The key debate: ${synthesis.keyDebate}
- The skeptic's strongest case: ${synthesis.skepticCase}
- Implications: ${(synthesis.implications ?? []).join(" | ")}
- Open questions: ${(synthesis.questions ?? []).join(" | ")}

Topic: ${sourceTitle ?? ""}

AVAILABLE FORMATS — pick the ONE that explains this most clearly and set "format":
${formatCatalog()}

AVAILABLE STYLES — pick the ONE whose mood fits and set "designId":
${designList}

Write a NEUTRAL, educational explainer carousel: make the topic easy to understand, present any debate fairly (no verdict), and include a "What to take note" takeaways slide. Never invent numbers.`,
    });
    const designId = DESIGNS.some((d) => d.id === output.designId) ? output.designId : "paper";
    const format = FORMAT_IDS.includes(output.format ?? "") ? output.format : undefined;
    return Response.json({ slides: output.slides.map(normalizeSlide), designId, format });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "explain_failed" }, { status: 500 });
  }
}
