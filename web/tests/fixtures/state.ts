import type { Page } from "@playwright/test";
import type { Synthesis } from "@/lib/types";

/**
 * The seeded account both screenshot rigs run against.
 *
 * Lives here rather than inside capture.spec.ts so the per-phase design capture
 * shows the same believable state — otherwise the two sets of screenshots are
 * of two different products and can't be compared.
 */

/** A believable account: a few saved takes, one scored, topics followed. */
export const SEED: Record<string, string> = {
  "ce.voice": JSON.stringify({
    samples: [],
    emoji: true,
    guide: "Direct, concrete, results-first.",
    tone: "direct, concrete",
    interests: ["agents", "evals"],
    updatedAt: "2026-08-01T00:00:00.000Z",
  }),
  "ce.brandkit": JSON.stringify({ handle: "@you" }),
  "ce.ledger": JSON.stringify([
    {
      id: "a1", topic: "AI agents", confidence: "high", status: "active",
      statement: "Agents will eat the dashboard, not the database — the opinions are the part a model can hold.",
      evidenceFor: "Every SaaS surface I use is a table with a workflow bolted on.",
      steelman: "Dashboards persist because auditability is a product feature, not a UI habit.",
      createdAt: "2026-07-02T10:00:00.000Z", outcome: "held", resolvedAt: "2026-08-01T10:00:00.000Z",
      source: { title: "The state of agentic products", url: "https://example.com/agents" },
    },
    {
      id: "a2", topic: "Evaluation", confidence: "med", status: "active",
      statement: "Evals are a bigger moat than model choice: the model is rented, the measurement is owned.",
      createdAt: "2026-07-20T10:00:00.000Z",
    },
    {
      id: "a3", topic: "Long context", confidence: "low", status: "updated",
      statement: "Long context did not kill RAG; it moved the cost from retrieval to tokens.",
      createdAt: "2026-06-11T10:00:00.000Z", updatedAt: "2026-07-30T10:00:00.000Z", outcome: "mixed",
    },
  ]),
  "ce.draft": JSON.stringify({
    handle: "@you",
    designId: "paper",
    slides: [
      { layout: "hero", kicker: "MY TAKE", headline: "Agents will eat the dashboard, not the database", highlight: "eat the dashboard", body: "Every SaaS product is a table with opinions bolted on.", arrow: true },
      { layout: "explainer", kicker: "WHY", headline: "The opinion is the product", body: "A dashboard shows you numbers. A colleague tells you what they mean.", module: { type: "bigStat", value: "80%", label: "of a dashboard is a query someone could ask" } },
      { layout: "statement", kicker: "THE CATCH", headline: "Auditability is a feature, not a habit", body: "The strongest counter: regulated work needs the table." },
    ],
    context: { mode: "express", format: "contrarian", thesis: { id: "a1", topic: "AI agents", statement: "Agents will eat the dashboard.", confidence: "high", createdAt: "2026-07-02T10:00:00.000Z", status: "active" } },
  }),
};

/** A fixed feed, so the docs show the same page every time and don't depend on
 *  what Hacker News happened to be doing. */
export const FEED = {
  items: [
    {
      id: "n1", source: "news", score: Math.floor(Date.now() / 60_000) - 90,
      title: "A cheaper mixture-of-experts router cuts inference FLOPs by 41%",
      url: "https://example.com/moe-router", meta: "MIT Tech Review",
      detail: "The router selects two of sixty-four experts per token using a learned gating network. Gains shrink to 12% on long-context inputs above 32k tokens.",
    },
    {
      id: "n2", source: "hn", score: 412, title: "Show HN: an eval harness for long-running agents",
      url: "https://example.com/evals", meta: "412 points · HN",
      detail: "Scores agent trajectories rather than final answers, with a deterministic replay mode.",
    },
    {
      id: "n3", source: "arxiv", score: Math.floor(Date.now() / 60_000) - 300,
      title: "Selective context preference optimization", url: "https://example.com/scpo",
      meta: "arXiv", detail: "Learning when to trust retrieved context instead of parametric memory.",
    },
    {
      id: "n4", source: "github", score: 2100, title: "openclaw/openclaw", url: "https://example.com/gh",
      meta: "2.1k stars · GitHub", detail: "An open agent runtime with a filesystem-first tool model.",
    },
  ],
};

/**
 * A finished synthesis, so Think can be photographed in the state it spends
 * almost all its time in without spending a model call to get there.
 */
