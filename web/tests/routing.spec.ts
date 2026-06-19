import { test, expect } from "@playwright/test";
import { stepModelSettings } from "../lib/ai/routing";

// The Adversary is an interactive chat where latency hurts most, so with no
// explicit override it must default to the fast gpt-5-mini, NOT the heavy
// gpt-5.5 used for Synthesize/Carousel.
test("adversary defaults to fast gpt-5-mini for openai (no override)", () => {
  const ms = stepModelSettings({ provider: "openai", model: "gpt-5.5" }, "adversary");
  expect(ms.provider).toBe("openai");
  expect(ms.model).toBe("gpt-5-mini");
});

test("synthesize keeps the user's default model", () => {
  const ms = stepModelSettings({ provider: "openai", model: "gpt-5.5" }, "synthesize");
  expect(ms.model).toBe("gpt-5.5");
});

test("an explicit adversary override still wins", () => {
  const ms = stepModelSettings(
    {
      provider: "openai",
      model: "gpt-5.5",
      adversaryProvider: "anthropic",
      adversaryModel: "claude-opus-4-8",
    },
    "adversary",
  );
  expect(ms.provider).toBe("anthropic");
  expect(ms.model).toBe("claude-opus-4-8");
});

test("non-openai providers inherit their default model for the adversary", () => {
  const ms = stepModelSettings({ provider: "google", model: "gemini-2.5-flash" }, "adversary");
  expect(ms.provider).toBe("google");
  expect(ms.model).toBe("gemini-2.5-flash");
});
