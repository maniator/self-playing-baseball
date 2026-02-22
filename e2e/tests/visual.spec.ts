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
