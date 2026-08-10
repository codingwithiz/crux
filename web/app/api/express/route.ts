import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { EXPRESSOR_SYSTEM, EXPLAINER_SYSTEM } from "@/lib/ai/prompts";
import { voiceBlock } from "@/lib/ai/voice-prompt";
import { CarouselSchema, normalizeSlide } from "@/lib/carousel/llm";
import { DESIGNS } from "@/lib/carousel/design";
import { formatCatalog, FORMAT_IDS } from "@/lib/carousel/formats";
import type { Settings, Synthesis, Thesis, VoiceProfile } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Turns understanding into slides, in one of two registers.
 *
 * `express` argues the user's committed thesis in their voice; `explain` lays
 * out a synthesis neutrally with no opinion at all. They share the schema, the
 * design catalog, the format catalog, the normalizer, and the response — so the
 * two used to be near-identical files that drifted independently. The register
 * is a flag, exactly as coach-vs-spar is on the adversary route.
 */
interface Body {
  mode?: "express" | "explain";
  thesis?: Thesis;
  synthesis?: Synthesis;
  sourceTitle?: string;
  settings?: Settings;
  voice?: VoiceProfile;
  /** Formats/styles the caller already has, so a second take is a different one
   *  rather than the same deck with different words. */
  avoid?: { formats?: string[]; designIds?: string[] };
}

function thesisContext(thesis: Thesis, synthesis?: Synthesis): string {
  const news = synthesis
    ? `NEWS CONTEXT (ground the carousel in this — it is what actually happened; do not invent beyond it):
- What happened: ${synthesis.happened}
- Genuinely new vs. repackaged: ${synthesis.newVsRepackaged}
- The key debate: ${synthesis.keyDebate}
- The skeptic's strongest case: ${synthesis.skepticCase}
- Implications: ${(synthesis.implications ?? []).join(" | ")}

`
    : "";
  return `${news}My committed thesis: "${thesis.statement}"
Topic: ${thesis.topic}
Confidence: ${thesis.confidence}
My evidence: ${thesis.evidenceFor ?? "(none given)"}
Strongest counter I accept: ${thesis.steelman ?? "(none)"}
What would change my mind: ${thesis.changeMyMind ?? "(none)"}`;
}

function sourceBreakdown(synthesis: Synthesis, sourceTitle?: string): string {
  return `SOURCE BREAKDOWN (ground ONLY in this — it is what actually happened; never invent beyond it):
- In plain English: ${synthesis.plainEnglish ?? ""}
- What happened: ${synthesis.happened}
- Genuinely new vs. repackaged: ${synthesis.newVsRepackaged}
- The key debate: ${synthesis.keyDebate}
- The skeptic's strongest case: ${synthesis.skepticCase}
- Implications: ${(synthesis.implications ?? []).join(" | ")}
- Open questions: ${(synthesis.questions ?? []).join(" | ")}

Topic: ${sourceTitle ?? ""}`;
}

const EXPRESS_TASK = `Write the carousel in my voice: choose a format + style, structure the slides along the format's beats, pick a fitting visual module per slide, set the topic brand (name + simple-icons slug) where one applies, and ground it in the news context where given. Never invent numbers.`;

const EXPLAIN_TASK = `Write a NEUTRAL, educational explainer carousel: make the topic easy to understand, present any debate fairly (no verdict), and include a "What to take note" takeaways slide. Never invent numbers.`;

export async function POST(req: Request) {
  const caller = await guard("express");
  if (caller instanceof Response) return caller;

  // Defensive parse: malformed JSON used to throw here and surface as an
  // unhandled 500 rather than a 400.
  const {
    mode,
    thesis,
    synthesis: rawSynthesis,
    sourceTitle,
    settings: rawSettings,
    voice,
    avoid,
  } = (await req.json().catch(() => ({}))) as Body;

  const explain = mode === "explain";
  const synthesis = rawSynthesis ?? thesis?.synthesis;

  if (explain && !synthesis?.happened) {
    return Response.json({ error: "no_synthesis" }, { status: 400 });
  }
  if (!explain && !thesis?.statement) {
    return Response.json({ error: "no_thesis" }, { status: 400 });
  }

  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "express");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  // An explainer is deliberately voiceless — it isn't your opinion, so it
  // shouldn't be written as though it were.
  const vb = explain ? "" : voiceBlock(voice);
  const base = explain ? EXPLAINER_SYSTEM : EXPRESSOR_SYSTEM;
  const system = vb ? `${base}\n\n${vb}` : base;

  // Filter by id, never by instruction: asking the model to "avoid X" leaves it
  // free to pick X anyway. Both lists fall back to the full catalog if avoiding
  // everything would leave nothing legal to choose.
  const taken = new Set(avoid?.designIds ?? []);
  const freeDesigns = DESIGNS.filter((d) => !taken.has(d.id));
  const designList = (freeDesigns.length ? freeDesigns : DESIGNS)
    .map((d) => `- ${d.id}: ${d.name} (${d.mode})`)
    .join("\n");

  const context = explain
    ? sourceBreakdown(synthesis!, sourceTitle)
    : thesisContext(thesis!, synthesis);

  const different = avoid?.formats?.length
    ? `\n\nI already have a version using the ${avoid.formats.join(" and ")} format. Pick a genuinely DIFFERENT format this time and structure the deck around its beats — not the same deck reworded.`
    : "";

  try {
    const output = await generateStructured({
      ms,
      schema: CarouselSchema,
      system,
      label: explain ? "explain" : "express",
      prompt: `${context}

AVAILABLE FORMATS — pick the ONE that best fits this topic and set "format":
${formatCatalog()}

AVAILABLE STYLES — pick the ONE whose mood fits this topic and set "designId":
${designList}

${explain ? EXPLAIN_TASK : EXPRESS_TASK}${different}`,
    });
    const designId = DESIGNS.some((d) => d.id === output.designId) ? output.designId : "paper";
    const format = FORMAT_IDS.includes(output.format ?? "") ? output.format : undefined;
    return Response.json({ slides: output.slides.map(normalizeSlide), designId, format });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "express_failed" }, { status: 500 });
  }
}
