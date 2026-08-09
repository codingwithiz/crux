import { test, expect } from "@playwright/test";

/**
 * Regression: the Model dialog used to render inside Nav's backdrop-blur
 * <header>, which becomes the containing block for position:fixed children — so
 * the dialog centered on the 56px nav bar and its header clipped off-screen.
 * Portaling to <body> fixes the containing block.
 *
 * Now also covers the accessibility contract the shared Dialog primitive owes:
 * it announces itself, Escape closes it, and focus returns to the trigger.
 */
test("model dialog opens fully within the viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Model" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const heading = page.getByRole("heading", { name: "Model", exact: true });
  const headBox = await heading.first().boundingBox();
  expect(headBox).not.toBeNull();
  // Header must not be clipped above the top of the viewport (the original bug).
  expect(headBox!.y).toBeGreaterThanOrEqual(0);

  const viewport = page.viewportSize();
  const saveBox = await page.getByRole("button", { name: "Save" }).boundingBox();
  expect(saveBox).not.toBeNull();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(viewport!.height);
});

test("model dialog is escapable and returns focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Model" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // Closing must not strand the caret at the top of the document.
  await expect(trigger).toBeFocused();
});
