import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, modelReady } from "@/lib/ai/model";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { SYNTHESIZER_SYSTEM, GROUNDED_SYNTHESIZER_SYSTEM } from "@/lib/ai/prompts";
import { fetchReadable } from "@/lib/extract";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
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

const ASK = `Return the synthesis: what happened, what is genuinely new vs. repackaged, the single biggest debate or uncertainty, the skeptic's strongest case, 1-3 concrete second-order implications, and exactly 3 questions I must answer before I have a publishable opinion.`;

export async function POST(req: Request) {
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

  if (kind === "news") {
    const fetched = sourceUrl ? await fetchReadable(sourceUrl) : null;
    const material = [
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
      prompt = `A trending AI/tech item.\nTitle: ${sourceTitle ?? ""}\nDetails: ${input}\n\n${ASK}`;
    }
  } else {
    prompt = `My raw take / thought:\n"${input}"\n\n${ASK}`;
  }

  try {
    const { output } = await generateText({
      model: getModel(ms),
      output: Output.object({ schema: Schema }),
      system,
      prompt,
    });
    return Response.json({ ...output, grounded });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "synthesis_failed" }, { status: 500 });
  }
}
