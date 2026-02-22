import { expect, test } from "@playwright/test";

import {
  loadFirstSave,
  openSavesModal,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

test.describe("Save / Load", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("can save and see the save appear in the list", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme1" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);
    // Default teams are "New York Mets" (away) vs "New York Yankees" (home)
    await expect(
      page
        .getByTestId("saves-modal")
        .getByText("New York Mets vs New York Yankees", { exact: true })
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("loading a save restores the scoreboard", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme2" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);

    // Close the modal and wait for more progress
    await page.getByRole("button", { name: /close/i }).click();
    await waitForLogLines(page, 10);

    // Load the save back
    await loadFirstSave(page);

    // Scoreboard should be visible after load
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });

  test("autoplay continues after loading a save", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme3" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);
    await page.getByRole("button", { name: /close/i }).click();

    await loadFirstSave(page);

    // Autoplay should resume — log should grow
    const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
    if (await logToggle.isVisible()) {
      await logToggle.click();
    }
    await expect(async () => {
      const entries = page.getByTestId("play-by-play-log").locator("div");
      expect(await entries.count()).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 30_000, intervals: [500, 1000, 1000] });
  });

  test("saves modal close button dismisses the dialog", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme4" });
    await openSavesModal(page);
    await expect(page.getByTestId("saves-modal")).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });
  });
});
