import { expect, test } from "@playwright/test";

import { assertFieldAndLogVisible, resetAppState, startGameViaPlayBall } from "../utils/helpers";

/**
 * Responsive smoke checks — run across desktop, tablet, and mobile projects.
 * These tests verify that key layout containers are visible and non-zero sized.
 */
test.describe("Responsive Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("New Game dialog is visible and Play Ball button is reachable", async ({ page }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    const btn = page.getByTestId("play-ball-button");
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("Play Ball button is in viewport without scrolling", async ({ page }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    const btn = page.getByTestId("play-ball-button");
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    // The bottom edge of the button must fit within the visible viewport height.
    // This ensures no scrolling is required to reach Play Ball! on any viewport.
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight);
  });

  test("critical form fields are visible within viewport on New Game dialog", async ({ page }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    // These controls must all be fully visible without any scrolling on every viewport.
    const criticalTestIds = [
      "matchup-mode-select",
      "home-team-select",
      "away-team-select",
      "seed-input",
      "play-ball-button",
    ];
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    for (const testId of criticalTestIds) {
      const el = page.getByTestId(testId);
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      expect(box, `${testId} bounding box`).not.toBeNull();
      expect(
        box!.y + box!.height,
        `${testId} bottom edge must be within viewport height`,
      ).toBeLessThanOrEqual(viewportHeight);
    }
  });

  test("no horizontal overflow on New Game dialog page", async ({ page }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    const overflowDiff = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowDiff).toBeLessThanOrEqual(1);
  });

  test("scoreboard, field, and log panel are visible and non-zero after game starts", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "responsive1" });
    await assertFieldAndLogVisible(page);

    // Log panel should be visible on all viewports
    const logPanel = page.getByTestId("log-panel");
    await expect(logPanel).toBeVisible();
    const logBox = await logPanel.boundingBox();
    expect(logBox).not.toBeNull();
    expect(logBox!.width).toBeGreaterThan(0);
    expect(logBox!.height).toBeGreaterThan(0);
  });

  test("saves button is reachable", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "responsive2" });
    const savesBtn = page.getByTestId("saves-button");
    await expect(savesBtn).toBeVisible();
    const box = await savesBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
  });
});
