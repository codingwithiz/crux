import { test, expect } from "@playwright/test";
import { rankItems } from "../lib/rank";
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
