import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated config for tests/walkthrough.spec.ts only.
 *
 * The main config's webServer is exactly what this needs (single-user mode,
 * no login) except for one env var: it hardcodes MOCK_LLM=1. This is that
 * same, proven launch path with MOCK_LLM dropped, so the walkthrough hits
 * the real synthesize/adversary/express routes.
 *
 * Not part of the main test matrix; not run in CI.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: /walkthrough\.spec\.ts/,
  timeout: 15 * 60_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    // A single stuck click otherwise silently eats the whole 15-minute test
    // budget before failing — three separate hangs this script hit each cost
    // a full run to diagnose. 15s is generous for a real UI action; anything
    // slower than that is the bug, not the network.
    actionTimeout: 15_000,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
