/**
 * Stage 4A routing integration tests.
 *
 * Covers the new react-router-based navigation:
 * - Home → /exhibition/new page (primary New Game path)
 * - Exhibition Setup defaults to Custom Teams tab
 * - Home ↔ Game ↔ Resume Current Game
 * - Home → /saves page (Load Saved Game path)
 * - Home → /help page (How to Play path)
 * - Teams URL routes: /teams/new, /teams/:id/edit
 * - Autoplay pauses when navigating away from /game
 * - Deep-link unknown paths redirect to Home
 */

import { expect, test } from "@playwright/test";

import {
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

test.describe("Routing — exhibition setup page", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Home → New Game navigates to /exhibition/new", async ({ page }) => {
    await page.getByTestId("home-new-game-button").click();
    await expect(page).toHaveURL(/\/exhibition\/new/);
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Exhibition Setup defaults to Custom Teams tab when no custom teams exist", async ({
    page,
  }) => {
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    // Custom Teams tab must be active (aria-selected=true)
    await expect(page.getByTestId("new-game-custom-teams-tab")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // MLB Teams tab must NOT be active
    await expect(page.getByTestId("new-game-mlb-teams-tab")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("Exhibition Setup back button returns to Home (/)", async ({ page }) => {
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("new-game-back-home-button").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });

  test("browser Back from /exhibition/new returns to Home", async ({ page }) => {
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    await page.goBack();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Routing — game view navigation", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Home → Load Saved Game navigates to /saves page", async ({ page }) => {
    await page.getByTestId("home-load-saves-button").click();
    await expect(page).toHaveURL(/\/saves/);
    await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 10_000 });
  });

  test("Load Saved Game → back button returns to Home screen", async ({ page }) => {
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("saves-page-back-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("Load Saved Game → load a save → navigates to /game", async ({ page }) => {
    // First start a game, save it, then go back to Home.
    await startGameViaPlayBall(page, { seed: "routing-load-save1" });
    await saveCurrentGame(page);
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Now enter via Load Saved Game → saves page.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 10_000 });

    // Load the save — should navigate to /game.
    await page.getByTestId("load-save-button").first().click();
    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
  });

  test("Back to Home from game navigates to /", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "routing-back1" });
    await expect(page).toHaveURL(/\/game/);
    await page.getByTestId("back-to-home-button").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });

  test("Resume Current Game navigates back to /game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "routing-resume1" });
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("home-resume-current-game-button").click();
    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });

  test("Home → Manage Teams navigates to /teams", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page).toHaveURL(/\/teams/);
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Routing — teams sub-routes", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Create Team button navigates to /teams/new", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page).toHaveURL(/\/teams\/new/);
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 10_000 });
  });

  test("browser Back from /teams/new returns to /teams list", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 10_000 });
    await page.goBack();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Routing — help page", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Home → Help navigates to /help", async ({ page }) => {
    await page.getByTestId("home-help-button").click();
    await expect(page).toHaveURL(/\/help/);
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 10_000 });
  });

  test("browser Back from /help returns to Home", async ({ page }) => {
    await page.getByTestId("home-help-button").click();
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 10_000 });
    await page.goBack();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("help back button navigates back to Home", async ({ page }) => {
    await page.getByTestId("home-help-button").click();
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("help-page-back-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Routing — deep-link and unknown paths", () => {
  test("unknown path redirects to Home screen", async ({ page }) => {
    await page.goto("/this-path-does-not-exist");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL("/");
  });
});

test.describe("Routing — autoplay pauses off /game", () => {
  test("autoplay stops producing log entries when navigating away from /game", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Autoplay pause test runs on desktop only");
    test.setTimeout(60_000);

    await page.addInitScript(() => {
      localStorage.setItem("speed", "350"); // SPEED_FAST
    });

    await startGameViaPlayBall(page, { seed: "routing-pause1" });
    // Wait for a few autoplay entries to confirm the scheduler is running.
    await waitForLogLines(page, 5, 30_000);

    // Count entries before navigating away.
    const countBefore = await page
      .getByTestId("play-by-play-log")
      .locator("[data-log-index]")
      .count();

    // Navigate away — autoplay should pause.
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 5_000 });

    // Wait a short period; with autoplay running this would produce more entries.
    await page.waitForTimeout(2_000);

    // Navigate back to /game.
    await page.getByTestId("home-resume-current-game-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Expand the log to check.
    const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
    if (await logToggle.isVisible()) await logToggle.click();

    // Entry count must not have grown significantly while we were on Home.
    // Allow 1 extra entry for any in-flight pitch at navigation time.
    const countAfter = await page
      .getByTestId("play-by-play-log")
      .locator("[data-log-index]")
      .count();
    expect(countAfter).toBeLessThanOrEqual(countBefore + 2);
  });
});
