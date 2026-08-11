/**
 * Client-side slide export. Snapshots a real SlideCanvas DOM node
 * through modern-screenshot — so the exported image is exactly what's previewed
 * (web fonts embedded, blur/shadow/gradients intact). No server render.
 */
import { domToBlob, domToJpeg } from "modern-screenshot";
import { jpegsToPdf } from "./pdf";

/**
 * The node's own rendered size. The deck's shape is a per-carousel choice now,
 * so hardcoding it here would silently letterbox or crop every square export.
 */
function dimsOf(node: HTMLElement): { width: number; height: number } {
  return { width: node.offsetWidth || 1080, height: node.offsetHeight || 1080 };
}

/**
 * Render a slide node to a PNG Blob at exactly its rendered size.
 *
 * Deliberately 1:1. A 1.5× scale gave crisper files but also made
 * modern-screenshot stamp a 144-DPI `pHYs` chunk, so image editors reported the
 * export as 11.25in × 14.06in and laid it out at 1080×1350 *points* — a file
 * that quietly disagreed with the size the app promises everywhere else. 1080
 * wide is what every target platform displays anyway.
 */
export async function slideToBlob(node: HTMLElement): Promise<Blob> {
  return domToBlob(node, {
    ...dimsOf(node),
    // Embed cross-origin brand logos (simpleicons CDN is CORS-enabled).
    fetch: { requestInit: { mode: "cors" } },
  });
}

/** The same slide as a JPEG data URL — see blobsToPdf for why PDFs skip PNG. */
async function slideToJpegUrl(node: HTMLElement): Promise<string> {
  return domToJpeg(node, {
    ...dimsOf(node),
    quality: 0.92,
    // JPEG has no alpha; without a ground the transparent canvas renders black.
    backgroundColor: "#ffffff",
    fetch: { requestInit: { mode: "cors" } },
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  // Firefox and Safari ignore a click on a detached node, and revoking on the
  // next tick can outrun the start of a large download.
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

/** Render the given slide nodes and assemble them into one document. */
export async function nodesToPdf(nodes: HTMLElement[]): Promise<Blob> {
  if (!nodes.length) throw new Error("nothing to export");
  const pages: string[] = [];
  for (const node of nodes) pages.push(await slideToJpegUrl(node));
  // Page size follows the deck, so a square deck doesn't get letterboxed onto
  // a portrait page.
  const { width, height } = dimsOf(nodes[0]);
  return jpegsToPdf(pages, width, height);
}
