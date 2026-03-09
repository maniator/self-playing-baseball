import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 3_600_000, // 60 minutes — supports 200-game runs (20 per block × 10 blocks)
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      testMatch: "**/metrics-baseline.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npx vite preview --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
