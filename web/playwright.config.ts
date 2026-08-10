import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

/**
 * Two projects, because most of these specs aren't browser tests at all — they
 * import a function and assert on its return, and were paying a dev-server boot
 * for the privilege.
 *
 * The browser project pins the server's environment rather than inheriting it.
 * With Supabase vars set the app gates every page behind /login, so a suite that
 * inherited a developer's .env.local passed or failed depending on whose machine
 * it ran on. Unsetting them puts the app in single-user mode; `MOCK_LLM` makes
 * model calls instant, free, and identical. The login gate itself is covered
 * deliberately by tests/auth-gate.spec.ts, which boots its own configured server.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  workers: CI ? 2 : 4,
  retries: CI ? 2 : 1,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  // A cold run compiles both the specs and each Next route on first visit, so
  // the 5s default fails on work that is merely slow rather than broken — and CI
  // is always cold. Generous ceilings; nothing here should approach them warm.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      MOCK_LLM: "1",
    },
  },
  projects: [
    // Pure functions: no server, no browser, ~1s.
    {
      name: "unit",
      testMatch: /(auth-gate|local-state|citations|env-secret|parse-input|pdf-export|rank|revise|routing|ssrf|topic-sources)\.spec\.ts/,
      use: {},
    },
    {
      name: "browser",
      testIgnore: /(auth-gate|local-state|citations|env-secret|parse-input|pdf-export|rank|revise|routing|ssrf|topic-sources)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
