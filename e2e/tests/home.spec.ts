import { expect, test } from "@playwright/test";

import {
  openSavesModal,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForNewGameDialog,
} from "../utils/helpers";

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

  // ── Stranded-close guard ───────────────────────────────────────────────────

  test("Load Saved Game → close modal without loading returns to Home screen", async ({ page }) => {
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 15_000 });
    // In the pre-load path, close button label should say "Back to Home"
    await expect(page.getByTestId("saves-modal-close-button")).toHaveText("Back to Home");
    // Click it — should route back to Home, not strand the user on an empty game shell
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("saves-modal")).not.toBeVisible();
  });

  test("Load Saved Game → load a save → stays on game screen (regression guard)", async ({
    page,
  }) => {
    // First start a game, save it, and go back to Home.
    await startGameViaPlayBall(page, { seed: "load-saves-regression" });
    await saveCurrentGame(page);
    // Close the saves modal before navigating — the modal is still open after
    // saving and a showModal() dialog makes all elements outside it inert.
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
    // Navigate back to Home.
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Now enter via Load Saved Game path.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 15_000 });

    // Load the save — should stay on game screen, NOT navigate back to Home.
    await page.getByTestId("load-save-button").first().click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // Critically: Home screen must NOT appear.
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("New Game dialog shows a Back to Home button", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-back-home-button")).toBeVisible({ timeout: 10_000 });
  });

  test("New Game dialog Back to Home button returns to Home screen", async ({ page }) => {
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-back-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible();
  });

  // ── Back to Home button ────────────────────────────────────────────────────

  test("Back to Home button is visible in game UI after starting a game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "home-btn1" });
    await expect(page.getByTestId("back-to-home-button")).toBeVisible({ timeout: 10_000 });
  });

  test("Back to Home button returns to Home screen from an active game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "home-btn2" });
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).not.toBeVisible();
  });

  test("Back to Home button is visible before game starts (New Game dialog open)", async ({
    page,
  }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("back-to-home-button")).toBeVisible({ timeout: 10_000 });
  });

  test("normal in-game saves modal close button label is 'Close'", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "home-btn-close" });
    await openSavesModal(page);
    await expect(page.getByTestId("saves-modal-close-button")).toHaveText("Close");
  });

  test("Back to Home from Save/Load modal area works after opening Saves", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "home-btn3" });
    await openSavesModal(page);
    // Close the saves modal first, then use Back to Home
    await page.getByTestId("saves-modal-close-button").click();
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });

  // ── Manage Teams placeholder ──────────────────────────────────────────────

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
