/**
 * Screenshot capture script for documentation purposes.
 * Captures desktop (1280x800) and mobile (390x844) viewports for key app pages.
 * Run with: npx playwright test e2e/tests/take-screenshots.spec.ts --project=desktop
 *
 * Output is written to docs/screenshots/.
 */

import { type BrowserContext, devices, type Page, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

import { resetAppState, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

// Output directory for screenshots
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "screenshots");

// Ensure output directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper to take a screenshot and save it
async function captureScreenshot(page: Page, filename: string): Promise<void> {
  const outputPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`✅ Saved: ${filename}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Each test creates fresh BrowserContext instances (one per viewport) via the
// Playwright `browser` fixture so IndexedDB/localStorage are fully isolated
// between screenshots.  The baseURL comes from the active Playwright project
// config so the spec works with any configured server without hardcoding.
// ──────────────────────────────────────────────────────────────────────────────

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

// We only need the "desktop" project to run (we control viewports ourselves).
// Use test.describe.configure to run tests serially so screenshots don't race.
test.describe.configure({ mode: "serial" });

test.describe("Documentation Screenshots", () => {
  let contexts: Map<ViewportName, BrowserContext>;
  let pages: Map<ViewportName, Page>;

  test.beforeEach(async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL ?? "http://localhost:5173";
    contexts = new Map();
    pages = new Map();

    for (const [name, viewport] of Object.entries(VIEWPORTS) as [
      ViewportName,
      { width: number; height: number },
    ][]) {
      const ctx = await browser.newContext({
        viewport,
        ...(name === "mobile" ? { userAgent: devices["iPhone 15 Pro Max"].userAgent } : {}),
        baseURL,
        locale: "en-US",
      });
      // Disable CSS animations/transitions on every navigation in this context
      // so screenshots are stable (no mid-transition frames captured).
      await ctx.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          const style = document.createElement("style");
          style.textContent =
            "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";
          document.head.appendChild(style);
        });
      });
      const pg = await ctx.newPage();
      contexts.set(name, ctx);
      pages.set(name, pg);
    }
  });

  test.afterEach(async () => {
    for (const ctx of contexts.values()) {
      await ctx.close();
    }
  });

  // Helper to run for both viewports
  async function forBothViewports(
    fn: (page: Page, viewportName: ViewportName) => Promise<void>,
  ): Promise<void> {
    for (const name of ["desktop", "mobile"] as ViewportName[]) {
      const pg = pages.get(name)!;
      await fn(pg, name);
    }
  }

  // ── 1. Home Screen ──────────────────────────────────────────────────────────
  test("1. Home screen", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.waitForSelector("[data-testid='home-screen']", {
        state: "visible",
        timeout: 30_000,
      });
      await captureScreenshot(page, `home-${viewport}.png`);
    });
  });

  // ── 2. New Game Dialog ──────────────────────────────────────────────────────
  test("2. New Game dialog", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.getByTestId("home-new-game-button").click();
      await page.waitForSelector("[data-testid='exhibition-setup-page']", {
        state: "visible",
        timeout: 15_000,
      });
      await captureScreenshot(page, `new-game-${viewport}.png`);
    });
  });

  // ── 3. In-game view ─────────────────────────────────────────────────────────
  test("3. In-game view (with play-by-play)", async () => {
    await forBothViewports(async (page, viewport) => {
      await startGameViaPlayBall(page, { seed: "abc123" });
      // Wait for some play-by-play entries to appear
      await waitForLogLines(page, 5, 60_000);
      // Try to expand the play-by-play log if there's a toggle
      const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
      if (await logToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await logToggle.click();
        // Wait until the log section is visible/expanded before screenshotting
        await page
          .getByTestId("play-by-play-log")
          .waitFor({ state: "visible", timeout: 5_000 })
          .catch(() => {});
      }
      await captureScreenshot(page, `in-game-${viewport}.png`);
    });
  });

  // ── 4. How to Play page ─────────────────────────────────────────────────────
  test("4. How to Play page", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.goto("/help", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid='help-page']", { state: "visible" });
      await captureScreenshot(page, `how-to-play-${viewport}.png`);
    });
  });

  // ── 5. Saves page ───────────────────────────────────────────────────────────
  test("5. Saves page", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.goto("/saves", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid='saves-page']", { state: "visible" });
      await captureScreenshot(page, `saves-${viewport}.png`);
    });
  });

  // ── 6. Career Stats page ────────────────────────────────────────────────────
  test("6. Career Stats page", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.goto("/stats", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid='career-stats-page']", { state: "visible" });
      await captureScreenshot(page, `career-stats-${viewport}.png`);
    });
  });

  // ── 7a. Manage Teams page ───────────────────────────────────────────────────
  test("7a. Manage Teams page", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.goto("/teams", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid='manage-teams-screen']", { state: "visible" });
      await captureScreenshot(page, `manage-teams-${viewport}.png`);
    });
  });

  // ── 7b. Team Editor (new team) ──────────────────────────────────────────────
  test("7b. Team Editor (new team form)", async () => {
    await forBothViewports(async (page, viewport) => {
      await resetAppState(page);
      await page.goto("/teams/new", { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid='custom-team-name-input']", { state: "visible" });
      // Fill in a team name so the form is more illustrative
      await page.getByTestId("custom-team-name-input").fill("Demo Stars");
      await captureScreenshot(page, `team-editor-${viewport}.png`);
    });
  });
});
