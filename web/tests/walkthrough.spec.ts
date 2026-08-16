import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * A full, real user journey through Crux — narrated by screenshot.
 *
 * Not a CI test: it makes real LLM calls (no MOCK_LLM) against a single-user
 * instance (no Supabase, so no login) so the screenshots show the product
 * actually doing its job — real synthesis, real Coach/Spar argument, real
 * carousel generation — rather than the word "mock" in every field.
 *
 * Run with:
 *   WALKTHROUGH=1 npx playwright test --config=playwright.walkthrough.config.ts
 * That config manages its own dev server (single-user, real model calls, no
 * MOCK_LLM) — don't point this at a manually-started server; a server started
 * outside Playwright's own child-process management was observed to leave the
 * page visually correct but never attach React event handlers (hydration
 * silently no-ops), which cost real time to track down. Symptom to recognise
 * it by: every `disabled` binding stays stuck regardless of input, and dev
 * console shows a `webpack-hmr` WebSocket handshake failure.
 *
 * Skipped unless WALKTHROUGH=1, same pattern as capture.spec.ts's CAPTURE gate.
 */
const OUT = "../docs/walkthrough";
const run = process.env.WALKTHROUGH === "1";

test.skip(!run, "set WALKTHROUGH=1 to run the full narrated journey");
test.describe.configure({ mode: "serial" });
// Ceiling comes from playwright.walkthrough.config.ts (15 min) — real model
// calls throughout, no per-test override here to shadow it.

let n = 0;
/** Numbered, described screenshot — the sequence IS the walkthrough. */
async function shot(page: Page, slug: string, opts: Parameters<Page["screenshot"]>[0] = {}) {
  n += 1;
  const name = `${String(n).padStart(2, "0")}-${slug}`;
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log("shot:", name);
  // fullPage temporarily resizes the viewport to the full document height to
  // capture it, then restores it — but a `position: sticky` element (Studio's
  // toolbar, holding Export) can be left laid out against the stale expanded
  // height for a beat, so its real hit-test position disagrees with where the
  // next click expects it until something forces a reflow. Scrolling by 1px
  // and back is the standard nudge for that class of stale-sticky bug.
  if (opts.fullPage) {
    await page.evaluate(() => {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    });
  }
}

