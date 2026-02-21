import { expect, test } from "@playwright/test";

import { FIXED_SEED, clickPlayBall, gotoFreshApp, waitForNewGameDialog } from "../utils/helpers";

// RxDB (IndexedDB) persists within a Playwright browser context across page.goto()
// calls as long as we do NOT call resetAppState between navigations.
// gotoFreshApp clears state on first visit; subsequent bare page.goto() preserves IndexedDB.

/**
 * Wait until a half-inning transition has been logged AND the RxDB updateProgress
 * async write has had time to complete.
 * The game logs "X are now up to bat!" after each half-inning ends.
 */
async function waitForHalfInningAndSave(page: Parameters<typeof gotoFreshApp>[0]) {
  // Wait for at least one "up to bat!" entry which confirms a half-inning completed
  // and useRxdbGameSync has fired updateProgress.
  await expect(page.getByText("are now up to bat!").first()).toBeVisible({ timeout: 60_000 });
  // Give the async RxDB write time to complete
  await page.waitForTimeout(2_000);
}

test.describe("Auto-save", () => {
  test("auto-save is created after game starts and Resume button appears on reload", async ({
    page,
  }) => {
    // --- Fresh start ---
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    // Speed up and wait until a half-inning completes (triggers updateProgress)
    await page.getByTestId("speed-select").selectOption("350");
    await waitForHalfInningAndSave(page);

    // --- Reload same seed WITHOUT clearing IndexedDB ---
    await page.goto(`/?seed=${FIXED_SEED}`);
    await page.waitForLoadState("domcontentloaded");

    // New Game dialog must appear with a Resume button (stateSnapshot exists)
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("resume-button")).toBeVisible({ timeout: 15_000 });
  });

  test("clicking Resume restores the game state from the auto-save", async ({ page }) => {
    // --- Step 1: fresh start, play until a half-inning is saved ---
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await page.getByTestId("speed-select").selectOption("350");
    await waitForHalfInningAndSave(page);

    // Capture the line-score state before navigating away
    const scoreBefore = await page.getByTestId("line-score").textContent();

    // --- Step 2: reload without clearing state, click Resume ---
    await page.goto(`/?seed=${FIXED_SEED}`);
    await page.waitForLoadState("domcontentloaded");
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("resume-button")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("resume-button").click();

    // Game should be active with the restored scoreboard state
    await expect(page.getByTestId("line-score")).toBeVisible({ timeout: 5_000 });
    const scoreAfter = await page.getByTestId("line-score").textContent();
    expect(scoreAfter).toBe(scoreBefore);
  });
});
