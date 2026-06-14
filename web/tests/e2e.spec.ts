import { test, expect } from "@playwright/test";

// Smoke E2E for the surface that needs no auth or model keys.
// The auth / AI / re-surfacing flows require your keys + migrations — see
// the manual cases in ../../TEST_CASES.md.

test("landing shows the value chain and both entry cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /worth reading/i })).toBeVisible();
  await expect(page.getByText("Information", { exact: true })).toBeVisible();
  await expect(page.getByText("Opinion", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /From the news/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /From your thought/i })).toBeVisible();
});

test("all nav routes resolve", async ({ page }) => {
  const routes: [string, RegExp][] = [
    ["Brief", /\/brief/],
    ["Think", /\/think/],
    ["News", /\/news/],
    ["Studio", /\/studio/],
    ["Gallery", /\/gallery/],
    ["Voice", /\/voice/],
    ["Ledger", /\/ledger/],
  ];
  for (const [label, urlRe] of routes) {
    await page.goto("/");
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(urlRe);
  }
});

test("studio renders and the slide PNG route returns an image", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: /Carousel Studio/i })).toBeVisible();
  await expect(page.getByPlaceholder("Carousel title")).toBeVisible();

  const payload = encodeURIComponent(
    JSON.stringify({
      slide: { kind: "hook", kicker: "THE TAKE", title: "E2E render check", body: "ok" },
      themeId: "ink",
      index: 0,
      total: 1,
      handle: "@you",
    }),
  );
  const res = await page.request.get(`/api/slide?d=${payload}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("studio auto-generates the carousel images on load", async ({ page }) => {
  await page.goto("/studio");
  // The "Generated carousel" panel renders each slide to a real PNG via
  // /api/slide and shows them as <img>. Wait for the auto-render to finish.
  await expect(page.getByText("Generated carousel")).toBeVisible();
  const firstImg = page.getByRole("img", { name: "Slide 1" });
  await expect(firstImg).toBeVisible({ timeout: 20000 });
  // The img src must be an object URL backed by the rendered PNG blob.
  await expect(firstImg).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("button", { name: /Download all/i })).toBeEnabled();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Sign in|Create account/i })).toBeVisible();
});

test("news API returns live items", async ({ page }) => {
  const res = await page.request.get("/api/news");
  expect(res.status()).toBe(200);
  const json = (await res.json()) as { items?: unknown[] };
  expect(Array.isArray(json.items)).toBeTruthy();
});

test("voice page loads the editor with the built-in default", async ({ page }) => {
  await page.goto("/voice");
  await expect(page.getByRole("heading", { name: /Your voice/i })).toBeVisible();
  await expect(page.getByText(/built-in default voice/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Paste one of your posts/i).first()).toBeVisible();
  // The default voice guide should have populated the guide textarea.
  await expect(page.getByPlaceholder(/Distill from your samples/i)).not.toBeEmpty();
});

test("voice distill API rejects empty input", async ({ page }) => {
  const res = await page.request.post("/api/voice", { data: { samples: [] } });
  expect(res.status()).toBe(400);
  const j = (await res.json()) as { error?: string };
  expect(j.error).toBe("no_samples");
});

test("revoice API rejects empty slides", async ({ page }) => {
  const res = await page.request.post("/api/revoice", { data: { slides: [] } });
  expect(res.status()).toBe(400);
  const j = (await res.json()) as { error?: string };
  expect(j.error).toBe("no_slides");
});

test("studio shows the rewrite-in-my-voice action", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: /Rewrite in my voice/i })).toBeVisible();
});

test("radar read endpoint returns a snapshot shape", async ({ page }) => {
  // null without Supabase / before the 0006 migration; an object once a scan ran.
  const res = await page.request.get("/api/radar");
  expect(res.status()).toBe(200);
  const json = (await res.json()) as Record<string, unknown>;
  expect("snapshot" in json).toBeTruthy();
});

test("radar cron scans sources and reports a digest", async ({ page }) => {
  const res = await page.request.get("/api/cron/radar", { timeout: 30000 });
  expect(res.status()).toBe(200);
  const json = (await res.json()) as { ok?: boolean; count?: number; persisted?: boolean };
  expect(json.ok).toBeTruthy();
  expect(typeof json.count).toBe("number");
  // persisted only when SUPABASE_SERVICE_ROLE_KEY is set; assert it's a boolean.
  expect(typeof json.persisted).toBe("boolean");
});

test("AI routes guard correctly without a model key", async ({ page }) => {
  // With no settings/key, synthesize should refuse rather than 500.
  const res = await page.request.post("/api/synthesize", {
    data: { input: "test", kind: "thought", settings: { provider: "google", apiKey: "" } },
  });
  expect([400, 200]).toContain(res.status()); // 400 no_model when no env key; 200 if env key present
});
