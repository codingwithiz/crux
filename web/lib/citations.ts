import type { Citation } from "./types";

/**
 * Normalize for verbatim matching: models routinely re-punctuate a quote they
 * copied correctly (smart quotes, an em dash, a trailing ellipsis), and that
 * shouldn't count as a fabrication.
 */
export const normalizeQuote = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’“”'"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Check each quote actually appears in the source text.
 *
 * This is the product's whole anti-hallucination claim, and it is a substring
 * test — no model, no cost, no judgement call. It existed only inside the
 * dev-only eval harness, which meant a fabricated "verbatim quote" shipped to
 * users unchecked; running it in the synthesize path is what makes the
 * receipts trustworthy.
 */
export function verifyCitations(
  quotes: string[],
  sourceText: string,
  source?: { url?: string; title?: string },
): Citation[] {
  const haystack = normalizeQuote(sourceText);
  return quotes
    .map((q) => q.trim())
    .filter(Boolean)
    .map((quote) => ({
      quote,
      url: source?.url,
      sourceTitle: source?.title,
      // No source text to check against means unverified, never "verified".
      verified: haystack.length > 0 && haystack.includes(normalizeQuote(quote)),
    }));
}

/**
 * Read either shape. Theses committed before verification existed stored bare
 * strings; those are shown as unverified rather than silently claiming a check
 * that never ran.
 */
export function asCitations(raw: (Citation | string)[] | undefined): Citation[] {
  return (raw ?? []).map((c) => (typeof c === "string" ? { quote: c, verified: false } : c));
}

/** Fraction of citations that trace back to the source, or null when there are none. */
export function citationFaithfulness(citations: Citation[] | undefined): number | null {
  if (!citations?.length) return null;
  const hits = citations.filter((c) => c.verified).length;
  return +(hits / citations.length).toFixed(2);
}
