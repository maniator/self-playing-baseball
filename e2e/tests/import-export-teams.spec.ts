/**
 * E2E tests for Custom Teams Import/Export feature.
 * Desktop-only: file download and file input are easiest to verify on desktop Chromium.
 */
import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

import { computeTeamsSignature, resetAppState } from "../utils/helpers";

test.describe("Custom Teams — Import/Export", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("export-all button downloads a signed teams JSON file with player sigs", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Create a team
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Export Test Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("custom-team-list")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-teams-button").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^ballgame-teams-.*\.json$/);

    const tmpPath = path.join(testInfo.outputDir, "exported-teams.json");
    await download.saveAs(tmpPath);
    const parsed = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));

    // Top-level shape
    expect(parsed.type).toBe("customTeams");
    expect(parsed.formatVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(Array.isArray(parsed.payload.teams)).toBe(true);
    expect(parsed.payload.teams.length).toBeGreaterThan(0);
    expect(parsed.payload.teams[0].name).toBe("Export Test Team");

    // Bundle-level signature is present and correct
    expect(typeof parsed.sig).toBe("string");
    expect(parsed.sig).toMatch(/^[0-9a-f]{8}$/);
    const expectedSig = await computeTeamsSignature(page, parsed.payload);
    expect(parsed.sig).toBe(expectedSig);

    // Team fingerprint is embedded
    expect(typeof parsed.payload.teams[0].fingerprint).toBe("string");

    // Every lineup player has a sig
    const lineup = parsed.payload.teams[0].roster.lineup as { sig?: string }[];
    expect(lineup.length).toBeGreaterThan(0);
    for (const player of lineup) {
      expect(typeof player.sig).toBe("string");
      expect(player.sig).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  test("per-team export button downloads a JSON file for that team only", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    for (const name of ["Alpha Team", "Beta Team"]) {
      await page.getByTestId("manage-teams-create-button").click();
      await page.getByTestId("custom-team-regenerate-defaults-button").click();
      await page.getByTestId("custom-team-name-input").fill(name);
      await page.getByTestId("custom-team-save-button").click();
      await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
    }

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-team-button").first().click();
    const download = await downloadPromise;

    const tmpPath = path.join(testInfo.outputDir, "per-team-export.json");
    await download.saveAs(tmpPath);
    const parsed = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    expect(parsed.payload.teams).toHaveLength(1);
    // Bundle signature must be present
    expect(typeof parsed.sig).toBe("string");
  });

  test("import teams from exported file — success message and new team visible in list", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

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

    // Delete the team so we can import it back cleanly
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("custom-team-delete-button").click();
    await expect(page.getByText(/no custom teams yet/i)).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("import-teams-file-input").setInputFiles(tmpPath);
    await expect(page.getByTestId("import-teams-success")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("custom-team-list")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Import Round Trip")).toBeVisible();
  });

  test("re-importing the same team is silently skipped (no duplicate created)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Exact Copy Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    // Verify only 1 team before re-import
    const listBefore = page.getByTestId("custom-team-list-item");
    await expect(listBefore).toHaveCount(1);

    // Export the team
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-teams-button").click();
    const download = await downloadPromise;
    const tmpPath = path.join(testInfo.outputDir, "dup-team.json");
    await download.saveAs(tmpPath);

    // Re-import without deleting — exact duplicate should be skipped, not create a second entry
    await page.getByTestId("import-teams-file-input").setInputFiles(tmpPath);
    await expect(page.getByTestId("import-teams-success")).toBeVisible({ timeout: 10_000 });
    const successText = await page.getByTestId("import-teams-success").textContent();
    expect(successText).toMatch(/already exist/i);

    // Still only 1 team — no duplicate created
    const listAfter = page.getByTestId("custom-team-list-item");
    await expect(listAfter).toHaveCount(1);
  });

  test("import shows error for a file with wrong type", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    const badPath = path.join(testInfo.outputDir, "bad-teams.json");
    fs.mkdirSync(path.dirname(badPath), { recursive: true });
    fs.writeFileSync(badPath, '{"type":"saves","formatVersion":1,"payload":{}}');

    await page.getByTestId("import-teams-file-input").setInputFiles(badPath);
    await expect(page.getByTestId("import-teams-error")).toBeVisible({ timeout: 10_000 });
  });

  test("import rejects a file with a tampered bundle signature", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Tamper Target");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-teams-button").click();
    const download = await downloadPromise;
    const tmpPath = path.join(testInfo.outputDir, "export.json");
    await download.saveAs(tmpPath);

    // Tamper: flip the bundle sig
    const obj = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    obj.sig = "00000000";
    const tamperedPath = path.join(testInfo.outputDir, "tampered-teams.json");
    fs.writeFileSync(tamperedPath, JSON.stringify(obj));

    await page.getByTestId("import-teams-file-input").setInputFiles(tamperedPath);
    await expect(page.getByTestId("import-teams-error")).toBeVisible({ timeout: 10_000 });
    const errText = await page.getByTestId("import-teams-error").textContent();
    expect(errText).toMatch(/signature mismatch/i);
  });
});
