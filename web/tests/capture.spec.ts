import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seed } from "./fixtures/state";

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
  ["/voice", "voice"],
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
