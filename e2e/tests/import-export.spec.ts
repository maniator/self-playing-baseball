import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

import {
  clickPlayBall,
  closeSavesModal,
  FIXTURES_DIR,
  gotoFreshApp,
  importSaveFile,
  importSavePaste,
  openSavesModal,
  saveCurrentGame,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Import / Export", () => {
  test("import save via file upload and see it in the saves list", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    await openSavesModal(page);
    await importSaveFile(page, path.join(FIXTURES_DIR, "sample-save.json"));

    // The imported save should appear
    await expect(
      page.getByTestId("saves-list").locator('[data-testid="save-item"]').first(),
    ).toBeVisible({ timeout: 5_000 });
    await closeSavesModal(page);
  });

  test("import save via paste and see it in the saves list", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    const json = fs.readFileSync(path.join(FIXTURES_DIR, "sample-save.json"), "utf8");
    await openSavesModal(page);
    await importSavePaste(page, json);

    await expect(
      page.getByTestId("saves-list").locator('[data-testid="save-item"]').first(),
    ).toBeVisible({ timeout: 5_000 });
    await closeSavesModal(page);
  });

  test("import save with invalid JSON shows an error", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    await openSavesModal(page);
    await importSavePaste(page, "not valid json at all");
    await expect(page.locator('[data-testid="saves-dialog"]')).toContainText("Invalid JSON");
    await closeSavesModal(page);
  });

  test("export save triggers a download", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);

    await openSavesModal(page);
    await saveCurrentGame(page);
    const saveItem = page.getByTestId("saves-list").locator('[data-testid="save-item"]').first();
    await expect(saveItem).toBeVisible({ timeout: 5_000 });

    // Intercept download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      saveItem.getByRole("button", { name: "Export" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^ballgame-.+\.json$/);
    await closeSavesModal(page);
  });

  test("roundtrip: export then import produces a matching save entry", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);

    // Save and export
    await openSavesModal(page);
    await saveCurrentGame(page);
    const saveItem = page.getByTestId("saves-list").locator('[data-testid="save-item"]').first();
    await expect(saveItem).toBeVisible({ timeout: 5_000 });
    const originalName = (await saveItem.locator("[title]").getAttribute("title")) ?? "saved game";

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      saveItem.getByRole("button", { name: "Export" }).click(),
    ]);

    // Read exported JSON from download stream
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exportedJson = Buffer.concat(chunks).toString("utf8");

    // Reset and import
    await closeSavesModal(page);
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await importSavePaste(page, exportedJson);

    await expect(
      page
        .getByTestId("saves-list")
        .locator('[data-testid="save-item"]')
        .filter({ hasText: originalName }),
    ).toBeVisible({ timeout: 5_000 });
    await closeSavesModal(page);
  });
});