test("the whole journey", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---------- Landing ----------
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "landing-hero");
  await shot(page, "landing-full", { fullPage: true });

  // ---------- Today (zero state — nothing saved yet) ----------
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot(page, "today-empty", { fullPage: true });

  // ---------- Explore ----------
  await page.goto("/explore", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await shot(page, "explore-loading");
  await page.waitForSelector("text=Everything, ranked", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, "explore-loaded", { fullPage: true });

  // ---------- Guide ----------
  await page.goto("/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "guide", { fullPage: true });

  // ---------- You (before customization) ----------
  await page.goto("/voice", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "voice-default", { fullPage: true });

  // ================= THE CORE FLOW =================

  // ---------- Think: empty ----------
  await page.goto("/think", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "think-empty");

  // ---------- Think: typed input (a real link + my own framing) ----------
  const input = page.locator("textarea").first();
  await input.click();
  await input.pressSequentially(
    "https://en.wikipedia.org/wiki/Retrieval-augmented_generation — I think most teams reach for RAG out of habit when a bigger context window would be simpler and cheaper.",
    { delay: 4 },
  );
  await shot(page, "think-input-typed");

  // ---------- Break it down (real fetch + real synthesis) ----------
  const breakBtn = page.getByRole("button", { name: /break it down/i }).first();
  await breakBtn.click();
  await page.waitForTimeout(700);
  await shot(page, "think-loading");

  await page.getByText(/in plain english/i).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await shot(page, "think-synthesis", { fullPage: true });

  // The breakdown starts OPEN by default (no take yet, so there is nothing to
  // collapse it for) — "Read the full breakdown" is hidden until it auto-
  // collapses once a take exists. Screenshot it open now, then type the take.
  await shot(page, "think-breakdown-expanded", { fullPage: true });

  // ---------- Your take ----------
  const take = page.getByPlaceholder(/gut reaction/i);
  await take.click();
  await take.pressSequentially(
    "RAG is a default reached out of habit, not need — most products would do fine with a bigger context window and no retrieval layer at all.",
    { delay: 5 },
  );
  await shot(page, "think-take-typed", { fullPage: true });

  // Now that there's a take, the breakdown auto-collapsed — reopen it once to
  // show the toggle exists, then leave it as a real user would.
  const expandBtn = page.getByText(/read the full breakdown/i).first();
  if (await expandBtn.count()) {
    await expandBtn.click();
    await page.waitForTimeout(400);
    await shot(page, "think-breakdown-reopened", { fullPage: true });
  }

  // ---------- Talk it through: Coach ----------
  await page.getByRole("button", { name: /talk it through/i }).click();
  await page.waitForTimeout(700);
  await shot(page, "think-coach-loading");
  // Wait for the auto-seeded first assistant message.
  await page.locator('div[class*="self-start"]').first().waitFor({ timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, "think-coach-initial", { fullPage: true });

  const chatInput = page.getByPlaceholder(/defend, revise, or push back/i);
  await chatInput.click();
  await chatInput.pressSequentially(
    "My evidence is: token costs for long-context calls have dropped roughly 10x in the last year, and most internal tools have well under a million tokens of source material total — that fits in context without retrieval at all.",
    { delay: 3 },
  );
  await shot(page, "think-coach-reply-typed", { fullPage: true });
  await page.getByRole("button", { name: /^send$/i }).click();
  await page.waitForTimeout(4000);
  await shot(page, "think-coach-exchange", { fullPage: true });

  // ---------- Switch to Spar ----------
  await page.getByRole("radio", { name: /spar/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "think-spar-switch", { fullPage: true });

  const chatInput2 = page.getByPlaceholder(/defend, revise, or push back/i);
  await chatInput2.click();
  await chatInput2.pressSequentially(
    "Even with cheap context, retrieval still wins on latency and on keeping answers grounded to a curated set instead of whatever fits in the window — that's not habit, that's control.",
    { delay: 3 },
  );
  await shot(page, "think-spar-reply-typed", { fullPage: true });
  await page.getByRole("button", { name: /^send$/i }).click();
  await page.waitForTimeout(4000);
  await shot(page, "think-spar-exchange", { fullPage: true });

  // ---------- Write up my take → commit step ----------
  const writeUp = page.getByRole("button", { name: /write up my take/i });
  await writeUp.click();
  await page.waitForTimeout(700);
  await shot(page, "think-commit-loading");
  await page.getByText(/your take, in one sentence/i).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1000);
  await shot(page, "think-commit-take", { fullPage: true });

  // Pick a confidence level — Med, the honest choice for a debatable claim.
  // The DOM text is lowercase "med" (Tailwind's capitalize is CSS-only,
  // doesn't touch the text node) — a case-sensitive /^Med/ never matches.
  await page.locator("button").filter({ hasText: /^med/i }).first().click();
  await page.waitForTimeout(300);
  await shot(page, "think-commit-confidence", { fullPage: true });

  // Expand the depth fields — except "Write up my take" already ran the
  // conversation through /api/commit-suggest, which sets showDepth true as
  // part of returning its draft, so the "+ Add detail" toggle is usually
  // already gone and the fields already visible. Only click it if it's there.
  const addDetail = page.getByText(/add detail/i).first();
  if (await addDetail.count()) {
    await addDetail.click();
    await page.waitForTimeout(300);
  }
  const depthFields = page.locator("textarea");
  const count = await depthFields.count();
  if (count >= 3) {
    await depthFields.nth(count - 3).fill(
      "Context windows crossed 1M tokens and per-token cost fell roughly 10x in a year — the economics that made RAG necessary are eroding fast.",
    );
    await depthFields.nth(count - 2).fill(
      "Retrieval still wins on latency, freshness, and keeping the model grounded to a curated set instead of a fixed context dump.",
    );
    await depthFields.nth(count - 1).fill(
      "A well-run benchmark showed long-context-only answers beating RAG on both accuracy and cost at typical enterprise document volumes.",
    );
  }
  await shot(page, "think-commit-detail", { fullPage: true });

  // ---------- Save + make carousel ----------
  const saveBtn = page.getByRole("button", { name: /save \+ make carousel/i });
  await saveBtn.click();
  await page.waitForTimeout(500);
  await shot(page, "think-saved-stamp").catch(() => {});

  // ================= STUDIO =================
  // 30s was tight for a real carousel-generation call under latency variance —
  // the previous run needed longer here even though everything else was fine.
  await page.waitForURL(/\/studio/, { timeout: 60_000 });
  await page.waitForTimeout(800);
  await shot(page, "studio-loading");
  await page.getByText(/^style$/i).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2000);
  await shot(page, "studio-generated", { fullPage: true });

  // Pick a different design swatch.
  const designButtons = page.locator("button[aria-pressed]");
  const designCount = await designButtons.count();
  if (designCount > 1) {
    await designButtons.nth(2).click();
    await page.waitForTimeout(700);
    await shot(page, "studio-style-changed", { fullPage: true });
  }

  // The per-slide edit panel (right rail) as it stands after the style change.
  await shot(page, "studio-edit-panel", { fullPage: true });

  // Export menu. This trigger is a native <summary>/<details> disclosure, not
  // a <button> — Chromium reports its accessible role as "generic", so
  // getByRole("button", ...) silently matches nothing and waits forever.
  const exportBtn = page.locator("summary").filter({ hasText: /^export/i }).first();
  await exportBtn.click();
  await page.waitForTimeout(400);
  await shot(page, "studio-export-menu");
  await page.keyboard.press("Escape");

  // Save the deck.
  const studioSave = page.getByRole("button", { name: /^save$|^update$/i }).first();
  await studioSave.click();
  await page.waitForTimeout(1500);
  await shot(page, "studio-saved", { fullPage: true });

  // ================= LIBRARY =================
  await page.goto("/gallery", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "gallery", { fullPage: true });

  // ================= LEDGER =================
  await page.goto("/ledger", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "ledger-new-take", { fullPage: true });

  // Expand the take. Structural, not text-matched: "Write up my take" runs the
  // take through /api/commit-suggest, which can rephrase the statement, so the
  // exact wording I typed earlier is not guaranteed to survive verbatim. This
  // is a fresh single-user session with exactly one thesis, so the first (and
  // only) expand toggle on the page is unambiguous.
  // Scoped to #main: Nav's mobile hamburger also carries aria-expanded and
  // sits earlier in the DOM (a layout sibling of <main>), so an unscoped
  // locator picks it up first — hidden at this viewport, so the click then
  // waits forever for a menu button that will never become visible.
  const takeCard = page.locator("#main button[aria-expanded]").first();
  if (await takeCard.count()) {
    await takeCard.click();
    await page.waitForTimeout(500);
    await shot(page, "ledger-expanded", { fullPage: true });

    // Score it — mark held.
    // The button reads "Held Up", not "Held" — an end-anchored /^held$/ never
    // matches it.
    const heldBtn = page.getByRole("button", { name: /^held/i }).first();
    if (await heldBtn.count()) {
      await heldBtn.click();
      await page.waitForTimeout(500);
      await shot(page, "ledger-scored", { fullPage: true });
    }
  }

  // ================= BACK TO TODAY =================
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "today-updated", { fullPage: true });

  // ================= YOU: customize ================
  await page.goto("/voice", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Brand kit.
  const handleInput = page.getByPlaceholder(/@yourname/i);
  await handleInput.fill("@codingwithiz");
  await page.getByRole("button", { name: /save brand kit/i }).click();
  await page.waitForTimeout(600);
  await shot(page, "voice-brandkit", { fullPage: true });

  // Writing sample. The voice guide ships with real example samples already
  // filled in (two, by default), so the placeholder matches more than one
  // empty-looking field — add a genuinely new one and target that.
  const addSampleBtn = page.getByRole("button", { name: /\+ add sample/i });
  if (await addSampleBtn.count()) {
    await addSampleBtn.click();
    await page.waitForTimeout(200);
    const sampleBox = page.getByPlaceholder(/paste one of your posts/i).last();
    await sampleBox.fill(
      "Most \"AI-native\" products aren't AI-native. They're a chat box bolted onto a CRUD app. The real shift is in what the data model can react to when state changes, not whether there's a text box at the top.",
    );
    await shot(page, "voice-sample-typed", { fullPage: true });
  }

  // ================= COMMAND PALETTE ================
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await shot(page, "command-palette");
  await page.keyboard.press("Escape");

  // ================= MOBILE PASS ================
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "mobile-today", { fullPage: true });

  await page.goto("/think", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "mobile-think", { fullPage: true });

  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot(page, "mobile-studio", { fullPage: true });

  expect(n).toBeGreaterThan(30);
});
