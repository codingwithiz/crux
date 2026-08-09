import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate";
import { modelReady } from "@/lib/ai/model";
import { requireUser } from "@/lib/api-guard";
import { asCitations, citationFaithfulness as faithfulness } from "@/lib/citations";
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

/** A source whose numbers are stated loosely, to see whether a quote gets
 *  "tightened" into something the text never said. */
const HEDGED_SOURCE =
  "The team reports that throughput roughly doubled on their hardware, though they caution the measurement was taken on a single node and may not generalize. Latency was broadly unchanged. They describe the approach as promising but say a fair comparison against tuned baselines is still outstanding, and decline to give a figure for memory overhead.";

/** Marketing copy: heavy on adjectives, thin on facts. Grounded synthesis should
 *  stay thin too rather than inventing substance to fill the shape. */
const HYPE_SOURCE =
  "Today we are thrilled to unveil a revolutionary leap forward that fundamentally reimagines how teams work with data. Our groundbreaking platform delivers unprecedented performance and transformative insights, empowering everyone to unlock the full potential of their workflows. This is a paradigm shift for the entire industry.";

const GOLDEN: { id: string; topic: string; input: string; kind?: "news"; sourceTitle?: string }[] = [
  // Thought path: no retrieval, so these measure reasoning and register.
  { id: "redis-mem", topic: "Redis performance", input: "Redis is fast mainly because it keeps data in memory instead of on disk." },
  { id: "o1-process", topic: "OpenAI o1 reasoning", input: "o1's reasoning gains come from training process (RL on verifiable rewards), not just bigger scale." },
  { id: "agents-saas", topic: "AI agents vs SaaS", input: "AI agents will make most SaaS dashboards obsolete within two years." },
  { id: "rag-dead", topic: "RAG vs long context", input: "Long context windows make RAG unnecessary for most products." },
  { id: "evals-moat", topic: "Evaluation", input: "Evals are a bigger moat than model choice for AI products." },
  { id: "oss-gap", topic: "Open-weight models", input: "Open-weight models have closed the gap for everyday coding work." },
  { id: "agent-frameworks", topic: "Agent frameworks", input: "Most agent frameworks add indirection without adding capability." },

  // News path: retrieval + verbatim citation checking.
  { id: "moe-grounded", topic: "Mixture-of-experts routing", kind: "news", sourceTitle: "A cheaper MoE router", input: GROUNDED_SOURCE },
  { id: "hedged-grounded", topic: "Throughput claims", kind: "news", sourceTitle: "Throughput roughly doubled", input: HEDGED_SOURCE },
  { id: "hype-grounded", topic: "Launch announcement", kind: "news", sourceTitle: "A revolutionary leap forward", input: HYPE_SOURCE },
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

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "eval is dev-only" }, { status: 403 });
  const caller = await requireUser();
  if (caller instanceof Response) return caller;

  // Each item costs four model calls, so the full set will outlast a serverless
  // budget as it grows. `ids` runs a subset — a smoke set on demand, everything
  // when you actually want the number.
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const golden = body.ids?.length ? GOLDEN.filter((g) => body.ids!.includes(g.id)) : GOLDEN;
  if (!golden.length) return Response.json({ error: "no matching ids" }, { status: 400 });

  const startedAt = Date.now();
  const origin = new URL(req.url).origin;
  // The harness deliberately drives the real HTTP routes, and those are now
  // gated — so it forwards the caller's session cookie. Run it with a signed-in
  // browser's cookie (curl -b) rather than a bare request.
  const cookie = req.headers.get("cookie") ?? "";
  const headers = { "content-type": "application/json", cookie };

  const jms = judgeMs();
  if (!modelReady(jms)) return Response.json({ error: "no judge model key" }, { status: 400 });

  const results: (ResultOk | ResultErr)[] = [];
  for (const g of golden) {
    try {
      const isNews = g.kind === "news";
      const synRes = await fetch(`${origin}/api/synthesize`, {
        method: "POST",
        headers,
        body: JSON.stringify(isNews ? { input: g.input, kind: "news", sourceTitle: g.sourceTitle, settings: {} } : { input: g.input, kind: "thought", settings: {} }),
      });
      const synthesis = (await synRes.json()) as Synthesis;

      // Verification now runs in the synthesize route itself, so the harness
      // reports the same number users see rather than recomputing its own.
      const citationFaithfulness = isNews ? faithfulness(asCitations(synthesis.citations)) : null;

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
  // A run where most items crashed used to look identical to a clean one:
  // failures were dropped from `count` and `averages` and never reported. A
  // history entry also needs to say when it ran and against what, or comparing
  // two of them means nothing.
  return Response.json({
    ranAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    durationMs: Date.now() - startedAt,
    judge: jms,
    attempted: golden.length,
    count: ok.length,
    failed: results.length - ok.length,
    averages,
    results,
  });
}
