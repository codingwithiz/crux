import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { SYNTHESIZER_SYSTEM, GROUNDED_SYNTHESIZER_SYSTEM } from "@/lib/ai/prompts";
import { fetchReadable } from "@/lib/extract";
import { verifyCitations } from "@/lib/citations";
import type { Settings } from "@/lib/types";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  plainEnglish: z.string(),
  happened: z.string(),
  newVsRepackaged: z.string(),
  keyDebate: z.string(),
  skepticCase: z.string(),
  implications: z.array(z.string()),
  questions: z.array(z.string()),
  citations: z.array(z.string()).default([]),
});

interface Body {
  input?: string;
  kind?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  settings?: Settings;
}

const ASK = `Return the synthesis: FIRST "plainEnglish" — a 2-3 sentence explanation a smart non-expert could follow, no jargon (or define any term you must use), as if explaining to a friend. Then: what happened, what is genuinely new vs. repackaged, the single biggest debate or uncertainty, the skeptic's strongest case, 1-3 concrete second-order implications, and exactly 3 questions I must answer before I have a publishable opinion.`;

export async function POST(req: Request) {
  const caller = await guard("synthesize");
  if (caller instanceof Response) return caller;

  const { input, kind, sourceTitle, sourceUrl, settings: rawSettings } = (await req
    .json()
    .catch(() => ({}))) as Body;

  if (!input || !input.trim()) return Response.json({ error: "empty" }, { status: 400 });
  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "synthesize");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  // News path: retrieve the actual source text and synthesize ONLY from it
  // (the plan's anti-hallucination requirement). The thought path has no
  // external source to ground in, so it stays on the parametric prompt.
  let grounded = false;
  let system = SYNTHESIZER_SYSTEM;
  let prompt: string;

  // The material the model is allowed to draw on, and the exact text every
  // quote is later checked against.
  let material = "";

  if (kind === "news") {
    const fetched = sourceUrl ? await fetchReadable(sourceUrl) : null;
    material = [
      sourceTitle ? `Title: ${sourceTitle}` : "",
      input.trim() ? `Summary: ${input.trim()}` : "",
      fetched ? `Article text:\n${fetched}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    // "Grounded" = we have real source prose to cite (fetched text, or a
    // substantial provided summary), not just a bare headline.
    grounded = Boolean(fetched) || input.trim().length > 200;
    if (grounded) {
      system = GROUNDED_SYNTHESIZER_SYSTEM;
      prompt = `SOURCE MATERIAL (synthesize ONLY from this):\n"""\n${material}\n"""\n\n${ASK}\nThen fill "citations" with 2-4 short verbatim quotes from the SOURCE MATERIAL above.`;
    } else {
      material = "";
      prompt = `A trending AI/tech item.\nTitle: ${sourceTitle ?? ""}\nDetails: ${input}\n\n${ASK}`;
    }
  } else {
    prompt = `My raw take / thought:\n"${input}"\n\n${ASK}`;
  }

  try {
    const output = await generateStructured({ ms, schema: Schema, system, prompt, label: "synthesize" });
    // Verify the receipts before they ever reach the user. The model is asked
    // for verbatim quotes; this is what confirms it obliged.
    //
    // With no source material there are no receipts to give: asked anyway, the
    // model happily produces citation-shaped text with invented URLs. Showing
    // that under a "quotes from the source" heading would be a lie no per-quote
    // badge can undo, so drop them entirely.
    const citations = material
      ? verifyCitations(output.citations ?? [], material, { url: sourceUrl, title: sourceTitle })
      : [];
    const source = sourceTitle ? { title: sourceTitle, url: sourceUrl } : undefined;
    return Response.json({ ...output, citations, grounded, source });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "synthesis_failed" }, { status: 500 });
  }
}
