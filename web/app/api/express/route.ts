import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { EXPRESSOR_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import { CarouselSchema, normalizeSlide } from "@/lib/carousel/llm";
import { DESIGNS } from "@/lib/carousel/design";
import { formatCatalog, FORMAT_IDS } from "@/lib/carousel/formats";
import type { Settings, Synthesis, Thesis, VoiceProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  thesis: Thesis;
  synthesis?: Synthesis;
  settings?: Settings;
  voice?: VoiceProfile;
}

export async function POST(req: Request) {
  const { thesis, synthesis: rawSynthesis, settings: rawSettings, voice } = (await req.json()) as Body;
  if (!thesis?.statement) return Response.json({ error: "no_thesis" }, { status: 400 });
  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const vb = voiceBlock(voice);
  const system = vb ? `${EXPRESSOR_SYSTEM}\n\n${vb}` : EXPRESSOR_SYSTEM;

  // Ground the carousel in what actually happened, when we have it.
  const synthesis = rawSynthesis ?? thesis.synthesis;
  const synthesisContext = synthesis
    ? `NEWS CONTEXT (ground the carousel in this — it is what actually happened; do not invent beyond it):
- What happened: ${synthesis.happened}
- Genuinely new vs. repackaged: ${synthesis.newVsRepackaged}
- The key debate: ${synthesis.keyDebate}
- The skeptic's strongest case: ${synthesis.skepticCase}
- Implications: ${(synthesis.implications ?? []).join(" | ")}

`
    : "";

  const designList = DESIGNS.map((d) => `- ${d.id}: ${d.name} (${d.mode})`).join("\n");
  try {
    const output = await generateStructured({
      ms,
      schema: CarouselSchema,
      system,
      label: "express",
      prompt: `${synthesisContext}My committed thesis: "${thesis.statement}"
Topic: ${thesis.topic}
Confidence: ${thesis.confidence}
My evidence: ${thesis.evidenceFor ?? "(none given)"}
Strongest counter I accept: ${thesis.steelman ?? "(none)"}
What would change my mind: ${thesis.changeMyMind ?? "(none)"}

AVAILABLE FORMATS — pick the ONE that best fits this topic and set "format":
${formatCatalog()}

AVAILABLE STYLES — pick the ONE whose mood fits this topic and set "designId":
${designList}

Write the carousel in my voice: choose a format + style, structure the slides along the format's beats, pick a fitting visual module per slide, set the topic brand (name + simple-icons slug) where one applies, and ground it in the news context where given. Never invent numbers.`,
    });
    const designId = DESIGNS.some((d) => d.id === output.designId) ? output.designId : "paper";
    const format = FORMAT_IDS.includes(output.format ?? "") ? output.format : undefined;
    return Response.json({ slides: output.slides.map(normalizeSlide), designId, format });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "express_failed" }, { status: 500 });
  }
}
