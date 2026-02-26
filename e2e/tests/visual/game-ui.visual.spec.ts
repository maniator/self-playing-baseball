import { expect, test } from "@playwright/test";

import {
  disableAnimations,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
} from "../../utils/helpers";

/**
 * Visual regression snapshots — run across all 6 non-determinism viewport projects
 * (desktop, tablet, iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 * Captures in-game UI screens: scoreboard, tab bar, player stats, and saves modal.
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
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
   * Team tab bar screenshot — verifies the global Away/Home TeamTabBar that
   * sits at the top of the log panel and controls both Batting Stats and Hit
   * Log simultaneously.  The tab bar itself is stable once the game starts
   * (team names don't change), so no masking is needed.
   */
  test("team tab bar screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const tabBar = page.getByTestId("team-tab-bar");
    await expect(tabBar).toBeVisible({ timeout: 10_000 });
    await expect(tabBar).toHaveScreenshot("team-tab-bar.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Player stats panel screenshot — captures the panel with Player Details in
   * the empty (no batter selected) state.  Verifies the stats table layout and
   * the placeholder copy across all viewports.
   *
   * We use a deterministic seed and wait for a fixed log-line count so the
   * entire panel (including live stat values) is stable at screenshot time.
   */
  test("player stats panel with RBI column screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    // Seed is deterministic and we wait for a fixed log-line count, so the
    // entire panel (including tbody stats) is stable — no masking needed.
    await expect(statsPanel).toHaveScreenshot("player-stats-panel.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Player stats panel — selected batter state.
   *
   * Clicks the first batter row so the Player Details section renders the
   * expanded stat card (player name, sublabel, counting + rate stats grids).
   * Verifies the selected-row highlight and populated Player Details UI
   * across all viewports.
   */
  test("player stats panel selected batter screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    // Select the first batter row — this transitions Player Details from empty
    // to the populated card for batter slot 1.
    await page.getByTestId("batter-row-1").click();
    // Wait for the SubLabel ("This game") to confirm the selected state is rendered.
    await expect(statsPanel.getByText(/this game/i)).toBeVisible({ timeout: 5_000 });
    await expect(statsPanel).toHaveScreenshot("player-stats-panel-selected.png", {
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
});
