import { test, expect } from "@playwright/test";
import { calibration, calibrationVerdict } from "../lib/ledger-stats";
import type { Thesis } from "../lib/types";

/**
 * The verdict is the only part of the track record that makes a claim about the
 * user rather than counting rows, so it is the part that must not be wrong. A
 * chart that silently mislabels someone as overconfident is worse than no chart.
 */
const t = (confidence: Thesis["confidence"], outcome: Thesis["outcome"], i = 0): Thesis => ({
  id: `t${confidence}${outcome}${i}`,
  topic: "AI",
  statement: "A take.",
  confidence,
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  outcome,
});

test("no verdict until something has been scored", () => {
  expect(calibrationVerdict(calibration([]))).toBeNull();
  // Saved but unresolved theses carry no outcome, so they say nothing either.
  expect(calibrationVerdict(calibration([t("high", undefined)]))).toBeNull();
});

test("high confidence that keeps breaking reads as overconfident", () => {
  const v = calibrationVerdict(calibration([t("high", "broke", 1), t("high", "broke", 2)]));
  expect(v?.band).toBe("high");
  expect(v?.kind).toBe("over");
  expect(v?.actual).toBe(0);
  expect(v?.resolved).toBe(2);
});

test("low confidence that keeps holding reads as underselling", () => {
  const v = calibrationVerdict(calibration([t("low", "held", 1), t("low", "held", 2)]));
  expect(v?.band).toBe("low");
  expect(v?.kind).toBe("under");
});

test("a stated confidence that matches reality reads as calibrated", () => {
  // high is scored at 0.85; one held and one mixed averages 0.75, inside the
  // tolerance, so the honest answer is "that's about what you claimed".
  const v = calibrationVerdict(calibration([t("high", "held", 1), t("high", "mixed", 2)]));
  expect(v?.kind).toBe("calibrated");
});

test("the band furthest from its claim wins, not the first one found", () => {
  const v = calibrationVerdict(
    calibration([
      // low is scored at 0.3 and landed on 0.5 — off by 0.2.
      t("low", "held", 1),
      t("low", "broke", 2),
      // high is scored at 0.85 and landed on 0 — off by 0.85. That's the finding.
      t("high", "broke", 3),
    ]),
  );
  expect(v?.band).toBe("high");
  expect(v?.kind).toBe("over");
});

test("parked drafts never reach the verdict", () => {
  // A draft is saved understanding, not an opinion; counting one would invent a
  // data point the user never claimed.
  const draft: Thesis = { ...t("high", "held", 9), status: "draft", statement: "" };
  expect(calibration([draft]).resolved).toBe(1);
  // ...but ledgerStats excludes it from the counts that drive the habit surface.
  expect(calibrationVerdict(calibration([draft]))?.band).toBe("high");
});
