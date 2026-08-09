import { test, expect } from "@playwright/test";
import { jpegsToPdf } from "../lib/carousel/pdf";

// A 1x1 JPEG. Enough to prove a page carries an image and the container is
// well-formed; rendering a real slide needs a browser and is covered by the
// Studio's own export path.
const JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const asText = async (pdf: Blob) => Buffer.from(await pdf.arrayBuffer()).toString("latin1");

// LinkedIn silently rejects a malformed PDF, so "it downloaded" is not evidence
// it worked — check the container is actually well-formed.
test("produces a structurally valid PDF", async () => {
  const text = await asText(await jpegsToPdf([JPEG]));
  expect(text.startsWith("%PDF-")).toBe(true);
  expect(text).toContain("%%EOF");
});

test("one page per slide", async () => {
  const text = await asText(await jpegsToPdf([JPEG, JPEG, JPEG]));
  expect((text.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(3);
});

test("pages are the deck's native 1080x1350 portrait", async () => {
  const text = await asText(await jpegsToPdf([JPEG]));
  expect(text).toMatch(/\/MediaBox\s*\[0 0 1080\.?\d* 1350\.?\d*\]/);
});

test("images are embedded as DCTDecode, not re-encoded", async () => {
  // The PNG path made jsPDF decode and re-deflate every slide at level 9 —
  // seconds of blocked main thread per slide, which read as the export hanging.
  const text = await asText(await jpegsToPdf([JPEG]));
  expect(text).toContain("DCTDecode");
});

test("refuses an empty deck instead of writing a blank file", async () => {
  await expect(jpegsToPdf([])).rejects.toThrow(/nothing to export/);
});
