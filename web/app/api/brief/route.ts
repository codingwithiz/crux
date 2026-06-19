import { z } from "zod";
import { modelReady } from "@/lib/ai/model";
import { generateStructured } from "@/lib/ai/generate";
import { stepModelSettings } from "@/lib/ai/routing";
import { resolveServerSettings } from "@/lib/ai/server-settings";
import { CURATOR_SYSTEM } from "@/lib/ai/prompts";
import { getNews } from "@/lib/sources";
import type { BriefPick, Settings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  picks: z
    .array(
      z.object({
        id: z.string(),
        whyItMatters: z.string(),
        relevance: z.string(),
      }),
    )
    .min(1)
    .max(5),
});

interface Body {
  theses?: { topic: string; statement: string }[];
  settings?: Settings;
}

export async function POST(req: Request) {
  const { theses, settings: rawSettings } = (await req.json().catch(() => ({}))) as Body;
  const settings = await resolveServerSettings(rawSettings);
  const ms = stepModelSettings(settings, "synthesize");
  if (!modelReady(ms)) return Response.json({ error: "no_model" }, { status: 400 });

  const items = await getNews();
  if (!items.length) return Response.json({ picks: [] });

  const candidates = items.map((i) => ({
    id: i.id,
    source: i.source,
    title: i.title,
    detail: (i.detail ?? "").slice(0, 240),
  }));
  const priors =
    (theses ?? [])
      .slice(0, 12)
      .map((t) => `- ${t.topic}: ${t.statement}`)
      .join("\n") || "(none yet)";

  try {
    const output = await generateStructured({
      ms,
      schema: Schema,
      system: CURATOR_SYSTEM,
      label: "brief",
      prompt: `Today's candidate items (JSON):\n${JSON.stringify(candidates)}\n\nMy existing theses:\n${priors}\n\nSelect the 3-5 items most worth forming an opinion on, using the exact id values above.`,
    });

    const byId = new Map(items.map((i) => [i.id, i]));
    const picks: BriefPick[] = output.picks
      .map((p) => {
        const item = byId.get(p.id);
        return item ? { ...item, whyItMatters: p.whyItMatters, relevance: p.relevance } : null;
      })
      .filter((p): p is BriefPick => p !== null);

    return Response.json({ picks });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "brief_failed" }, { status: 500 });
  }
}
