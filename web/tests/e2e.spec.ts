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

test("AI routes guard correctly without a model key", async ({ page }) => {
  // With no settings/key, synthesize should refuse rather than 500.
  const res = await page.request.post("/api/synthesize", {
    data: { input: "test", kind: "thought", settings: { provider: "google", apiKey: "" } },
  });
  expect([400, 200]).toContain(res.status()); // 400 no_model when no env key; 200 if env key present
});
