import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  closeSavesModal,
  gotoFreshApp,
  loadSaveByName,
  openSavesModal,
  saveCurrentGame,
  takeManagerAction,
  waitForAtLeastLogLines,
  waitForManagerDecision,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Manager Mode", () => {
  test("manager mode checkbox is visible after game starts", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("manager-mode-checkbox")).toBeVisible();
  });

  test("enabling manager mode shows team and strategy selectors", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    const checkbox = page.getByTestId("manager-mode-checkbox");
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    // Strategy and team selectors should now be visible
    await expect(page.getByRole("combobox", { name: /strategy/i })).toBeVisible({ timeout: 3_000 });
  });

  test("decision panel appears once manager mode is enabled and game progresses", async ({
    page,
  }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    // Enable manager mode via the dialog (select "Home" managed team)
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    // Wait for a decision (manager mode is active, decisions will come)
    await waitForManagerDecision(page);
    await expect(page.getByTestId("decision-panel")).toBeVisible();
  });

  test("taking a manager action dismisses the decision panel", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    await waitForManagerDecision(page);

    // Click the first visible action button (Skip always available)
    const skipBtn = page.getByTestId("decision-panel").getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    } else {
      // Take whatever first action button is available
      await page.getByTestId("decision-panel").getByRole("button").first().click();
    }

    // Panel should disappear or a new decision takes over
    await expect(page.getByTestId("decision-panel")).not.toBeVisible({ timeout: 5_000 });
  });

  test("manager decision auto-skips after countdown", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    await waitForManagerDecision(page);
    // Decision panel visible; wait for auto-skip (10 s + buffer)
    await expect(page.getByTestId("decision-panel")).not.toBeVisible({ timeout: 15_000 });
  });

  test("manager action state persists across save + reload", async ({ page }) => {
    // Start a new game with manager mode enabled via the dialog's managed-team radio.
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Select a managed team before starting (radio: "0" = away team).
    await page.getByTestId("managed-team-radio-0").check();
    await clickPlayBall(page);
    await page.getByTestId("speed-select").selectOption("350");

    // Confirm manager mode checkbox is checked (set from dialog selection).
    await expect(page.getByTestId("manager-mode-checkbox")).toBeChecked({ timeout: 5_000 });

    // Wait for enough game progress, then save.
    await waitForAtLeastLogLines(page, 5);
    await openSavesModal(page);
    await saveCurrentGame(page);
    await page.waitForTimeout(500);
    await closeSavesModal(page);

    // Capture scoreboard state.
    const scoreBefore = (await page.getByTestId("line-score").textContent()) ?? "";

    // Navigate WITHOUT clearing IndexedDB — use a different seed so New Game dialog opens,
    // but RxDB data (the save we just created) is preserved.
    await page.goto("/?seed=reload-test-mgr");
    await page.waitForLoadState("domcontentloaded");
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await loadSaveByName(page, "New York Mets vs New York Yankees");
    await page.waitForTimeout(500);

    // Manager mode must still be active after loading the save.
    await expect(page.getByTestId("manager-mode-checkbox")).toBeChecked({ timeout: 5_000 });

    // Score must match the pre-reload snapshot.
    const scoreAfter = (await page.getByTestId("line-score").textContent()) ?? "";
    expect(scoreAfter).toBe(scoreBefore);
  });
});
