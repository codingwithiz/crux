import { test, expect } from "@playwright/test";

// Regression: resuming an in-progress conviction directly into the Adversary
// step with NO saved messages used to hang forever on "Starting the
// interrogation…" — resume set seeded=true but nothing ever sent the opening
// message. The fix seeds the chat from a single effect. This reproduces that
// exact saved state and asserts the Adversary now starts.
const TAKE = "open-weight models have basically caught up for real-world use";

const flow = {
  mode: "thought",
  step: "adversary",
  input: "Open-weight models have caught up.",
  take: TAKE,
  synthesis: {
    plainEnglish: "Open models are now close to the best paid models for many tasks.",
    happened: "Open-weight LLMs became competitive on common benchmarks.",
    newVsRepackaged: "Real gains on open evals, though framing is often hype.",
    keyDebate: "Whether open-weight LLMs have truly closed the gap with closed frontier models.",
    skepticCase: "Closed labs keep redefining the frontier (reasoning, tool use, agents).",
    implications: [],
    questions: ["By how much would the gap have to shrink to count as closed?"],
    citations: [],
  },
  messages: [],
  commit: { statement: "", confidence: "med", evidenceFor: "", steelman: "", changeMyMind: "", topic: "" },
  savedAt: new Date().toISOString(),
};

test("resuming into the Adversary with no messages auto-seeds (no hang)", async ({ page }) => {
  await page.addInitScript((f) => {
    window.localStorage.setItem("ce.flow", JSON.stringify(f));
  }, flow);

  await page.goto("/think");

  // Confirms we restored into the Adversary step.
  await expect(page.getByText("Picked up where you left off.")).toBeVisible();

  // The opening message must actually be sent (the bug left this unsent).
  await expect(page.getByText(`My take: ${TAKE}`)).toBeVisible({ timeout: 15000 });

  // And the hang placeholder must be gone.
  await expect(page.getByText("Starting the interrogation…")).toHaveCount(0);
});
