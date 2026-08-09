/**
 * Client-side slide export. Snapshots a real 1080×1350 SlideCanvas DOM node to a
 * PNG via modern-screenshot — so the exported image is exactly what's previewed
 * (web fonts embedded, blur/shadow/gradients intact). No server render.
 */
import { domToBlob } from "modern-screenshot";

const W = 1080;
const H = 1350;

/** Render a slide node to a PNG Blob. `scale` 1.5 → crisp 1620×2025 output
 *  (well above IG's 1080×1350 display size, smaller files than 2×). */
export async function slideToBlob(node: HTMLElement, scale = 1.5): Promise<Blob> {
  return domToBlob(node, {
    width: W,
    height: H,
    scale,
    // Embed cross-origin brand logos (simpleicons CDN is CORS-enabled).
    fetch: { requestInit: { mode: "cors" } },
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // Revoking synchronously races the download in some browsers; one tick is
  // enough for the click to have been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Compose already-rendered slides into one multi-page PDF, one slide per page at
 * the deck's native 1080×1350.
 *
 * This is what LinkedIn wants: its carousel ("document") posts take a PDF, so
 * exporting PNGs meant converting by hand before every post. jsPDF is imported
 * on demand rather than bundled — nobody pays for it until they click Export.
 *
 * Bytes go in as a Uint8Array rather than a data URL: jsPDF accepts both, and
 * this skips a base64 round-trip that inflates every slide by a third.
 */
export async function blobsToPdf(blobs: Blob[]): Promise<Blob> {
  if (!blobs.length) throw new Error("nothing to export");
  const { jsPDF } = await import("jspdf");
  // Points, not px: jsPDF treats px as 1/96in and rescales the page, so "px"
  // would silently produce a 1440x1800 MediaBox. At 1pt per pixel the page
  // matches the slide exactly.
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [W, H], compress: true });

  for (let i = 0; i < blobs.length; i++) {
    if (i > 0) doc.addPage([W, H], "portrait");
    doc.addImage(new Uint8Array(await blobs[i].arrayBuffer()), "PNG", 0, 0, W, H);
  }
  return doc.output("blob");
}
