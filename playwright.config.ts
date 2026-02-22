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
    // ── Determinism tests ──────────────────────────────────────────────────
    // Run only on desktop Chromium: these tests verify PRNG reproducibility,
    // not viewport behaviour.  Each test spawns two sequential fresh browser
    // contexts, so running on all 6 device projects would be very slow and
    // add no additional value.
    {
      name: "determinism",
      testMatch: "**/determinism.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },

    // ── All other tests ────────────────────────────────────────────────────
    {
      name: "desktop",
      testIgnore: "**/determinism.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "tablet",
      testIgnore: "**/determinism.spec.ts",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 820, height: 1180 } },
    },
    {
      name: "iphone-15-pro-max",
      testIgnore: "**/determinism.spec.ts",
      use: { ...devices["iPhone 15 Pro Max"] },
    },
    {
      name: "iphone-15-pro",
      testIgnore: "**/determinism.spec.ts",
      use: { ...devices["iPhone 15 Pro"] },
    },
    {
      name: "pixel-7",
      testIgnore: "**/determinism.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "pixel-5",
      testIgnore: "**/determinism.spec.ts",
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
