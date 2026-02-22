import { expect, test } from "@playwright/test";

import {
  disableAnimations,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

/**
 * Visual regression snapshots — run across all 6 non-determinism viewport projects
 * (desktop, tablet, iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 * Captures a small, high-signal set of screens per viewport.
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("New Game dialog screenshot", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-dialog")).toHaveScreenshot("new-game-dialog.png", {
      mask: [],
      maxDiffPixelRatio: 0.05,
    });
  });

  test("in-game state screenshot after a few events", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual1" });
    await waitForLogLines(page, 8);
    // Capture the full scoreboard + field area
    await expect(page.getByTestId("scoreboard")).toHaveScreenshot("scoreboard-in-game.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Player stats panel screenshot — verifies the RBI column is present and the
   * layout (PlayerStatsPanel above HitLog) is correct across all viewports.
   *
   * The table body (live stat values) is masked so the snapshot is stable
   * regardless of how many events autoplay has processed by screenshot time.
   * The thead row — which contains the AB / H / BB / K / RBI column headers —
   * is always captured and will catch any column regressions.
   */
  test("player stats panel with RBI column screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    await expect(statsPanel).toHaveScreenshot("player-stats-panel.png", {
      // Mask the dynamic stat rows; the column-header row is always captured.
      mask: [statsPanel.locator("tbody")],
      maxDiffPixelRatio: 0.05,
    });
  });

  test("saves modal screenshot with one save present", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual2" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);
    await expect(page.getByTestId("saves-modal")).toHaveScreenshot("saves-modal-with-save.png", {
      mask: [
        // Mask the date/time stamps which change every run
        page.getByTestId("slot-date"),
      ],
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Manager decision panel screenshot — captures the DecisionPanel UI that
   * appears when Manager Mode is active and a decision point is reached.
   *
   * Restricted to desktop (Chromium 1280×800) because:
   * - Waiting up to 120 s × 6 viewports would make CI prohibitively slow.
   * - The decision panel layout is identical across viewports (it renders in the
   *   controls bar, not the game field area).
   * - Notification API / console assertions in the companion notifications.spec.ts
   *   tests already cover this path on all Chromium projects.
   */
  test("manager decision panel screenshot", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Decision panel snapshot is desktop-only");
    // The decision panel wait is 120 s; add headroom beyond the 90 s global limit.
    test.setTimeout(150_000);

    await startGameViaPlayBall(page, { seed: "visual3", managedTeam: "0" });
    await waitForLogLines(page, 3);
    // Wait for the first decision point — autoplay pauses until the panel is dismissed.
    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 120_000 });

    // Snapshot just the decision panel itself so the screenshot is stable
    // regardless of what is happening in the scoreboard / log behind it.
    await expect(page.getByTestId("manager-decision-panel")).toHaveScreenshot(
      "manager-decision-panel.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
