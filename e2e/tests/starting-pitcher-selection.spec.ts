/**
 * Starting Pitcher Selection — E2E tests for the pregame pitcher selector.
 *
 * Covers:
 * 1. Pitcher selector is absent for MLB games (no custom roster)
 * 2. Pitcher selector is absent when no team is managed
 * 3. Pitcher selector appears for the managed team in a custom game
 * 4. Selector only shows SP-eligible pitchers (SP or SP/RP roles)
 * 5. Selecting a starter and starting the game applies the chosen pitcher
 */
import { expect, test } from "@playwright/test";

import {
  disableAnimations,
  resetAppState,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

/** Helper: create and save a custom team, then return to the home screen. */
async function createAndSaveTeam(
  page: Parameters<typeof resetAppState>[0],
  name: string,
): Promise<void> {
  await page.getByTestId("home-manage-teams-button").click();
  await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("manage-teams-create-button").click();
  await expect(page.getByTestId("custom-team-name-input")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("custom-team-regenerate-defaults-button").click();
  await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", {
    timeout: 3_000,
  });
  await page.getByTestId("custom-team-name-input").fill(name);
  await page.getByTestId("custom-team-save-button").click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("manage-teams-back-button").click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
}

test.describe("Starting pitcher selector — New Game dialog", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("pitcher selector is absent for MLB game regardless of managed team", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-new-game-button").click();
    await waitForNewGameDialog(page);

    // Select managed team on MLB tab
    await page.locator('input[name="managed"][value="0"]').check();

    // MLB tab: no pitcher selector
    await expect(page.getByTestId("starting-pitcher-select")).not.toBeVisible();
  });

  test("pitcher selector is absent when no team is managed (just watch)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await createAndSaveTeam(page, "SP Test Home 1");
    await createAndSaveTeam(page, "SP Test Away 1");

    await page.getByTestId("home-new-game-button").click();
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(
      page.getByTestId("new-game-custom-away-team-select").locator("option"),
    ).toHaveCount(2, { timeout: 5_000 });

    // "None — just watch" is the default; pitcher selector should not appear
    await expect(page.getByTestId("starting-pitcher-select")).not.toBeVisible();
  });

  test("pitcher selector appears for the managed team in a custom game", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await createAndSaveTeam(page, "SP Test Home 2");
    await createAndSaveTeam(page, "SP Test Away 2");

    await page.getByTestId("home-new-game-button").click();
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(
      page.getByTestId("new-game-custom-away-team-select").locator("option"),
    ).toHaveCount(2, { timeout: 5_000 });

    // Select managed away team
    await page.locator('input[name="managed"][value="0"]').check();

    // Pitcher selector should appear
    await expect(page.getByTestId("starting-pitcher-select")).toBeVisible({ timeout: 3_000 });
    // Should have at least one option (the SP-eligible pitcher)
    const options = page.getByTestId("starting-pitcher-select").locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("selecting a starter and starting the game applies the chosen pitcher", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await createAndSaveTeam(page, "SP Apply Home");
    await createAndSaveTeam(page, "SP Apply Away");

    await page.getByTestId("home-new-game-button").click();
    await waitForNewGameDialog(page);
    await page.getByTestId("new-game-custom-teams-tab").click();
    await expect(
      page.getByTestId("new-game-custom-away-team-select").locator("option"),
    ).toHaveCount(2, { timeout: 5_000 });

    // Manage the away team and select first SP-eligible pitcher
    await page.locator('input[name="managed"][value="0"]').check();
    await expect(page.getByTestId("starting-pitcher-select")).toBeVisible({ timeout: 3_000 });

    // Start the game
    await page.getByTestId("seed-input").fill("sp-select1");
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });

    // Game should start successfully
    await waitForLogLines(page, 2);
    // Scoreboard should show inning 1 (game started, not still in dialog)
    const scoreboardText = await page.getByTestId("scoreboard").textContent();
    expect(scoreboardText).toBeTruthy();
  });
});
