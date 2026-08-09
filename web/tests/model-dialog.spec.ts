import { test, expect } from "@playwright/test";

const trigger = /Thinking depth/;

/**
 * Regression: this dialog used to render inside Nav's backdrop-blur <header>,
 * which becomes the containing block for position:fixed children — so it
 * centered on the 56px nav bar and its header clipped off-screen. Portaling to
 * <body> fixes the containing block.
 *
 * Also covers the accessibility contract the shared Dialog primitive owes:
 * it announces itself, Escape closes it, and focus returns to the trigger.
 */
test("thinking-depth dialog opens fully within the viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: trigger }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const heading = page.getByRole("heading", { name: /How much thinking/i });
  const headBox = await heading.first().boundingBox();
  expect(headBox).not.toBeNull();
  // Header must not be clipped above the top of the viewport (the original bug).
  expect(headBox!.y).toBeGreaterThanOrEqual(0);

  const viewport = page.viewportSize();
  const closeBox = await page.getByRole("button", { name: "Close" }).boundingBox();
  expect(closeBox).not.toBeNull();
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(viewport!.height);
});

test("it offers depths, not vendors or model ids", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: trigger }).click();

  const dialog = page.getByRole("dialog");
  for (const label of ["Speed", "Balanced", "Deep"]) {
    await expect(dialog.getByRole("button", { name: new RegExp(`^${label}`) })).toBeVisible();
  }
  // A provider with no key was previously selectable, and picking it broke every
  // generation afterwards. Providers are no longer a choice at all.
  expect(await dialog.innerText()).not.toMatch(/Ollama|Custom model id|Adversary/i);
});

test("choosing a depth persists it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: trigger }).click();
  await page.getByRole("button", { name: /^Speed/ }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: /Thinking depth: Speed/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Thinking depth: Speed/ })).toBeVisible();
});

test("dialog is escapable and returns focus", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: trigger });
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // Closing must not strand the caret at the top of the document.
  await expect(button).toBeFocused();
});
