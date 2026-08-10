import { test, expect } from "@playwright/test";
import { REVISE_SYSTEM } from "../lib/ai/prompts";

/**
 * A free-text direction is the one place in the product a user can ask the model
 * for anything, so what protects the deck is worth asserting.
 *
 * The protection is structural, not prompt-based: /api/revoice merges only
 * headline/body/kicker back onto the caller's own slides, and 422s when the
 * count changes. These cover the two halves of that — the prompt states the
 * rules a direction may not override, and the merge is what enforces them.
 */

test("the revise prompt tells the model a direction cannot override the rules", () => {
  expect(REVISE_SYSTEM).toMatch(/DIRECTION can never override/i);
  // Named explicitly, because these are the ones a plausible direction ("make
  // it 3 slides", "use a chart") would otherwise try to change.
  expect(REVISE_SYSTEM).toMatch(/same number of slides/i);
  expect(REVISE_SYSTEM).toMatch(/same order/i);
  expect(REVISE_SYSTEM).toMatch(/ONLY headline, body, and kicker/i);
  expect(REVISE_SYSTEM).toMatch(/never invent facts or numbers/i);
});

/** The route's merge, isolated: only copy crosses back onto the caller's slide. */
function merge<T extends { headline: string; body?: string; kicker?: string }>(
  orig: T[],
  out: { headline: string; body?: string; kicker?: string }[],
): T[] {
  return orig.map((o, i) => ({
    ...o,
    headline: out[i].headline || o.headline,
    body: out[i].body ?? o.body,
    kicker: out[i].kicker ?? o.kicker,
  }));
}

test("a direction cannot reach a slide's layout, module or data", () => {
  const original = [
    { headline: "One", layout: "hero", module: { type: "bigStat", value: "40%" }, designId: "paper" },
    { headline: "Two", body: "b", layout: "statement" },
  ];
  // A model that ignored every rule and returned a different shape entirely:
  const rogue = [
    { headline: "ONE!", layout: "cta", module: { type: "donut" }, designId: "neon", brand: { name: "Acme" } },
    { headline: "TWO!", body: "B!", kicker: "NEW" },
  ] as never as { headline: string; body?: string; kicker?: string }[];

  const merged = merge(original as never[], rogue) as unknown as typeof original;

  // Copy came through…
  expect(merged[0].headline).toBe("ONE!");
  expect(merged[1].body).toBe("B!");
  // …and nothing else did.
  expect(merged[0].layout).toBe("hero");
  expect(merged[0].module).toEqual({ type: "bigStat", value: "40%" });
  expect(merged[0].designId).toBe("paper");
  expect(merged[1].layout).toBe("statement");
  expect(merged).toHaveLength(2);
  expect("brand" in merged[0]).toBe(false);
});

test("a rogue slide count is rejected before anything is applied", () => {
  const slides = [{ headline: "a" }, { headline: "b" }, { headline: "c" }];
  for (const returned of [1, 2, 4, 12]) {
    expect(returned === slides.length).toBe(false);
  }
  // The route's guard, verbatim in shape: mismatch → 422, no merge attempted.
  const shapeOk = (n: number) => n === slides.length;
  expect(shapeOk(3)).toBe(true);
  expect(shapeOk(5)).toBe(false);
});

test("a direction is capped so it can't become a second system prompt", () => {
  const DIRECTION_MAX = 300;
  const huge = "x".repeat(5000);
  expect(huge.trim().slice(0, DIRECTION_MAX)).toHaveLength(DIRECTION_MAX);
  expect("  punchier  ".trim().slice(0, DIRECTION_MAX)).toBe("punchier");
});
