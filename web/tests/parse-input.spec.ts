import { test, expect } from "@playwright/test";
import { parseInput } from "../lib/parse-input";

// Pasting a link used to be sent as a raw thought — never fetched — so the model
// confidently summarized a page it had never read, with the grounded badge
// suppressed. Splitting link from commentary here is what routes it to retrieval.

test("a bare URL is recognized as a source", () => {
  expect(parseInput("https://example.com/article")).toEqual({
    url: "https://example.com/article",
    text: "",
  });
});

test("keeps the user's take alongside the link", () => {
  const r = parseInput("https://example.com/a I think the author is too optimistic");
  expect(r.url).toBe("https://example.com/a");
  expect(r.text).toBe("I think the author is too optimistic");
});

test("finds the link when the take comes first", () => {
  const r = parseInput("My take: this is overhyped https://example.com/a");
  expect(r.url).toBe("https://example.com/a");
  expect(r.text).toBe("My take: this is overhyped");
});

test("strips trailing sentence punctuation from the URL", () => {
  expect(parseInput("see https://example.com/a.").url).toBe("https://example.com/a");
  expect(parseInput("(https://example.com/a)").url).toBe("https://example.com/a");
  expect(parseInput("read https://example.com/a, then decide").url).toBe("https://example.com/a");
});

test("preserves query strings and paths", () => {
  const r = parseInput("https://example.com/a?utm=x&id=2#frag my thought");
  expect(r.url).toBe("https://example.com/a?utm=x&id=2#frag");
  expect(r.text).toBe("my thought");
});

test("a plain thought is left completely alone", () => {
  const text = "AI agents will make most SaaS dashboards obsolete within two years.";
  expect(parseInput(text)).toEqual({ text });
});

test("non-http schemes and bare domains are not treated as sources", () => {
  // fetchReadable only accepts http(s); anything else must stay a thought so we
  // never claim grounding we can't deliver.
  expect(parseInput("ftp://example.com/x").url).toBeUndefined();
  expect(parseInput("check example.com for details").url).toBeUndefined();
  expect(parseInput("mailto:a@b.com").url).toBeUndefined();
});

test("empty input stays empty", () => {
  expect(parseInput("   ")).toEqual({ text: "" });
});
