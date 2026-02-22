import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 90_000,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 820, height: 1180 } },
    },
    {
      name: "iphone-15-pro-max",
      use: { ...devices["iPhone 15 Pro Max"] },
    },
    {
      name: "iphone-15-pro",
      use: { ...devices["iPhone 15 Pro"] },
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "pixel-5",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Serve the production build for stable, dev-mode-free E2E tests.
  // Run `yarn build` first locally if dist/ is stale.
  webServer: {
    command: "npx vite preview --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: !isCI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
