/**
 * E2E test: importing a save that references a custom team that doesn't exist locally
 * should show a descriptive error message.
 * Desktop-only.
 */
import { expect, test } from "@playwright/test";

import { computeSaveSignature, resetAppState } from "../utils/helpers";

test.describe("Import Save — missing custom team rejection", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("importing a save referencing a missing custom team shows an error", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    // Build a valid signed save JSON with a custom homeTeamId
    const saveDoc = {
      id: `save_${Date.now()}_e2etest`,
      name: "E2E Missing Team Test",
      seed: "abc123",
      homeTeamId: "ct_missing123",
      awayTeamId: "ct_missing_away456",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      progressIdx: -1,
      setup: {
        strategy: "balanced",
        managedTeam: null,
        managerMode: false,
        homeTeam: "My Missing Team",
        awayTeam: "Custom Away",
        playerOverrides: [{}, {}],
        lineupOrder: [[], []],
      },
      schemaVersion: 1,
    };
    const events: never[] = [];

    // Compute FNV-1a signature using the shared E2E helper
    const sig = await computeSaveSignature(page, saveDoc, events);

    const saveJson = JSON.stringify({ version: 1, header: saveDoc, events, sig });

    // Navigate to saves page and paste the JSON
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("paste-save-textarea").fill(saveJson);
    await page.getByTestId("paste-save-button").click();

    // Expect a user-friendly error message about the missing team(s) without raw IDs
    await expect(page.getByTestId("import-error")).toBeVisible({ timeout: 10_000 });
    const errorText = await page.getByTestId("import-error").textContent();
    expect(errorText).toMatch(/not installed on this device/i);
    expect(errorText).toMatch(/Teams page/i);
  });
});
