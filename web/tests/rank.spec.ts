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
  // A saved take is not something you asked to follow — it lands in `related`.
  expect(ranked[0].related).toContain("robotics");
  expect(ranked[0].why).toBeUndefined();
  // An item that matched nothing carries no explanation rather than an empty one.
  expect(ranked[1].related).toBeUndefined();
});

test("a word that only appears inside a take's sentence is never a reason", () => {
  // The reported bug: "Because you follow data" shown to a user who had never
  // typed "data" — it was a word in one of their saved takes, and every content
  // word of every take was being treated as a followed topic.
  const items = [item("x", "AI for science needs reasoning, not just data", 10)];
  const ranked = rankItems(items, [
    { topic: "AI research", statement: "AI for science needs reasoning, not just more data." },
  ]);
  expect(ranked[0].why).toBeUndefined();
  expect(ranked[0].related ?? []).not.toContain("data");
});

test("only an explicit interest is ever phrased as something you follow", () => {
  const items = [item("x", "Robotics grasping meets kubernetes scheduling", 10)];
  const ranked = rankItems(items, [
    ...interestsAsPriors(["robotics"]),
    { topic: "Kubernetes", statement: "Operators are overused for stateless apps." },
  ]);
  expect(ranked[0].why).toEqual(["robotics"]);
  expect(ranked[0].related).toEqual(["kubernetes"]);
});

test("a chosen interest outranks an incidental word from a take", () => {
  const items = [item("interest", "Robotics update", 100), item("take", "Kubernetes update", 100)];
  const ranked = rankItems(items, [
    ...interestsAsPriors(["robotics"]),
    { topic: "Kubernetes", statement: "Operators are overused." },
  ]);
  expect(ranked[0].id).toBe("interest");
});

test("a term common across the feed is dropped as a reason, but never an interest", () => {
  // Nine of ten items mention "models". As a reason that explains nothing, so it
  // goes — unless the user explicitly chose to follow it, in which case it's true.
  const items = Array.from({ length: 9 }, (_, i) => item(`c${i}`, "New models shipped", 10));
  items.push(item("x", "New models and tokenizers", 10));

  const asTake = rankItems(items, [{ topic: "Models", statement: "Models are commoditizing." }]);
  expect(asTake.every((i) => !i.related?.includes("models"))).toBe(true);

  const asInterest = rankItems(items, interestsAsPriors(["models"]));
  expect(asInterest[0].why).toContain("models");
});

test("three-letter terms survive tokenization", () => {
  // The old 4+ character floor silently dropped ai, llm, gpt, rag — the terms a
  // user is most likely to type as an interest in this domain.
  const items = [item("x", "New RAG benchmark released", 10), item("y", "Unrelated", 10)];
  const ranked = rankItems(items, interestsAsPriors(["rag"]));
  expect(ranked[0].id).toBe("x");
  expect(ranked[0].why).toContain("rag");
});

test("two-letter domain terms survive tokenization", () => {
  // The floor is three characters, so `ai` needs an explicit exception — the
  // comment on the old floor claimed it survived, and it never did.
  const items = [item("x", "AI agents ship to production", 10), item("y", "Unrelated", 10)];
  const ranked = rankItems(items, interestsAsPriors(["ai"]));
  expect(ranked[0].id).toBe("x");
  expect(ranked[0].why).toContain("ai");
});

test("stopwords never appear as a reason", () => {
  // The reported bug: "Because you follow the, for and and". Three-letter
  // function words became unreachable when the STOP list was written against a
  // 4+ character floor, then reachable again when the floor dropped.
  const items = [item("x", "The case for and against small models", 10)];
  const ranked = rankItems(items, interestsAsPriors(["the", "for", "and", "models"]));
  for (const w of ["the", "for", "and"]) expect(ranked[0].why).not.toContain(w);
  expect(ranked[0].why).toContain("models");
});

test("the rarest matched terms are the ones offered as reasons", () => {
  // WhyThis shows three. Taking them in title order surfaced whatever the
  // headline opened with; a term matching every item explains nothing.
  const common = Array.from({ length: 5 }, (_, i) => item(`c${i}`, "Models shipped", 10));
  const items = [item("x", "Models shipped with tokenizer diffusion", 10), ...common];
  const ranked = rankItems(items, interestsAsPriors(["models", "shipped", "tokenizer", "diffusion"]));
  const target = ranked.find((i) => i.id === "x")!;
  // "diffusion" and "tokenizer" match once each; "models"/"shipped" match six times.
  expect(target.why!.slice(0, 2).sort()).toEqual(["diffusion", "tokenizer"]);
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
