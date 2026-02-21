import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  disableAnimations,
  gotoFreshApp,
  openSavesModal,
  waitForAtLeastLogLines,
  waitForManagerDecision,
  waitForNewGameDialog,
} from "../utils/helpers";

// Visual regression tests — screenshots are compared against stored baselines.
// Run `yarn test:e2e:update-snapshots` to regenerate baselines after intentional UI changes.
// All tests disable CSS animations/transitions for stable screenshots.

test.describe("Visual snapshots", () => {
  test("New Game dialog", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await disableAnimations(page);
    await expect(page).toHaveScreenshot("new-game-dialog.png", { maxDiffPixelRatio: 0.02 });
  });

  test("in-game state after a few events", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);
    await disableAnimations(page);
    // Mask the BSO dots which change every pitch
    await expect(page).toHaveScreenshot("in-game.png", {
      maxDiffPixelRatio: 0.05,
      mask: [page.getByTestId("bso-row")],
    });
  });

  test("Saves modal open with at least one entry", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);
    await openSavesModal(page);
    // Save the current game so there is an entry
    await page.getByTestId("save-current-button").click();
    await expect(
      page.getByTestId("saves-list").locator('[data-testid="save-item"]').first(),
    ).toBeVisible({ timeout: 5_000 });
    await disableAnimations(page);
    await expect(page).toHaveScreenshot("saves-modal.png", { maxDiffPixelRatio: 0.02 });
  });

  test("manager mode decision panel", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);
    await waitForManagerDecision(page);
    await disableAnimations(page);
    // Mask the countdown which changes every second
    await expect(page).toHaveScreenshot("decision-panel.png", {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('[data-testid="decision-panel"] [class*="Countdown"]')],
    });
  });
});
