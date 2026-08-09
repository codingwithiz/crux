import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for the shipped product.
 *
 * The server these run against is pinned in playwright.config: no Supabase (so
 * pages aren't gated and API routes answer with their own validation errors
 * rather than 401) and MOCK_LLM=1 (so model calls are instant and free). The
 * login gate gets its own spec, which boots a configured server on purpose.
 */

test("landing states the value chain and both ways in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /worth reading/i })).toBeVisible();
  await expect(page.getByText("Information", { exact: true })).toBeVisible();
  await expect(page.getByText("Opinion", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start from the news/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start from your own idea/i })).toBeVisible();
});

test("every nav surface resolves", async ({ page }) => {
  // Five intent surfaces plus You — flat, no dropdowns.
  const surfaces = [
    ["Today", "/today", /conviction/i],
    ["Explore", "/explore", /Explore/i],
    ["Think", "/think", /Think/i],
    ["Studio", "/studio", /Studio/i],
    ["Ledger", "/ledger", /Ledger/i],
    ["You", "/voice", /You/i],
  ] as const;

  for (const [label, href, heading] of surfaces) {
    await page.goto("/today");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("renamed and retired routes still land somewhere sensible", async ({ page }) => {
  await page.goto("/news");
  await expect(page).toHaveURL(/\/explore$/);

  await page.goto("/brief");
  await expect(page).toHaveURL(/\/explore$/);

  // Queue was removed along with the scheduling that never did anything.
  const gone = await page.request.get("/queue");
  expect(gone.status()).toBe(404);
});

test("explore lists items and offers curation", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByText("Curated for you")).toBeVisible();
  await expect(page.getByRole("button", { name: /Curate top picks/i })).toBeVisible();
  await expect(page.getByText("All signal, ranked")).toBeVisible();
});

test("opening a feed item costs nothing until you ask", async ({ page }) => {
  // Served from a fixture rather than the live aggregator: this asserts a UI
  // contract, and shouldn't fail because Hacker News was slow.
  await page.route("**/api/news", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "fixture-1",
            source: "hn",
            title: "A cheaper mixture-of-experts router",
            url: "https://example.com/moe",
            meta: "412 points · HN",
            detail: "Selects two of sixty-four experts per token.",
            score: 412,
          },
        ],
      },
    }),
  );

  // A synthesis is the expensive step; expanding must not trigger one.
  let synthesized = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/synthesize")) synthesized = true;
  });

  await page.goto("/explore");
  const item = page.getByRole("button", { name: /cheaper mixture-of-experts router/i });
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("aria-expanded", "false");

  await item.click();
  await expect(item).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: /Synthesize/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Read source/i })).toBeVisible();
  expect(synthesized).toBe(false);
});

test("today shows a pick with a way to read it first", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByText(/Today.s conviction/)).toBeVisible();
  await expect(page.getByText("day streak")).toBeVisible();
});

test("studio without a draft says so instead of showing a stranger's deck", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: /Studio/i }).first()).toBeVisible();
  await expect(page.getByText(/Nothing to edit yet/i)).toBeVisible();
});

test("you page loads the voice and interests editors", async ({ page }) => {
  await page.goto("/voice");
  await expect(page.getByRole("heading", { name: "You", exact: true })).toBeVisible();
  await expect(page.getByText(/built-in default voice/i)).toBeVisible();
  await expect(page.getByLabel("Add an interest")).toBeVisible();
  await expect(page.getByPlaceholder(/Paste one of your posts/i).first()).toBeVisible();
});

test("guide explains the current screens", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: /How Crux works/i })).toBeVisible();
  await expect(page.getByText(/your first conviction/i)).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Sign in|Create account/i })).toBeVisible();
});

// ── API surface ────────────────────────────────────────────────────────────
// Without Supabase configured the guard allows through, so these exercise each
// route's own validation rather than the auth layer.

test("news API returns live items", async ({ request }) => {
  const res = await request.get("/api/news");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { items?: unknown[] };
  expect(Array.isArray(body.items)).toBe(true);
});

test("radar read endpoint returns a snapshot shape", async ({ request }) => {
  const res = await request.get("/api/radar");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toHaveProperty("snapshot");
});

test("routes reject empty input rather than calling a model", async ({ request }) => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["/api/synthesize", {}, "empty"],
    ["/api/hints", {}, "no_question"],
    ["/api/voice", { samples: [] }, "no_samples"],
    ["/api/revoice", { slides: [] }, "no_slides"],
    ["/api/express", {}, "no_thesis"],
    ["/api/express", { mode: "explain" }, "no_synthesis"],
  ];
  for (const [url, body, error] of cases) {
    const res = await request.post(url, { data: body });
    expect(res.status(), url).toBe(400);
    expect((await res.json()).error, url).toBe(error);
  }
});

test("express handles malformed JSON as a bad request, not a crash", async ({ request }) => {
  const res = await request.post("/api/express", {
    headers: { "content-type": "application/json" },
    data: "{not json",
  });
  expect(res.status()).toBe(400);
});

test("cron refuses to run without its secret", async ({ request }) => {
  const res = await request.get("/api/cron/radar");
  expect(res.status()).toBe(500);
  expect((await res.json()).error).toBe("cron_secret_unset");
});
