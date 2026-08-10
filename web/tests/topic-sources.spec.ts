import { test, expect } from "@playwright/test";
import { topicQueryUrls, TOPIC_LIMIT } from "../lib/sources";

/**
 * Interests were a sort hint over a fixed list of AI outlets, so following
 * "robotics" or "biotech" changed the feed by nothing at all. These assert the
 * query construction that lets a followed topic actually fetch. No network:
 * building the URL is the part that can silently be wrong.
 */

test("a topic becomes a real query on both feed sources", () => {
  const u = topicQueryUrls("robotics");
  expect(u.news).toContain("news.google.com/rss/search");
  expect(u.news).toContain("q=robotics");
  expect(u.arxiv).toContain("export.arxiv.org");
  expect(u.arxiv).toContain("robotics");
});

test("a multi-word topic stays a phrase, and is URL-safe", () => {
  const u = topicQueryUrls("ai safety");
  // A bare space would either break the URL or become an OR of two words —
  // "ai safety" must not match every item mentioning "ai".
  expect(u.news).not.toMatch(/[ ]/);
  expect(u.arxiv).not.toMatch(/[ ]/);
  expect(u.news).toContain("ai%20safety");
  // %22 is a double quote: arXiv treats the quoted form as a phrase.
  expect(u.arxiv).toContain("%22ai%20safety%22");
});

test("a topic with query-breaking characters is escaped, not injected", () => {
  const u = topicQueryUrls("c&d=1 #ai");
  for (const url of [u.news, u.arxiv]) {
    expect(url).not.toContain("&d=1");
    expect(url).not.toContain("#ai");
    expect(() => new URL(url)).not.toThrow();
  }
});

test("surrounding whitespace never reaches the query", () => {
  expect(topicQueryUrls("  robotics  ").news).toContain("q=robotics&");
});

test("the number of topics fetched per request is bounded", () => {
  // One request must not fan out to an unbounded number of upstream calls just
  // because someone pasted twenty keywords.
  expect(TOPIC_LIMIT).toBeGreaterThan(0);
  expect(TOPIC_LIMIT).toBeLessThanOrEqual(8);
});
