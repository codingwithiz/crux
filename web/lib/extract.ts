const UA = { "user-agent": "conviction-engine/0.1 (personal project)" };

/**
 * Fetch a URL and return readable plain text (best-effort, free — no headless
 * browser). Strips scripts/styles/markup and collapses whitespace. Returns null
 * when the URL isn't reachable or isn't HTML/text, so the caller can fall back
 * to whatever summary it already has. This is the "retrieval" half of grounded
 * synthesis: we feed the model the real source instead of just a title.
 */
export async function fetchReadable(url: string, maxChars = 6000): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;
    const html = await res.text();
    const text = htmlToText(html);
    return text.length > 120 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html: string): string {
  let s = html;
  // Drop non-content blocks entirely.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // Keep paragraph/heading breaks readable.
  s = s.replace(/<\/(p|div|section|article|h[1-6]|li|br)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  // Decode the handful of entities that actually matter for prose.
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&[a-z]+;/gi, " ");
  // Collapse whitespace.
  s = s.replace(/[ \t\f\v]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();
  return s;
}
