import { expect, test } from "@playwright/test";

import {
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Manage Teams — team list and CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("navigating to Manage Teams shows the real team list UI with a Create button", async ({
    page,
  }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    // Real UI has a Create button; placeholder had no such button
    await expect(page.getByTestId("manage-teams-create-button")).toBeVisible();
    // Placeholder text should be gone
    await expect(page.getByText("coming soon")).not.toBeVisible();
  });

  test("clicking Generate Defaults prefills the form, saving adds team to list", async ({
    page,
  }) => {
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

  test("custom team saved via editor is visible after page reload", async ({ page }) => {
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

  test("editing a custom team name updates the team list", async ({ page }) => {
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

  test("info banner warns that edits won't affect the current game when navigating from an active game", async ({
    page,
  }) => {
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

test.describe("Resume Current Game — gating and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Resume Current Game button is absent before any game is started", async ({ page }) => {
    await expect(page.getByTestId("home-resume-current-game-button")).not.toBeVisible();
  });

  test("Resume Current Game button appears after clicking Back to Home from an active game", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "2b-resume-1" });
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("home-resume-current-game-button")).toBeVisible();
  });

  test("Resume Current Game returns to the same in-progress game (scoreboard visible)", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "2b-resume-2" });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("home-resume-current-game-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // Home screen should no longer be visible
    await expect(page.getByTestId("home-screen")).not.toBeVisible();
  });

  test("visiting Manage Teams during an active game does not break Resume on return", async ({
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

test.describe("New Game dialog — custom team picker", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("MLB Teams tab is selected by default and shows team selectors", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-mlb-teams-tab")).toBeVisible();
    await expect(page.getByTestId("home-team-select")).toBeVisible();
  });

  test("Custom Teams tab shows empty-state message when no custom teams exist", async ({
    page,
  }) => {
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-custom-teams-tab").click();
    // No custom teams → empty state text
    await expect(page.getByText(/no custom teams/i)).toBeVisible({ timeout: 5_000 });
    // MLB selects should be hidden
    await expect(page.getByTestId("home-team-select")).not.toBeVisible();
  });

  test("Custom Teams tab shows team selectors when at least one custom team exists", async ({
    page,
  }) => {
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

  test("starting a game with two custom teams reaches the game screen", async ({ page }) => {
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

  test("play-by-play log shows custom team display names, not raw custom IDs", async ({ page }) => {
    // Create two custom teams.
    await page.getByTestId("home-manage-teams-button").click();

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Scarlet Hawks");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Scarlet Hawks")).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Cobalt Wolves");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Cobalt Wolves")).toBeVisible({ timeout: 5_000 });

    // Start a game with the two custom teams.
    await page.getByTestId("manage-teams-back-button").click();
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(page.getByTestId("new-game-custom-away-team-select")).toBeVisible({
      timeout: 5_000,
    });
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Wait for several play-by-play entries.
    await waitForLogLines(page, 5, 30_000);

    // Collect all visible log text.
    const logText = await page.getByTestId("play-by-play-log").textContent();

    // No raw custom ID fragments must appear in the log.
    expect(logText).not.toMatch(/custom:ct_/);
  });

  test("New Game → Custom Teams (empty) → 'Go to Manage Teams' link — buttons are actionable", async ({
    page,
  }) => {
    // Navigate to New Game (no custom teams exist).
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Switch to the Custom Teams tab — should show the empty state link.
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(page.getByRole("button", { name: /go to manage teams/i })).toBeVisible({
      timeout: 5_000,
    });

    // Click the "Go to Manage Teams" link — must close the dialog and navigate.
    await page.getByRole("button", { name: /go to manage teams/i }).click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // The New Game dialog's backdrop must be gone — buttons must be actionable.
    // Verify both the Create button and Back button are clickable.
    await expect(page.getByTestId("manage-teams-create-button")).toBeVisible();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-name-input")).toBeVisible({ timeout: 5_000 });
  });
});
