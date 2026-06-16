import { getSettings } from "./settings";
import { getVoice, effectiveVoice } from "./voice";
import { thesisToSlides, sourceLabel } from "./slides";
import type { Slide, Thesis } from "./types";

/**
 * Turn a committed thesis into carousel slides via the Expressor, tuned by the
 * user's saved voice. Falls back to the deterministic skeleton when there's no
 * model key or the call fails — so it never blocks. Shared by the commit flow
 * and the Ledger's "Make carousel" so both paths sound like you.
 */
export async function expressSlides(thesis: Thesis, handle = "@you"): Promise<Slide[]> {
  let slides = thesisToSlides(thesis, handle);
  try {
    const voice = effectiveVoice(await getVoice());
    const res = await fetch("/api/express", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thesis, settings: getSettings(), voice }),
    });
    if (res.ok) {
      const j = (await res.json()) as { slides?: Slide[] };
      if (Array.isArray(j.slides) && j.slides.length) slides = j.slides;
    }
  } catch {
    /* keep the deterministic fallback */
  }
  // Stamp the source credit on the hook slide (the model isn't told the URL).
  const src = sourceLabel(thesis);
  if (src && slides[0]) slides[0] = { ...slides[0], source: src };
  return slides;
}
