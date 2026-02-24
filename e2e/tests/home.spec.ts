import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall, waitForNewGameDialog } from "../utils/helpers";

test.describe("Home Screen", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("shows Home screen on app launch", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-new-game-button")).toBeVisible();
    await expect(page.getByTestId("home-load-saves-button")).toBeVisible();
    await expect(page.getByTestId("home-manage-teams-button")).toBeVisible();
  });

  test("New Game button navigates to game setup dialog", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("play-ball-button")).toBeVisible();
    // Home screen should no longer be visible
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("New Game path leads to a working game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "home-test1" });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });

  test("Load Saved Game button navigates to game UI with saves modal open", async ({ page }) => {
    await page.getByTestId("home-load-saves-button").click();
    // Wait for DB to load
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    // Saves modal should open automatically
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 15_000 });
    // Scoreboard should be visible in the background
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // Home screen should no longer be visible
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("Manage Teams button navigates to Manage Teams placeholder screen", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    // Home screen should no longer be visible
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("Manage Teams back button returns to Home screen", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("manage-teams-back-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });
});
