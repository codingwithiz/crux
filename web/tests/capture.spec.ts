import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * The screenshot rig, run on demand rather than in CI.
 *
 * `docs/` carried four images from a product three redesigns old — the README's
 * only visual evidence showed screens that no longer existed. This regenerates
 * them from the running app with a seeded account, so the pictures can't drift
 * from the code again without someone noticing.
 *
 *   npx playwright test tests/capture.spec.ts --project=browser
 *
 * Skipped unless CAPTURE=1, because it writes files into the repo and a normal
 * test run should not.
 */
const OUT = "../docs";
const run = process.env.CAPTURE === "1";

test.describe.configure({ mode: "serial" });
test.skip(!run, "set CAPTURE=1 to regenerate docs/ screenshots");

/** A believable account: a few saved takes, one scored, topics followed. */
const SEED = {
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
const FEED = {
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

async function seed(page: Page) {
  await page.addInitScript((data: Record<string, string>) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, SEED);
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

async function shot(page: Page, path: string, name: string, wait = 2500) {
  await page.goto(path);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

const VIEWS: [string, string][] = [
  ["/", "landing"],
  ["/today", "today"],
  ["/explore", "explore"],
  ["/think", "think"],
  ["/ledger", "ledger"],
  ["/studio", "studio"],
  ["/gallery", "library"],
  ["/voice", "you"],
  ["/guide", "guide"],
];

test("desktop", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  for (const [path, name] of VIEWS) await shot(page, path, name);
});

test("mobile", async ({ page }) => {
  // The three components that shipped with zero responsive classes.
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  for (const [path, name] of [
    ["/today", "mobile-today"],
    ["/studio", "mobile-studio"],
    ["/explore", "mobile-explore"],
  ] as [string, string][]) {
    await shot(page, path, name);
  }
});
