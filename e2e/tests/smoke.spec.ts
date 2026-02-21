import { expect, test } from "@playwright/test";

import {
  assertCoreLayoutVisible,
  clickPlayBall,
  gotoFreshApp,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Smoke", () => {
  test("app loads and New Game dialog is visible", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-dialog")).toBeVisible();
    await expect(page.getByTestId("play-ball-button")).toBeVisible();
  });

  test("New Game dialog shows home/away team selectors", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("home-team-select")).toBeVisible();
    await expect(page.getByTestId("away-team-select")).toBeVisible();
  });

  test("gameplay does not progress before Play Ball is clicked", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    // Play-by-play log should have zero entries while dialog is open
    const entries = page.locator('[data-testid="announcements"] [data-testid="log-entry"]');
    await expect(entries).toHaveCount(0);
  });

  test("clicking Play Ball starts the game and autoplays", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    // Dialog must close
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible();
    // Game autoplays — expand log and wait for entries without any manual clicks
    await waitForAtLeastLogLines(page, 3);
  });

  test("core game layout is visible after game starts", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await assertCoreLayoutVisible(page);
  });

  test("scoreboard shows team names after game starts", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    const lineScore = page.getByTestId("line-score");
    await expect(lineScore).toBeVisible();
    // Teams column should show at least some text
    const text = await lineScore.textContent();
    expect(text?.length).toBeGreaterThan(5);
  });
});
