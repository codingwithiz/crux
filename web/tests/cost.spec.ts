import { test, expect } from "@playwright/test";
import { costUsd } from "../lib/ai/cost";

/**
 * A price table is the kind of thing that is wrong silently: nothing fails, the
 * totals are just untrue. These pin the arithmetic and the two behaviours that
 * would quietly understate spend.
 */

test("cost is per-million tokens, priced separately for input and output", () => {
  // gpt-5.5: $1.25/M in, $10/M out.
  expect(costUsd("gpt-5.5", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(1.25);
  expect(costUsd("gpt-5.5", { inputTokens: 0, outputTokens: 1_000_000 })).toBe(10);
  expect(costUsd("gpt-5.5", { inputTokens: 2000, outputTokens: 500 })).toBeCloseTo(0.0075, 6);
});

test("a dated model id prices as its family", () => {
  // Providers append snapshot dates; an exact-match table would price the whole
  // deployment at null the day a model id changes.
  expect(costUsd("gpt-5-mini-2026-01-01", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(0.25);
});

test("the longest matching prefix wins", () => {
  // "gpt-5-mini" and "gpt-5-nano" both extend nothing shared by accident, but
  // the rule matters: a shorter key must not shadow a more specific one.
  const mini = costUsd("gpt-5-mini", { inputTokens: 1_000_000, outputTokens: 0 });
  const nano = costUsd("gpt-5-nano", { inputTokens: 1_000_000, outputTokens: 0 });
  expect(mini).toBe(0.25);
  expect(nano).toBe(0.05);
  expect(mini).not.toBe(nano);
});

test("an unknown model is unpriced, not free", () => {
  // Returning 0 would silently understate a total, which is worse than admitting
  // the model isn't in the table.
  expect(costUsd("some-new-model", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeNull();
  expect(costUsd(undefined, { inputTokens: 10 })).toBeNull();
});

test("a local model is genuinely free, and missing usage is unpriced", () => {
  expect(costUsd("llama3.1", { inputTokens: 500_000, outputTokens: 500_000 })).toBe(0);
  expect(costUsd("gpt-5.5", undefined)).toBeNull();
});

test("a partially reported usage still prices what it knows", () => {
  expect(costUsd("gpt-5.5", { inputTokens: 1_000_000 })).toBe(1.25);
  expect(costUsd("gpt-5.5", { outputTokens: 1_000_000 })).toBe(10);
});
