import { expect, test } from "@playwright/test";

import {
  captureGameSignature,
  clickPlayBall,
  closeSavesModal,
  gotoFreshApp,
  loadSaveByName,
  openSavesModal,
  saveCurrentGame,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Save / Load", () => {
  test("save current game and see it appear in the saves list", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);

    await openSavesModal(page);
    await saveCurrentGame(page);

    // The save should appear in the list
    const saveItem = page.getByTestId("saves-list").locator('[data-testid="save-item"]').first();
    await expect(saveItem).toBeVisible({ timeout: 5_000 });
    await closeSavesModal(page);
  });

  test("loading a save restores the game state and game resumes", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);

    // Capture state before saving
    const sigBefore = await captureGameSignature(page);

    // Save the game
    await openSavesModal(page);
    await saveCurrentGame(page);
    const saveItem = page.getByTestId("saves-list").locator('[data-testid="save-item"]').first();
    await expect(saveItem).toBeVisible({ timeout: 5_000 });
    const saveName = (await saveItem.locator("[title]").getAttribute("title")) ?? "";
    await closeSavesModal(page);

    // Let the game progress further
    await waitForAtLeastLogLines(page, 8);

    // Load the earlier save
    await openSavesModal(page);
    await loadSaveByName(page, saveName);

    // State should be restored — expand log to check
    const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
    if (await expandBtn.isVisible()) await expandBtn.click();

    const restored = await captureGameSignature(page);
    expect(restored.scores).toBe(sigBefore.scores);

    // Game resumes autoplaying after load
    await waitForAtLeastLogLines(page, sigBefore.logLines.length + 1);
  });

  test("deleting a save removes it from the list", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);

    await openSavesModal(page);
    await saveCurrentGame(page);
    const saveItem = page.getByTestId("saves-list").locator('[data-testid="save-item"]').first();
    await expect(saveItem).toBeVisible({ timeout: 5_000 });

    // Delete it
    await saveItem.getByRole("button", { name: "Delete save" }).click();
    await expect(page.getByTestId("saves-list")).not.toBeVisible({ timeout: 3_000 });
    await closeSavesModal(page);
  });
});