export const SYNTHESIS: Synthesis = {
  plainEnglish:
    "A new router picks two of sixty-four expert sub-models per token instead of running all of them, which cuts the arithmetic per answer by about 41%. The saving is real but shrinks to around 12% once the input passes 32,000 tokens — which is where most production traffic actually sits.",
  happened:
    "Researchers published a mixture-of-experts router that reduces inference FLOPs by 41% on standard benchmarks by selecting two of sixty-four experts per token through a learned gating network.",
  newVsRepackaged:
    "Mixture-of-experts routing is five years old. What is new is the gating network being trained jointly with the experts rather than bolted on afterwards, which is what keeps quality flat while the compute falls.",
  keyDebate:
    "Whether a FLOP reduction measured on short benchmark inputs survives contact with production traffic, where long contexts dominate and the reported gain drops to 12%.",
  skepticCase:
    "FLOPs are not latency and not cost. Sparse routing adds memory traffic and scheduling overhead that a dense model does not pay, and at 12% the saving may not clear that overhead at all.",
  implications: [
    "Inference cost curves bend on routing, not only on model size.",
    "Benchmarks measured at short context lengths will overstate production savings.",
  ],
  questions: [
    "What was the wall-clock latency, not the FLOP count?",
    "At what context length does the saving stop clearing the routing overhead?",
    "Who reproduced this outside the authors' own harness?",
  ],
  citations: [
    {
      quote: "selects two of sixty-four experts per token using a learned gating network",
      sourceTitle: "MIT Tech Review",
      url: "https://example.com/moe-router",
      verified: true,
    },
    {
      quote: "Gains shrink to 12% on long-context inputs above 32k tokens",
      sourceTitle: "MIT Tech Review",
      url: "https://example.com/moe-router",
      verified: true,
    },
    {
      quote: "the routing overhead is amortized across the batch",
      sourceTitle: "MIT Tech Review",
      url: "https://example.com/moe-router",
      verified: false,
    },
  ],
  grounded: true,
  source: { title: "A cheaper mixture-of-experts router cuts inference FLOPs by 41%", url: "https://example.com/moe-router" },
};

const TAKE =
  "The 41% headline is measured where nobody runs — at production context lengths the saving is 12%, which routing overhead probably eats.";

/** ce.flow, parked at a given step of the Think flow. */
export function flowAt(step: "synth" | "adversary" | "commit", take = TAKE): string {
  return JSON.stringify({
    mode: "thought",
    step,
    input: "https://example.com/moe-router — the 41% number looks like a benchmark artifact to me.",
    take,
    saveId: "seed-flow-1",
    synthesis: SYNTHESIS,
    messages:
      step === "adversary"
        ? [
            { id: "m1", role: "user", parts: [{ type: "text", text: `My take: ${take}` }] },
            {
              id: "m2", role: "assistant",
              parts: [{
                type: "text",
                text: "You are treating 12% as if it were zero. Before you commit: what is the overhead you think eats it, in the same units? If routing costs are memory-bound and the saving is compute-bound, they don't cancel — they show up in different places on the bill.",
              }],
            },
            {
              id: "m3", role: "user",
              parts: [{ type: "text", text: "My evidence is: every sparse-routing deployment I've read about reports higher p99 latency, and latency is what production actually pays for." }],
            },
            {
              id: "m4", role: "assistant",
              parts: [{
                type: "text",
                text: "That is a stronger claim than the one you started with, and it is falsifiable — good. But it is now a latency argument, not a FLOPs argument. Say it that way, or a reader will check your 12% and find you were right about the wrong thing.",
              }],
            },
          ]
        : [],
    commit: {
      statement: step === "commit" ? TAKE : "",
      confidence: "med",
      evidenceFor: step === "commit" ? "Every sparse-routing deployment I've read about reports higher p99 latency, and latency is what production pays for." : "",
      steelman: step === "commit" ? "At batch scale the routing overhead is amortized, so the compute saving does reach the bill." : "",
      changeMyMind: step === "commit" ? "A wall-clock benchmark at 32k+ context showing the saving survives." : "",
      topic: step === "commit" ? "Inference cost" : "",
    },
    savedAt: new Date().toISOString(),
  });
}

/** Install localStorage state and stub the two network feeds. */
export async function seed(page: Page, extra: Record<string, string> = {}): Promise<void> {
  await page.addInitScript((data: Record<string, string>) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, { ...SEED, ...extra });
  // Fixture, not the live aggregator: docs should not change because a source
  // was slow, and the capture host may not reach these APIs at all. The two
  // feeds are split the way the real ones are — topic-fetched items carry their
  // provenance, the general scan doesn't.
  await page.route("**/api/news*", (r) => {
    const topics = new URL(r.request().url()).searchParams.get("topics");
    if (!topics) return r.fulfill({ json: { items: FEED.items.slice(2) } });
    return r.fulfill({
      json: {
        items: FEED.items.slice(0, 2).map((it, i) => ({ ...it, viaInterest: i === 0 ? "agents" : "evals" })),
      },
    });
  });
  await page.route("**/api/radar", (r) => r.fulfill({ json: { snapshot: null } }));
}
