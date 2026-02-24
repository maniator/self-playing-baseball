import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall, waitForNewGameDialog } from "../utils/helpers";

test.describe("Stage 2B — Manage Teams", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Manage Teams shows real list UI (not placeholder text)", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    // Real UI has a Create button; placeholder had no such button
    await expect(page.getByTestId("manage-teams-create-button")).toBeVisible();
    // Placeholder text should be gone
    await expect(page.getByText("coming soon")).not.toBeVisible();
  });

  test("Create new team → default fields prefilled → save → appears in list", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Open the editor
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-name-input")).toBeVisible({ timeout: 5_000 });

    // Click Generate Defaults to prefill
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    // Name should now be filled
    const nameValue = await page.getByTestId("custom-team-name-input").inputValue();
    expect(nameValue.length).toBeGreaterThan(0);

    // Edit the name to something unique
    await page.getByTestId("custom-team-name-input").fill("Test City Rockets");

    // Save
    await page.getByTestId("custom-team-save-button").click();

    // Should return to list and show the new team
    await expect(page.getByTestId("custom-team-list")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Test City Rockets")).toBeVisible();
  });

  test("Create team persists after page reload", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-create-button")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Persistent Eagles");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Persistent Eagles")).toBeVisible({ timeout: 5_000 });

    // Reload the page
    await resetAppState(page);
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Persistent Eagles")).toBeVisible({ timeout: 5_000 });
  });

  test("Edit existing team updates the list", async ({ page }) => {
    // First create a team
    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Original Name");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Original Name")).toBeVisible({ timeout: 5_000 });

    // Edit it
    await page.getByTestId("custom-team-edit-button").first().click();
    await page.getByTestId("custom-team-name-input").fill("Updated Name");
    await page.getByTestId("custom-team-save-button").click();

    await expect(page.getByText("Updated Name")).toBeVisible({ timeout: 5_000 });
  });

  test("hasActiveGame banner shows when navigating from active game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "2b-manage-active" });
    // Go back to home from game
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    // Go to Manage Teams
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    // Info banner should be visible
    await expect(page.getByText(/apply to future games/i)).toBeVisible();
  });
});

test.describe("Stage 2B — Resume Current Game", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Resume button absent before any game is started", async ({ page }) => {
    await expect(page.getByTestId("home-resume-current-game-button")).not.toBeVisible();
  });

  test("Resume button appears after going Back to Home from a game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "2b-resume-1" });
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("home-resume-current-game-button")).toBeVisible();
  });

  test("Resume returns to same game session (scoreboard visible, not reset)", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "2b-resume-2" });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("home-resume-current-game-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // Home screen should no longer be visible
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("Manage Teams during active game → return and resume → game still active", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "2b-manage-resume" });

    // Go back to home
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Navigate to Manage Teams
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Return to home
    await page.getByTestId("manage-teams-back-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Resume game
    await page.getByTestId("home-resume-current-game-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Stage 2B — New Game custom team picker", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("MLB Teams tab is selected by default", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-mlb-teams-tab")).toBeVisible();
    await expect(page.getByTestId("home-team-select")).toBeVisible();
  });

  test("Custom Teams tab shows empty state when no teams exist", async ({ page }) => {
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-custom-teams-tab").click();
    // No custom teams → empty state text
    await expect(page.getByText(/no custom teams/i)).toBeVisible({ timeout: 5_000 });
    // MLB selects should be hidden
    await expect(page.getByTestId("home-team-select")).not.toBeVisible();
  });

  test("Custom Teams tab shows selectors when teams exist", async ({ page }) => {
    // Create a team first
    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Custom Away Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Custom Away Team")).toBeVisible({ timeout: 5_000 });

    // Go back home and open New Game
    await page.getByTestId("manage-teams-back-button").click();
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Switch to Custom Teams tab
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(page.getByTestId("new-game-custom-away-team-select")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("new-game-custom-home-team-select")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Start game with custom teams works end-to-end", async ({ page }) => {
    // Create two custom teams
    await page.getByTestId("home-manage-teams-button").click();

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Red Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Red Team")).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Blue Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Blue Team")).toBeVisible({ timeout: 5_000 });

    // Go back to Home → New Game
    await page.getByTestId("manage-teams-back-button").click();
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Switch to custom tab and start game
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(page.getByTestId("new-game-custom-away-team-select")).toBeVisible({
      timeout: 5_000,
    });
    await page.getByTestId("play-ball-button").click();

    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });
});
