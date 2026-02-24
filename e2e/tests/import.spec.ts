import { expect, test } from "@playwright/test";

import {
  importSaveFromFixture,
  openSavesModal,
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

test.describe("Import Save", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("importing a save fixture auto-loads the game and save appears in list", async ({
    page,
  }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Import auto-loads and closes the modal
    await importSaveFromFixture(page, "sample-save.json");
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Reopen modal and confirm save is in the list
    await openSavesModal(page);
    await expect(page.getByTestId("saves-modal").getByText("Mets vs Yankees")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("importing a save auto-loads and game becomes active", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "importme" });
    await waitForLogLines(page, 3);

    // Import auto-loads and closes the modal
    await importSaveFromFixture(page, "sample-save.json");
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });
});
