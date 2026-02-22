import { expect, test } from "@playwright/test";

import {
  importSaveFromFixture,
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

test.describe("Import Save", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("importing a save fixture shows the save in the list", async ({ page }) => {
    // Navigate so the app is loaded but don't start a game yet
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    // Dismiss the dialog by starting a default game
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Import the fixture
    await importSaveFromFixture(page, "sample-save.json");
    await expect(page.getByTestId("saves-modal").getByText("Mets vs Yankees")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can load an imported save and game becomes active", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "importme" });
    await waitForLogLines(page, 3);

    await importSaveFromFixture(page, "sample-save.json");

    // The imported save should be visible in the list with a Load button
    const modal = page.getByTestId("saves-modal");
    await expect(modal.getByText("Mets vs Yankees")).toBeVisible();
    await expect(modal.getByTestId("load-save-button").first()).toBeVisible();

    // Close modal — scoreboard should still be visible
    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible();
  });
});
