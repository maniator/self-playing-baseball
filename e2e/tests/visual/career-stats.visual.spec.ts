import { expect, test } from "@playwright/test";

import { disableAnimations, resetAppState } from "../../utils/helpers";

/**
 * Visual regression snapshots for the Career Stats hub.
 *
 * Run across all 6 non-determinism viewport projects (desktop, tablet,
 * iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 *
 * Baselines must be regenerated inside the CI Docker container
 * (mcr.microsoft.com/playwright:v1.58.2-noble) — never run
 * `yarn test:e2e:update-snapshots` locally.
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("Career Stats page — empty state", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot("career-stats-empty.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Career Stats page — Pitching tab (empty)", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("career-stats-pitching-tab").click();
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-pitching-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Player Career page — empty state", async ({ page }) => {
    await page.goto("/players/smoke_test_player");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
