import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate";
import { modelReady } from "@/lib/ai/model";
import { requireUser } from "@/lib/api-guard";
import type { Provider, Synthesis, Thesis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Eval / benchmark harness (dev-only). Runs a fixed golden set through the real
 * synthesize → express pipeline, scores each output with an LLM judge, and — for
 * grounded news items — deterministically checks that the synthesis's citations
 * are verbatim from the source (the anti-hallucination core). Returns per-item
 * scores + averages so quality is MEASURABLE and regressions are visible.
 * Judge defaults to OpenAI; override with JUDGE_PROVIDER / JUDGE_MODEL. Run:
 * POST /api/eval.
 */
const GROUNDED_SOURCE =
  "Researchers introduced a router for mixture-of-experts models that selects two of sixty-four experts per token using a learned gating network. They report a 41% reduction in inference FLOPs at matched perplexity on their internal benchmark, and note the gains shrink to 12% on long-context inputs above 32k tokens. The router adds 3% training overhead and requires an auxiliary load-balancing loss to avoid expert collapse.";

const GOLDEN: { id: string; topic: string; input: string; kind?: "news"; sourceTitle?: string }[] = [
  { id: "redis-mem", topic: "Redis performance", input: "Redis is fast mainly because it keeps data in memory instead of on disk." },
  { id: "o1-process", topic: "OpenAI o1 reasoning", input: "o1's reasoning gains come from training process (RL on verifiable rewards), not just bigger scale." },
  { id: "agents-saas", topic: "AI agents vs SaaS", input: "AI agents will make most SaaS dashboards obsolete within two years." },
  { id: "moe-grounded", topic: "Mixture-of-experts routing", kind: "news", sourceTitle: "A cheaper MoE router", input: GROUNDED_SOURCE },
];

const SynScore = z.object({ grounding: z.number(), clarity: z.number(), neutrality: z.number(), notes: z.string() });
const CarScore = z.object({ faithful: z.number(), sharp: z.number(), noFabrication: z.number(), quality: z.number(), notes: z.string() });

interface ResultOk {
  id: string;
  slides: number;
  synthesis: z.infer<typeof SynScore>;
  carousel: z.infer<typeof CarScore>;
  citationFaithfulness?: number | null; // fraction of citations that are verbatim from source (news items)
}
interface ResultErr {
  id: string;
  error: string;
}

function judgeMs() {
  return {
    provider: (process.env.JUDGE_PROVIDER as Provider | undefined) ?? "openai",
    model: process.env.JUDGE_MODEL ?? "gpt-5.5",
  };
}

// Normalize for verbatim matching: drop quote/dash/ellipsis punctuation the model
// often adds around quotes (so a genuine verbatim quote still matches the source).
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’“”'"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "eval is dev-only" }, { status: 403 });
  const caller = await requireUser();
  if (caller instanceof Response) return caller;

  const origin = new URL(req.url).origin;
  // The harness deliberately drives the real HTTP routes, and those are now
  // gated — so it forwards the caller's session cookie. Run it with a signed-in
  // browser's cookie (curl -b) rather than a bare request.
  const cookie = req.headers.get("cookie") ?? "";
  const headers = { "content-type": "application/json", cookie };

  const jms = judgeMs();
  if (!modelReady(jms)) return Response.json({ error: "no judge model key" }, { status: 400 });

  const results: (ResultOk | ResultErr)[] = [];
  for (const g of GOLDEN) {
    try {
      const isNews = g.kind === "news";
      const synRes = await fetch(`${origin}/api/synthesize`, {
        method: "POST",
        headers,
        body: JSON.stringify(isNews ? { input: g.input, kind: "news", sourceTitle: g.sourceTitle, settings: {} } : { input: g.input, kind: "thought", settings: {} }),
      });
      const synthesis = (await synRes.json()) as Synthesis;

      // Deterministic citation faithfulness: are the quotes actually in the source?
      let citationFaithfulness: number | null = null;
      if (isNews && Array.isArray(synthesis.citations) && synthesis.citations.length) {
        const src = norm(g.input);
        const hits = synthesis.citations.filter((c) => src.includes(norm(c))).length;
        citationFaithfulness = +(hits / synthesis.citations.length).toFixed(2);
      }

      const statement = isNews ? `${g.topic}: this is a real, useful advance worth understanding.` : g.input;
      const thesis: Thesis = { id: crypto.randomUUID(), topic: g.topic, statement, confidence: "med", synthesis, createdAt: new Date().toISOString(), status: "active" };
      const expRes = await fetch(`${origin}/api/express`, {
        method: "POST",
        headers,
        body: JSON.stringify({ thesis, synthesis, settings: {} }),
      });
      const exp = (await expRes.json()) as { slides?: { headline?: string; body?: string; module?: { type?: string }; brand?: { slug?: string } }[] };
      const slides = exp.slides ?? [];

      const synScore = await generateStructured({
        ms: jms,
        schema: SynScore,
        label: "judge-syn",
        system: "You are a strict, skeptical evaluator of analytical writing. Score 1 (poor) to 5 (excellent). Be harsh; reserve 5 for genuinely excellent work.",
        prompt: `INPUT:\n"${g.input}"\n\nSYNTHESIS produced:\n${JSON.stringify(synthesis)}\n\nScore 1-5:\n- grounding: stays to the input; no invented specifics or figures.\n- clarity: plain language, no hype words, no undefined jargon.\n- neutrality: does NOT tell the reader what to conclude.\nAdd one-line notes.`,
      });

      const carScore = await generateStructured({
        ms: jms,
        schema: CarScore,
        label: "judge-car",
        system: "You are a strict editor of social carousels. Score 1-5; be harsh.",
        prompt: `THESIS:\n"${statement}"\n\nNEWS/SYNTHESIS CONTEXT the slides may legitimately draw facts from:\n${JSON.stringify({ happened: synthesis.happened, newVsRepackaged: synthesis.newVsRepackaged, keyDebate: synthesis.keyDebate, implications: synthesis.implications, citations: synthesis.citations })}\n\nGENERATED CAROUSEL SLIDES (JSON):\n${JSON.stringify(slides.map((s) => ({ headline: s.headline, body: s.body, module: s.module?.type, brand: s.brand?.slug })))}\n\nScore 1-5:\n- faithful: expresses the thesis without drifting or contradicting it.\n- sharp: opinionated and concrete, not mushy.\n- noFabrication: numbers/facts are FINE if they appear in the thesis OR the NEWS/SYNTHESIS CONTEXT above; penalize only facts/numbers invented beyond BOTH.\n- quality: clear, well-structured, strong hook.\nAdd one-line notes.`,
      });

      results.push({ id: g.id, slides: slides.length, synthesis: synScore, carousel: carScore, citationFaithfulness });
    } catch (e) {
      results.push({ id: g.id, error: (e as Error).message });
    }
  }

  const ok = results.filter((r): r is ResultOk => !("error" in r));
  const avg = (sel: (r: ResultOk) => number) => (ok.length ? +(ok.reduce((a, r) => a + sel(r), 0) / ok.length).toFixed(2) : null);
  const cited = ok.filter((r) => typeof r.citationFaithfulness === "number");
  const averages = {
    synthesis: { grounding: avg((r) => r.synthesis.grounding), clarity: avg((r) => r.synthesis.clarity), neutrality: avg((r) => r.synthesis.neutrality) },
    carousel: { faithful: avg((r) => r.carousel.faithful), sharp: avg((r) => r.carousel.sharp), noFabrication: avg((r) => r.carousel.noFabrication), quality: avg((r) => r.carousel.quality) },
    citationFaithfulness: cited.length ? +(cited.reduce((a, r) => a + (r.citationFaithfulness ?? 0), 0) / cited.length).toFixed(2) : null,
  };
  return Response.json({ judge: jms, count: ok.length, averages, results });
}
