/**
 * Split a free-text box into "the link" and "what the user thinks about it".
 *
 * The think box used to send everything as a raw thought, so pasting a URL got
 * you a confident summary of an article nobody ever fetched — with the
 * grounded/ungrounded badge suppressed, so nothing warned you. Detecting the
 * link here routes it down the same retrieval path the news feed uses.
 *
 * Deterministic on purpose: asking a model to classify its own input would add
 * a call, latency, and a new failure mode to a question `URL.canParse` answers.
 */
export interface ParsedInput {
  /** The first http(s) URL found, if any. */
  url?: string;
  /** Everything else — the user's own words, which must survive intact. */
  text: string;
}

/**
 * Peel the wrapping a link picks up in prose — "(https://x)" , "see https://x."
 * — without touching the URL's own punctuation, which is why this trims the
 * ends rather than splitting on those characters.
 */
function unwrap(token: string): string {
  return token.replace(/^[("'<[]+/, "").replace(/[.,;:!?)\]>"']+$/, "");
}

export function parseInput(raw: string): ParsedInput {
  const trimmed = raw.trim();
  if (!trimmed) return { text: "" };

  // Split on whitespace so a URL containing commas or parens in its query
  // survives intact.
  const tokens = trimmed.split(/\s+/);
  const isUrl = (t: string) => {
    const candidate = unwrap(t);
    if (!/^https?:\/\//i.test(candidate)) return false;
    try {
      return Boolean(new URL(candidate).hostname);
    } catch {
      return false;
    }
  };

  const urlIndex = tokens.findIndex(isUrl);
  if (urlIndex === -1) return { text: trimmed };

  const url = unwrap(tokens[urlIndex]);
  const text = [...tokens.slice(0, urlIndex), ...tokens.slice(urlIndex + 1)].join(" ").trim();
  return { url, text };
}
