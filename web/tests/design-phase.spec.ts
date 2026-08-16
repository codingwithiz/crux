import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seed, flowAt } from "./fixtures/state";

/**
 * Per-phase design evidence.
 *
 * The redesign lands in passes, and each pass is reviewed by looking at it. This
 * writes one folder per pass — `docs/design/pass-3/` and so on — so two passes
 * can be put side by side and the difference is the thing you see rather than
 * the thing you have to take on trust.
 *
 *   PHASE=pass-3 npx playwright test tests/design-phase.spec.ts --project=browser
 *
 * Full-page, seeded, and network-stubbed: the composition is what's under
 * review, so a screenshot cut off at the fold or missing its content is no
 * evidence at all. Skipped unless PHASE is set.
 */
const PHASE = process.env.PHASE ?? "";
const OUT = `../docs/design/${PHASE}`;

test.describe.configure({ mode: "serial" });
test.skip(!PHASE, "set PHASE=pass-N to capture that phase's screenshots");

async function shot(page: Page, name: string, wait = 1800) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function visit(page: Page, path: string, name: string, wait?: number) {
  await page.goto(path, { waitUntil: "networkidle" }).catch(() => page.goto(path));
  await shot(page, name, wait);
}

test("desktop", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);

  await visit(page, "/", "01-landing");
  await visit(page, "/today", "02-today");
  await visit(page, "/explore", "03-explore", 3000);
  await visit(page, "/ledger", "04-ledger");
  await visit(page, "/studio", "05-studio", 2600);
  await visit(page, "/gallery", "06-library");
  await visit(page, "/voice", "07-voice");
  await visit(page, "/guide", "08-guide");
  await visit(page, "/think", "09-think-empty");
});

/** Think, in the three states it actually spends its time in. */
test("think flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await seed(page, { "ce.flow": flowAt("synth") });
  await visit(page, "/think", "10-think-breakdown", 2200);

  await seed(page, { "ce.flow": flowAt("adversary") });
  await visit(page, "/think", "11-think-spar", 2200);

  await seed(page, { "ce.flow": flowAt("commit") });
  await visit(page, "/think", "12-think-commit", 2200);
});

/** Ledger with a take opened, since the collapsed list hides the record. */
test("ledger detail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  await page.goto("/ledger", { waitUntil: "networkidle" });
  const first = page.locator("#main button[aria-expanded]").first();
  if (await first.count()) await first.click();
  await shot(page, "13-ledger-expanded");
});

test("mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await visit(page, "/today", "20-mobile-today");
  await visit(page, "/explore", "21-mobile-explore", 3000);
  await visit(page, "/ledger", "22-mobile-ledger");
  await visit(page, "/studio", "23-mobile-studio", 2600);

  await seed(page, { "ce.flow": flowAt("synth") });
  await visit(page, "/think", "24-mobile-think", 2200);
});
