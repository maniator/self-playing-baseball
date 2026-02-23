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

  /**
   * How to Play modal — default state.
   *
   * Opens the dialog from the New Game screen.  The "Basics" section is open
   * by default; all other sections are collapsed.  Runs on all 6 viewports
   * so we catch any mobile / tablet layout regressions.
   */
  test("How to Play modal default state screenshot", async ({ page }) => {
    await waitForNewGameDialog(page);
    // Close the New Game <dialog> so the rest of the page is no longer inert.
    await page.evaluate(() => {
      const dialog = document.querySelector(
        '[data-testid="new-game-dialog"]',
      ) as HTMLDialogElement | null;
      dialog?.close();
    });
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-default.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * How to Play modal — all accordion sections expanded.
   *
   * Desktop-only to keep CI time reasonable; the accordion layout is the
   * same across all viewports.  We programmatically open every closed
   * <details> element and then wait until all 7 sections are structurally
   * open before snapshotting.
   */
  test("How to Play modal all sections expanded screenshot", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "All sections expanded snapshot is desktop-only",
    );
    await waitForNewGameDialog(page);
    // Close the New Game <dialog> so the rest of the page is no longer inert.
    await page.evaluate(() => {
      const dialog = document.querySelector(
        '[data-testid="new-game-dialog"]',
      ) as HTMLDialogElement | null;
      dialog?.close();
    });
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    await page.evaluate(() => {
      document
        .querySelectorAll("dialog[open] details:not([open]) summary")
        .forEach((s) => (s as HTMLElement).click());
    });
    // Wait until all 7 sections are structurally open before snapshotting.
    await expect(page.locator("dialog[open] details[open]")).toHaveCount(7);
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-all-sections.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
