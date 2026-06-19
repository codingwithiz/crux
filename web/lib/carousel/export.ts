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
  URL.revokeObjectURL(url);
}
