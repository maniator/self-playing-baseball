import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

import {
  importTeamsFixture,
  openSavesModal,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

/**
 * Modal / dialog smoke tests — verify open/close behavior, form state,
 * and one representative destructive action for each key dialog in the app.
 *
 * These tests run across all non-determinism viewport projects so we catch
 * any layout issues that might prevent a button from being reachable.
 */
test.describe("Modals", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  // ── New Game setup ────────────────────────────────────────────────────────

  test.describe("New Game setup", () => {
    test("opens via New Game button and shows Play Ball button", async ({ page }) => {
      await waitForNewGameDialog(page);
      await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("play-ball-button")).toBeVisible();
    });

    test("submitting the form (Play Ball!) navigates to the game", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal0" });
      await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── Saves modal ────────────────────────────────────────────────────────────

  test.describe("Saves modal", () => {
    test("opens via the Saves button and shows the import section", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal1" });
      await openSavesModal(page);
      const modal = page.getByTestId("saves-modal");
      await expect(modal).toBeVisible();
      // Import textarea is always present inside the modal.
      await expect(modal.getByTestId("import-save-textarea")).toBeVisible();
    });

    test("Close button dismisses the modal", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal2" });
      await openSavesModal(page);
      await expect(page.getByTestId("saves-modal")).toBeVisible();
      await page.getByRole("button", { name: /close/i }).click();
      await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });
    });

    test("import textarea clears after a successful import", async ({ page }) => {
      // Fixture teams must exist in the DB before the save can be imported.
      await importTeamsFixture(page, "fixture-teams.json");
      await startGameViaPlayBall(page, { seed: "modal3" });
      await openSavesModal(page);

      // Read the sample fixture and paste it into the import textarea.
      const fixturePath = path.resolve(__dirname, "../fixtures/sample-save.json");
      const fixtureJson = fs.readFileSync(fixturePath, "utf-8");
      await page.getByTestId("import-save-textarea").fill(fixtureJson);
      await expect(page.getByTestId("import-save-button")).toBeEnabled();

      await page.getByTestId("import-save-button").click();

      // After a successful import the app clears the textarea.
      await expect(page.getByTestId("import-save-textarea")).toHaveValue("", { timeout: 10_000 });
    });

    test("delete button removes a save from the list", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal4" });
      await waitForLogLines(page, 5);
      await saveCurrentGame(page);

      // Wait for both the auto-save (created on game start) and the manual save
      // to appear in the reactive RxDB-backed list before we snapshot the count.
      // Both are created asynchronously; we need ≥ 2 items so there is always
      // at least one left after deletion — avoiding a false "still 1" result when
      // the autosave appears concurrently with (or just after) the deletion.
      const modal = page.getByTestId("saves-modal");
      const listItems = modal.locator("li");
      await expect(async () => {
        expect(await listItems.count()).toBeGreaterThanOrEqual(2);
      }).toPass({ timeout: 10_000 });
      const countBefore = await listItems.count();

      // Click the delete (✕) button on the first save.
      await listItems
        .first()
        .getByRole("button", { name: /delete save/i })
        .click();

      // The list should have one fewer item after deletion.
      await expect(async () => {
        expect(await listItems.count()).toBeLessThan(countBefore);
      }).toPass({ timeout: 10_000 });
    });
  });

  // ── Import save form ───────────────────────────────────────────────────────

  test.describe("Import save form", () => {
    test("Import from text button is disabled when textarea is empty", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal5" });
      await openSavesModal(page);
      const importBtn = page.getByTestId("import-save-button");
      await expect(importBtn).toBeDisabled();
    });

    test("invalid JSON in import textarea shows an error message", async ({ page }) => {
      await startGameViaPlayBall(page, { seed: "modal6" });
      await openSavesModal(page);

      // Enter clearly invalid JSON.
      await page.getByTestId("import-save-textarea").fill("not-valid-json");
      await page.getByTestId("import-save-button").click();

      // An error message should appear inside the modal.
      await expect(page.getByTestId("import-error")).toBeVisible({ timeout: 5_000 });
    });
  });
});
