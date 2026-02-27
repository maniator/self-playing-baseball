/**
 * E2E tests for Custom Teams Import/Export feature.
 * Desktop-only: file download and file input are easiest to verify on desktop Chromium.
 */
import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

import { resetAppState } from "../utils/helpers";

test.describe("Custom Teams — Import/Export", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("export-all button downloads a valid teams JSON file", async ({ page, testInfo }) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    // Navigate to Manage Teams
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Create a team via the editor
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-name-input").fill("Export Test Team");
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Export Test Team");
    await page.getByTestId("custom-team-save-button").click();

    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("custom-team-list")).toBeVisible();

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-teams-button").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^ballgame-teams-.*\.json$/);

    // Save and validate the file content
    const tmpPath = path.join(testInfo.outputDir, "exported-teams.json");
    await download.saveAs(tmpPath);
    const content = fs.readFileSync(tmpPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.type).toBe("customTeams");
    expect(parsed.formatVersion).toBe(1);
    expect(Array.isArray(parsed.payload.teams)).toBe(true);
    expect(parsed.payload.teams.length).toBeGreaterThan(0);
    expect(parsed.payload.teams[0].name).toBe("Export Test Team");
  });

  test("per-team export button downloads a JSON file for that team only", async ({
    page,
    testInfo,
  }) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Create two teams
    for (const name of ["Alpha Team", "Beta Team"]) {
      await page.getByTestId("manage-teams-create-button").click();
      await page.getByTestId("custom-team-regenerate-defaults-button").click();
      await page.getByTestId("custom-team-name-input").fill(name);
      await page.getByTestId("custom-team-save-button").click();
      await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    }

    // Export only the first team via its per-item export button
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-team-button").first().click();
    const download = await downloadPromise;

    const tmpPath = path.join(testInfo.outputDir, "per-team-export.json");
    await download.saveAs(tmpPath);
    const parsed = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    expect(parsed.payload.teams).toHaveLength(1);
  });

  test("import teams from exported file — success message and new team visible in list", async ({
    page,
    testInfo,
  }) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Create and export a team
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Import Round Trip");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-teams-button").click();
    const download = await downloadPromise;
    const tmpPath = path.join(testInfo.outputDir, "round-trip.json");
    await download.saveAs(tmpPath);

    // Delete the team so we can import it back
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("custom-team-delete-button").click();
    await expect(page.getByText(/no custom teams yet/i)).toBeVisible({ timeout: 5_000 });

    // Import via file input
    await page.getByTestId("import-teams-file-input").setInputFiles(tmpPath);
    await expect(page.getByTestId("import-teams-success")).toBeVisible({ timeout: 10_000 });

    // Team should appear in the list
    await expect(page.getByTestId("custom-team-list")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Import Round Trip")).toBeVisible();
  });

  test("import shows error message for invalid file", async ({ page, testInfo }) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Write an invalid JSON file
    const badPath = path.join(testInfo.outputDir, "bad-teams.json");
    fs.writeFileSync(badPath, '{"type":"saves","formatVersion":1,"payload":{}}');

    await page.getByTestId("import-teams-file-input").setInputFiles(badPath);
    await expect(page.getByTestId("import-teams-error")).toBeVisible({ timeout: 10_000 });
  });
});
