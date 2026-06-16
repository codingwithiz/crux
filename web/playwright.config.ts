import { defineConfig, devices } from "@playwright/test";

// Run: npm i -D @playwright/test && npx playwright install chromium && npx playwright test
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // One dev server serves all workers; cap concurrency + retry once to absorb
  // load-induced flakes (e.g. a dropdown click racing under saturation).
  workers: 4,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
