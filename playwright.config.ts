import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Ballgame E2E + visual regression tests.
 * Runs against the Parcel dev server (auto-started via webServer).
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:1234",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{testFilePath}/{projectName}/{arg}{ext}",
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Pro"],
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 12"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:1234",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
