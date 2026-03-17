import { expect, type Page } from "@playwright/test";
import path from "path";

import { dispatchClickUntil } from "./helpers.core";

/**
 * Opens the Saves modal by clicking the Saves button.
 */
export async function openSavesModal(page: Page): Promise<void> {
  const savesBtn = page.getByTestId("saves-button");
  const savesModal = page.getByTestId("saves-modal");
  await savesBtn.waitFor({ state: "visible", timeout: 15_000 });
  await dispatchClickUntil(
    savesBtn,
    async () => {
      await expect(savesModal).toBeVisible({ timeout: 2_000 });
    },
    { guard: async () => !(await savesModal.isVisible()) },
  );
}

/**
 * Saves the current game and waits until at least one load button appears.
 */
export async function saveCurrentGame(page: Page): Promise<void> {
  await openSavesModal(page);
  await page.getByTestId("save-game-button").click();
  await expect(page.getByTestId("load-save-button").first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Loads the first save slot visible in the Saves modal.
 */
export async function loadFirstSave(page: Page): Promise<void> {
  await openSavesModal(page);
  await page.getByTestId("load-save-button").first().click();
  await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Loads the save slot whose row contains `name`.
 */
export async function loadSaveByName(page: Page, name: string): Promise<void> {
  await openSavesModal(page);
  const modal = page.getByTestId("saves-modal");
  const row = modal.locator("li").filter({ hasText: name });
  await row.getByTestId("load-save-button").click();
  await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Imports a save fixture through the Saves modal file input.
 */
export async function importSaveFromFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await openSavesModal(page);
  await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
  await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Imports a game history export fixture via the Saves modal file input.
 */
export async function importHistoryFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await openSavesModal(page);
  await page.getByTestId("import-history-file-input").setInputFiles(fixturePath);
  await expect(page.getByTestId("import-history-success")).toBeVisible({ timeout: 10_000 });

  const closeBtn = page.getByTestId("saves-modal-close-button");
  const modal = page.getByTestId("saves-modal");
  await dispatchClickUntil(
    closeBtn,
    async () => {
      await expect(modal).not.toBeVisible({ timeout: 2_000 });
    },
    { guard: async () => await modal.isVisible() },
  );
}
