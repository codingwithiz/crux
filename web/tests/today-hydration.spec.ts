import { test, expect } from "@playwright/test";

// Regression: the date label was formatted in the runtime locale, so the server
// ("Jun 17") and client ("17 Jun") disagreed and hydration failed. The fix is
// suppressHydrationWarning on that element. Assert no hydration error fires.
test("today page hydrates without a mismatch", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/today");
  await page.waitForLoadState("networkidle");

  const hydration = errors.filter((e) => /hydration/i.test(e));
  expect(hydration, hydration.join("\n\n")).toHaveLength(0);
});
