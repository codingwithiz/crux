const UA = { "user-agent": "conviction-engine/0.1 (personal project)" };

/**
 * Fetch a URL and return the readable MAIN content as plain text — a
 * dependency-free "reader mode" (no headless browser, no jsdom). It isolates
 * the article region, pulls prose (paragraphs/headings/list items) instead of
 * nav/footer/link soup, and prepends the title + description. Returns null when
 * the URL isn't reachable or yields too little text, so the caller falls back to
 * whatever summary it has. This is the "retrieval" half of grounded synthesis.
 */
export async function fetchReadable(url: string, maxChars = 7000): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;
    const html = await res.text();
    const text = readable(html);
    return text.replace(/\s/g, "").length > 120 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ");
}

/** Strip all tags from a fragment and normalize whitespace. */
function strip(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim();
}

/** Title + description from <meta>/<title> (og: preferred). */
function meta(html: string): string {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? decode(m[1]).trim() : "";
  };
  const title =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc =
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return [title, desc].filter(Boolean).join("\n");
}

/** The largest matching <tag>…</tag> inner HTML (e.g. the main <article>). */
function largest(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  let best: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) if (!best || m[1].length > best.length) best = m[1];
  return best;
}

function readable(html: string): string {
  // Remove non-content + page chrome so it can't pollute the prose.
  const h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Focus on the main article region when the page marks one up.
  const region = largest(h, "article") ?? largest(h, "main") ?? h;

  // Pull actual prose rather than menu/link text.
  const blocks = region.match(/<(p|h[1-3]|li|blockquote)[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  let prose = blocks
    .map((b) => strip(b))
    .filter((t) => t.length > 0)
    .join("\n");

  // If prose extraction was too thin (JS-rendered / unusual markup), fall back.
  if (prose.replace(/\s/g, "").length < 200) prose = strip(region);

  return [meta(html), prose].filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
