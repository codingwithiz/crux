import { test, expect } from "@playwright/test";
import { rankItems, interestsAsPriors } from "../lib/rank";
import type { NewsItem } from "../lib/types";

const item = (id: string, title: string, score: number): NewsItem => ({
  id,
  source: "hn",
  title,
  url: `https://example.com/${id}`,
  score,
});

// Two items with identical popularity, so ordering is decided purely by overlap
// with the user's priors.
const ITEMS = [item("a", "Kubernetes operator patterns", 100), item("b", "Robotics grasping benchmarks", 100)];

test("a committed thesis pulls its topic up the feed", () => {
  const ranked = rankItems(ITEMS, [
    { topic: "Robotics", statement: "Robotics grasping is the real bottleneck, not planning." },
  ]);
  expect(ranked[0].id).toBe("b");
});

test("a parked draft does NOT steer the feed", () => {
  // Drafts carry a topic but deliberately no statement — they are the things you
  // declined to have an opinion about. Letting them rank the feed meant parking
  // something quietly changed what you were shown, as if you'd committed to it.
  const ranked = rankItems(ITEMS, [{ topic: "Robotics grasping benchmarks", statement: "" }]);
  const withNoPriors = rankItems(ITEMS, []);
  expect(ranked.map((i) => i.id)).toEqual(withNoPriors.map((i) => i.id));
});

test("a draft mixed in with real theses still contributes nothing", () => {
  const ranked = rankItems(ITEMS, [
    { topic: "Kubernetes", statement: "Kubernetes operator patterns are overused for stateless apps." },
    { topic: "Robotics grasping benchmarks", statement: "   " },
  ]);
  expect(ranked[0].id).toBe("a");
});

test("no priors at all falls back to popularity order", () => {
  const ranked = rankItems([item("low", "Low", 1), item("high", "High", 999)], []);
  expect(ranked.map((i) => i.id)).toEqual(["high", "low"]);
});

test("returns the terms that matched, so the feed can say why", () => {
  const ranked = rankItems(ITEMS, [
    { topic: "Robotics", statement: "Robotics grasping is the real bottleneck." },
  ]);
  expect(ranked[0].why).toContain("robotics");
  // An item that matched nothing carries no explanation rather than an empty one.
  expect(ranked[1].why).toBeUndefined();
});

test("three-letter terms survive tokenization", () => {
  // The old 4+ character floor silently dropped ai, llm, gpt, rag — the terms a
  // user is most likely to type as an interest in this domain.
  const items = [item("x", "New RAG benchmark released", 10), item("y", "Unrelated", 10)];
  const ranked = rankItems(items, interestsAsPriors(["rag"]));
  expect(ranked[0].id).toBe("x");
  expect(ranked[0].why).toContain("rag");
});

test("interests alone personalize the feed for a user with no ledger", () => {
  // The cold-start case: 40% of the ranking signal is dead on day one.
  const ranked = rankItems(ITEMS, interestsAsPriors(["robotics"]));
  expect(ranked[0].id).toBe("b");
});

test("interests are shaped so the parked-draft guard doesn't drop them", () => {
  // rankItems ignores priors with a blank statement; a keyword must fill both
  // fields or it would be silently discarded and the feature would no-op.
  for (const p of interestsAsPriors(["agents", "evals"])) {
    expect(p.statement.trim()).not.toBe("");
    expect(p.topic).toBe(p.statement);
  }
});
