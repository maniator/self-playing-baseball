import { expect, test } from "@playwright/test";
import * as fs from "fs";

import {
  configureNewGame,
  loadFirstSave,
  openSavesModal,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Save / Load", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("can save and see the save appear in the list", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme1" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);
    // Verify a save item is visible in the modal (team names are auto-generated)
    await expect(page.getByTestId("saves-modal").getByTestId("saves-list-item")).toHaveCount(1, {
      timeout: 10_000,
    });
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

    // Expand the log if collapsed
    const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
    if (await logToggle.isVisible()) {
      await logToggle.click();
    }

    // Capture baseline count immediately after load, then assert it grows —
    // this proves autoplay is actually generating new events, not just that
    // the restored state already had entries.
    const logEntries = page.getByTestId("play-by-play-log").locator("[data-log-index]");
    const baselineCount = await logEntries.count();
    await expect(async () => {
      expect(await logEntries.count()).toBeGreaterThan(baselineCount);
    }).toPass({ timeout: 30_000, intervals: [500, 1000, 1000] });
  });

  test("saves modal close button dismisses the dialog", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "saveme4" });
    await openSavesModal(page);
    await expect(page.getByTestId("saves-modal")).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });
  });

  test("export roundtrip: exported save can be re-imported and loaded", async ({ page }) => {
    // 1. Start a game and save it (manual save has "· Inning N" in the name
    //    which distinguishes it from the auto-save that GameInner creates).
    await startGameViaPlayBall(page, { seed: "export1" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);

    // 2. Export the manual save (it's at the top of the list since it was
    //    saved most recently).
    const modal = page.getByTestId("saves-modal");
    // The manual save contains "· Inning" which the raw auto-save does not.
    const manualSaveRow = modal.locator("li").filter({ hasText: "· Inning" }).first();
    await expect(manualSaveRow).toBeVisible({ timeout: 5_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      manualSaveRow.getByTestId("export-save-button").click(),
    ]);

    // 3. Read the exported JSON from the downloaded file.
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error("Download path is null — download may have failed");
    const exportedJson = fs.readFileSync(downloadPath, "utf-8");
    expect(exportedJson).toContain('"header"');

    // 4. Delete the original save so we can tell whether the import actually
    //    creates a new entry.  resetAppState() only navigates — it does NOT
    //    wipe IndexedDB — so without this step the pre-existing "· Inning" row
    //    would still be present after "reset", making the import assertion a
    //    false positive (Codex review comment).
    await manualSaveRow.getByRole("button", { name: /delete save/i }).click();
    await expect(modal.locator("li").filter({ hasText: "· Inning" })).toHaveCount(0, {
      timeout: 5_000,
    });

    // 5. Close the modal and reset to a fresh game state.
    await page.getByRole("button", { name: /close/i }).click();
    await resetAppState(page);
    await configureNewGame(page);
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // 6. Import via paste and let auto-load handle the rest.
    await openSavesModal(page);
    await page.getByTestId("import-save-textarea").fill(exportedJson);
    await page.getByTestId("import-save-button").click();
    // Auto-load closes the modal and restores the game state.
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
  });
});
