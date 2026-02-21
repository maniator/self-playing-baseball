import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  closeSavesModal,
  gotoFreshApp,
  openSavesModal,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Modal dialogs", () => {
  // ── New Game Dialog ────────────────────────────────────────────────────────

  test("New Game dialog: opens on first load", async ({ page }) => {
    await gotoFreshApp(page);
    await expect(page.getByTestId("new-game-dialog")).toBeVisible();
  });

  test("New Game dialog: shows all required controls", async ({ page }) => {
    await gotoFreshApp(page);
    await expect(page.getByTestId("home-team-select")).toBeVisible();
    await expect(page.getByTestId("away-team-select")).toBeVisible();
    await expect(page.getByTestId("play-ball-button")).toBeVisible();
    await expect(page.getByTestId("matchup-mode-radio-al")).toBeVisible();
    await expect(page.getByTestId("matchup-mode-radio-nl")).toBeVisible();
    await expect(page.getByTestId("matchup-mode-radio-interleague")).toBeVisible();
  });

  test("New Game dialog: closes after clicking Play Ball", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible();
  });

  test("New Game dialog: cannot be dismissed via Escape", async ({ page }) => {
    await gotoFreshApp(page);
    await page.keyboard.press("Escape");
    // Dialog should remain (onCancel prevents it)
    await expect(page.getByTestId("new-game-dialog")).toBeVisible();
  });

  // ── Saves Modal ────────────────────────────────────────────────────────────

  test("Saves modal: opens when Saves button is clicked", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await expect(page.getByTestId("saves-dialog")).toBeVisible();
  });

  test("Saves modal: closes via Close button", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await closeSavesModal(page);
    await expect(page.getByTestId("saves-dialog")).not.toBeVisible();
  });

  test("Saves modal: closes via backdrop click", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);

    // Click outside the dialog (top-left corner of viewport)
    await page.mouse.click(5, 5);
    await expect(page.getByTestId("saves-dialog")).not.toBeVisible({ timeout: 3_000 });
  });

  test("Saves modal: shows import controls", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await expect(page.getByTestId("import-file-input")).toBeAttached();
    await expect(page.getByTestId("import-json-textarea")).toBeVisible();
    await expect(page.getByTestId("import-from-text-button")).toBeVisible();
    await closeSavesModal(page);
  });

  test("Saves modal: Import from text button is disabled when textarea is empty", async ({
    page,
  }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await expect(page.getByTestId("import-from-text-button")).toBeDisabled();
    await closeSavesModal(page);
  });

  test("Saves modal: import error shown for bad JSON", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await page.getByTestId("import-json-textarea").fill("bad json");
    await page.getByTestId("import-from-text-button").click();
    await expect(page.getByTestId("saves-dialog")).toContainText("Invalid JSON");
    await closeSavesModal(page);
  });

  // ── Instructions Modal ─────────────────────────────────────────────────────

  test("Instructions modal: opens and closes", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);

    const helpBtn = page.getByRole("button", { name: /how to play|help|\?/i });
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    // Instructions dialog should be open
    const instructionsDialog = page
      .getByRole("dialog")
      .filter({ hasText: /how to play|batter up|manager/i });
    await expect(instructionsDialog).toBeVisible({ timeout: 3_000 });

    // Close it
    await instructionsDialog.getByRole("button", { name: /close/i }).click();
    await expect(instructionsDialog).not.toBeVisible({ timeout: 3_000 });
  });

  test("Instructions modal: Escape key closes it", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);

    const helpBtn = page.getByRole("button", { name: /how to play|help|\?/i });
    await helpBtn.click();

    const instructionsDialog = page
      .getByRole("dialog")
      .filter({ hasText: /how to play|batter up|manager/i });
    await expect(instructionsDialog).toBeVisible({ timeout: 3_000 });
    await page.keyboard.press("Escape");
    await expect(instructionsDialog).not.toBeVisible({ timeout: 3_000 });
  });
});
