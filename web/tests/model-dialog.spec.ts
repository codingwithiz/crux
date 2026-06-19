import { test, expect } from "@playwright/test";

// Regression: the Model dialog used to render inside Nav's backdrop-blur
// <header>, which becomes the containing block for position:fixed children —
// so the dialog centered on the 56px nav bar and its header clipped off-screen.
// Portaling it to <body> fixes the containing block. This asserts the dialog
// header sits fully within the viewport.
test("model dialog opens fully within the viewport", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Model" }).click();

  const heading = page.getByRole("heading", { name: "Model settings" });
  await expect(heading).toBeVisible();

  const viewport = page.viewportSize();
  const headBox = await heading.boundingBox();
  expect(headBox).not.toBeNull();
  // Header must not be clipped above the top of the viewport (the original bug).
  expect(headBox!.y).toBeGreaterThanOrEqual(0);

  // Footer (Save) must also be reachable within the viewport.
  const save = page.getByRole("button", { name: "Save" });
  const saveBox = await save.boundingBox();
  expect(saveBox).not.toBeNull();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(viewport!.height);

  // Let the /api/secrets fetch settle so the key-field hint reflects server keys.
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "tests/model-dialog.png" });
});
