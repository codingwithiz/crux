import { test, expect } from "@playwright/test";
import { blobsToPdf } from "../lib/carousel/export";

// A 2x2 PNG. Enough to prove the bytes survive the round-trip into a page.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
  ),
  (c) => c.charCodeAt(0),
);
const slide = () => new Blob([PNG], { type: "image/png" });

const asText = async (pdf: Blob) =>
  Buffer.from(await pdf.arrayBuffer()).toString("latin1");

// LinkedIn silently rejects a malformed PDF, so "it downloaded" is not evidence
// it worked — check the container is actually well-formed.
test("produces a structurally valid PDF", async () => {
  const text = await asText(await blobsToPdf([slide()]));
  expect(text.startsWith("%PDF-")).toBe(true);
  expect(text).toContain("%%EOF");
});

test("one page per slide", async () => {
  const text = await asText(await blobsToPdf([slide(), slide(), slide()]));
  expect((text.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(3);
});

test("pages are the deck's native 1080x1350 portrait", async () => {
  const text = await asText(await blobsToPdf([slide()]));
  expect(text).toMatch(/\/MediaBox\s*\[0 0 1080\.?\d* 1350\.?\d*\]/);
});

test("refuses an empty deck instead of writing a blank file", async () => {
  await expect(blobsToPdf([])).rejects.toThrow(/nothing to export/);
});
