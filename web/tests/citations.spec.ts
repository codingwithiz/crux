import { test, expect } from "@playwright/test";
import { verifyCitations, asCitations, citationFaithfulness } from "../lib/citations";

// The product's anti-hallucination claim rests on this substring check. It used
// to run only inside the dev-only eval harness, so a fabricated "verbatim quote"
// shipped to users unchecked.
const SOURCE =
  "Researchers introduced a router for mixture-of-experts models that selects two of sixty-four experts per token. They report a 41% reduction in inference FLOPs at matched perplexity.";

test("a genuine verbatim quote verifies", () => {
  const [c] = verifyCitations(["a 41% reduction in inference FLOPs"], SOURCE);
  expect(c.verified).toBe(true);
});

test("tolerates re-punctuation the model adds around a real quote", () => {
  // Models routinely swap in smart quotes or an em dash while copying correctly;
  // that is not a fabrication and must not be flagged as one.
  const quotes = [
    "“a 41% reduction in inference FLOPs”",
    "selects two of sixty-four experts per token…",
    "a 41%  reduction   in inference FLOPs",
  ];
  for (const c of verifyCitations(quotes, SOURCE)) expect(c.verified).toBe(true);
});

test("an invented quote does not verify", () => {
  const [c] = verifyCitations(["a 91% reduction in training cost"], SOURCE);
  expect(c.verified).toBe(false);
});

test("with no source text nothing can be verified", () => {
  // The thought path has no retrieved material, so "verified" must never be
  // claimed there — absence of evidence is not evidence.
  for (const c of verifyCitations(["anything at all"], "")) expect(c.verified).toBe(false);
});

test("attaches the source reference to each citation", () => {
  const [c] = verifyCitations(["a 41% reduction in inference FLOPs"], SOURCE, {
    url: "https://example.com/a",
    title: "A cheaper MoE router",
  });
  expect(c.url).toBe("https://example.com/a");
  expect(c.sourceTitle).toBe("A cheaper MoE router");
});

test("blank quotes are dropped rather than counted", () => {
  expect(verifyCitations(["", "   "], SOURCE)).toHaveLength(0);
});

test("legacy string citations read as unverified, never as verified", () => {
  // Theses committed before verification existed stored bare strings; showing
  // them as verified would assert a check that never ran.
  expect(asCitations(["an old quote"])).toEqual([{ quote: "an old quote", verified: false }]);
  expect(asCitations(undefined)).toEqual([]);
});

test("faithfulness is the verified fraction, null when there is nothing to score", () => {
  const mixed = verifyCitations(
    ["a 41% reduction in inference FLOPs", "an invented claim"],
    SOURCE,
  );
  expect(citationFaithfulness(mixed)).toBe(0.5);
  expect(citationFaithfulness([])).toBeNull();
  expect(citationFaithfulness(undefined)).toBeNull();
});
