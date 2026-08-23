import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/reports/test-results",
  globalSetup: "./tests/auth/global-setup.mjs",

  // Run tests sequentially — escrow flow depends on order
  fullyParallel: false,
  workers: 1,

  timeout: 60 * 1000,          // 60s per test step
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: [
    ["html", { outputFolder: "./tests/reports/playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on",                // Always record trace
    screenshot: "on",           // Always take screenshots
    video: "on",                // Always record video

    // 👁️  HEADED + SLOW MODE — user can visually watch every step
    headless: false,
    slowMo: 700,
    launchOptions: {
      channel: "chrome",        // Use real Chrome, not Playwright Chromium
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
