import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  FIXED_SEED,
  gotoFreshApp,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

// RxDB (IndexedDB) persists within a Playwright browser context across page.goto()
// calls, as long as we do NOT call resetAppState between navigations.
// gotoFreshApp clears state on the FIRST visit; subsequent bare page.goto() calls
// keep IndexedDB intact, which is exactly what the auto-save tests need.

test.describe("Auto-save", () => {
  test("auto-save is created after game starts and Resume button appears on reload", async ({
    page,
  }) => {
    // --- Fresh start: clear all state, start the game ---
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    // Speed up autoplay so a half-inning (3 outs) finishes quickly,
    // triggering SaveStore.updateProgress() which writes the stateSnapshot.
    await page.getByTestId("speed-select").selectOption("350");

    // Wait for enough play-by-play entries to cover at least one half-inning.
    await waitForAtLeastLogLines(page, 20);

    // Extra buffer for the async RxDB write to complete.
    await page.waitForTimeout(1_000);

    // --- Reload to the same seed URL WITHOUT clearing IndexedDB ---
    await page.goto(`/?seed=${FIXED_SEED}`);
    await page.waitForLoadState("domcontentloaded");

    // New Game dialog must appear …
    await waitForNewGameDialog(page);

    // … with a Resume button (only shown when stateSnapshot exists in RxDB).
    await expect(page.getByTestId("resume-button")).toBeVisible({ timeout: 15_000 });
  });

  test("clicking Resume restores the game state from the auto-save", async ({ page }) => {
    // --- Step 1: fresh start, play until a half-inning is saved ---
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await page.getByTestId("speed-select").selectOption("350");
    await waitForAtLeastLogLines(page, 20);
    await page.waitForTimeout(1_000);

    // Capture the line-score state before navigating away.
    const scoreBefore = await page.getByTestId("line-score").textContent();

    // --- Step 2: reload without clearing state, click Resume ---
    await page.goto(`/?seed=${FIXED_SEED}`);
    await page.waitForLoadState("domcontentloaded");
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("resume-button")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("resume-button").click();

    // Game should be active and the scoreboard should reflect the restored state.
    await expect(page.getByTestId("line-score")).toBeVisible({ timeout: 5_000 });
    const scoreAfter = await page.getByTestId("line-score").textContent();

    // The restored line-score must match what we captured before the reload.
    expect(scoreAfter).toBe(scoreBefore);
  });
});
