/**
 * Document assembly, deliberately separate from DOM rendering.
 *
 * Keeping this free of modern-screenshot means the page-layout rules — size,
 * page count, encoding — can be asserted without a browser, and a change to how
 * slides are rasterized can't quietly change how documents are built.
 */


/**
 * One JPEG per page, at the deck's own size — what LinkedIn document
 * posts take, so exporting PNGs meant converting by hand before every post.
 * jsPDF is imported on demand; nobody pays for it until they click Export.
 *
 * JPEG, not PNG: handing jsPDF a PNG makes it fully decode the image, split it
 * per-pixel into colour and alpha planes, and re-deflate both at level 9 —
 * several synchronous seconds per slide on the main thread, which read as the
 * export hanging. JPEG bytes embed directly as DCTDecode, and a document page
 * has no use for an alpha channel.
 */
export async function jpegsToPdf(dataUrls: string[], W = 1080, H = 1080): Promise<Blob> {
  if (!dataUrls.length) throw new Error("nothing to export");
  const { jsPDF } = await import("jspdf");
  // Points, not px: jsPDF treats px as 1/96in and rescales the page, so "px"
  // would silently produce a 1440x1800 MediaBox. At 1pt per pixel the page
  // matches the slide exactly.
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [W, H] });

  for (let i = 0; i < dataUrls.length; i++) {
    if (i > 0) doc.addPage([W, H], "portrait");
    doc.addImage(dataUrls[i], "JPEG", 0, 0, W, H, undefined, "FAST");
  }
  return doc.output("blob");
}
