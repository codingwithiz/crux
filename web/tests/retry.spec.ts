import { test, expect } from "@playwright/test";
import { APICallError } from "ai";
import { classify, backoffMs } from "../lib/ai/generate";

/**
 * Every failure used to be retried identically, with a "your previous response
 * failed validation, return valid JSON" nudge appended — so a bad API key spent
 * three attempts and two backoffs asking the provider to fix its JSON. The
 * taxonomy is what stops that, and it is worth pinning: getting it wrong is
 * invisible until a bill or an outage.
 */

const apiError = (statusCode: number, headers?: Record<string, string>) =>
  new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://api.example.com/v1",
    requestBodyValues: {},
    statusCode,
    responseHeaders: headers,
  });

test("a bad key fails immediately and is never asked to fix its JSON", () => {
  for (const status of [401, 403]) {
    const c = classify(apiError(status));
    expect(c.code).toBe("auth");
    expect(c.retry).toBe(false);
    expect(c.repair).toBe(false);
  }
});

test("a malformed request is not worth repeating", () => {
  const c = classify(apiError(400));
  expect(c.code).toBe("bad_request");
  expect(c.retry).toBe(false);
});

test("rate limits and timeouts are retried, without the repair nudge", () => {
  expect(classify(apiError(429))).toMatchObject({ code: "rate_limited", retry: true, repair: false });
  expect(classify(apiError(408))).toMatchObject({ code: "timeout", retry: true, repair: false });
});

test("provider outages are retried", () => {
  for (const status of [500, 502, 503]) {
    expect(classify(apiError(status))).toMatchObject({ code: "server", retry: true });
  }
});

test("an aborted call is a timeout, not a schema problem", () => {
  const e = new Error("The operation was aborted");
  e.name = "TimeoutError";
  expect(classify(e)).toMatchObject({ code: "timeout", retry: true, repair: false });
});

test("only a schema failure earns the repair nudge", () => {
  const c = classify(new Error("response did not match schema"));
  expect(c.code).toBe("schema");
  expect(c.retry).toBe(true);
  expect(c.repair).toBe(true);
});

test("a provider's retry-after is believed, and capped", () => {
  expect(backoffMs(apiError(429, { "retry-after": "3" }), 0)).toBe(3000);
  // A provider asking for an hour must not hold the route open past its ceiling.
  expect(backoffMs(apiError(429, { "retry-after": "3600" }), 0)).toBe(20_000);
  // Nonsense falls through to the normal backoff.
  expect(backoffMs(apiError(429, { "retry-after": "soon" }), 0)).toBeGreaterThan(0);
});

test("backoff grows and is jittered", () => {
  // Without jitter, calls that fail together retry together — and fail together.
  const first = Array.from({ length: 12 }, () => backoffMs(new Error("x"), 0));
  expect(new Set(first).size).toBeGreaterThan(1);
  for (const ms of first) expect(ms).toBeGreaterThanOrEqual(250);

  const later = Array.from({ length: 12 }, () => backoffMs(new Error("x"), 2));
  expect(Math.min(...later)).toBeGreaterThan(Math.max(...first));
});
