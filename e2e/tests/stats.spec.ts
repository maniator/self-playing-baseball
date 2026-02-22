import { expect, type Locator, test } from "@playwright/test";
import path from "path";

import { resetAppState, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

/**
 * Player Stats Panel E2E tests.
 *
 * These tests are intentionally kept on a single project (desktop) for the
 * time-sensitive "RBI values after scoring" test, but the fast structural
 * tests run on all viewports.
 */

/** Returns the RBI cell text contents for the currently-active tab. */
async function getActiveTabRbiTexts(statsPanel: Locator): Promise<string[]> {
  return statsPanel.locator("tbody tr td:last-child").allTextContents();
}

/**
 * Clicks the home-team tab (always the 3rd button, index 2, in the panel),
 * reads its RBI cells, then restores the away tab (index 1).
 * Returns the combined [away…, home…] RBI text values.
 *
 * Button order inside player-stats-panel:
 *   0 — collapse/expand toggle ("▼ hide" / "▶ show")
 *   1 — away team tab ("▲ {teams[0]}")
 *   2 — home team tab ("▼ {teams[1]}")
 */
async function getBothTabsRbi(statsPanel: Locator): Promise<string[]> {
  const awayTexts = await getActiveTabRbiTexts(statsPanel);
  await statsPanel.locator("button").nth(2).click(); // home tab
  const homeTexts = await getActiveTabRbiTexts(statsPanel);
  await statsPanel.locator("button").nth(1).click(); // restore away tab
  return [...awayTexts, ...homeTexts];
}

test.describe("Player Stats Panel — structure", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("batting stats table has RBI column header", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "statsrbi1" });
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    // The RBI column header must appear in the thead
    await expect(statsPanel.getByRole("columnheader", { name: "RBI" })).toBeVisible();
  });

  test("PlayerStatsPanel is ordered before HitLog in the log panel", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "statsorder1" });
    // Both elements must be present before checking order.
    // hit-log renders when not collapsed (default); player-stats-panel is always visible.
    await expect(page.getByTestId("player-stats-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("hit-log")).toBeVisible({ timeout: 10_000 });

    // Verify DOM order: player-stats-panel precedes hit-log in document order.
    // Node.DOCUMENT_POSITION_FOLLOWING (4) means the second argument comes
    // AFTER the first in tree order.
    const statsFirst = await page.evaluate(() => {
      const stats = document.querySelector('[data-testid="player-stats-panel"]');
      const hitLog = document.querySelector('[data-testid="hit-log"]');
      if (!stats || !hitLog) return false;
      return !!(stats.compareDocumentPosition(hitLog) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(statsFirst).toBe(true);
  });

  test("stats table shows AB, H, BB, K and RBI columns", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "statsrbi2" });
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    const headers = ["AB", "H", "BB", "K", "RBI"];
    for (const h of headers) {
      await expect(statsPanel.getByRole("columnheader", { name: h })).toBeVisible();
    }
  });
});

test.describe("Player Stats Panel — RBI values (desktop only)", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("RBI values update after a scoring play", async ({ page }, testInfo) => {
    // Restrict to desktop: this test waits up to 90 s for a scoring play.
    // Running on all 6 projects × 90 s would make CI unacceptably slow.
    test.skip(testInfo.project.name !== "desktop", "RBI scoring test is desktop-only");
    test.setTimeout(120_000);

    // Use a seed known to produce scoring within 80 log entries.
    await startGameViaPlayBall(page, { seed: "rbi-save1" });
    const statsPanel = page.getByTestId("player-stats-panel");

    // Wait for enough log entries that scoring is virtually certain.
    // 80 play-by-play entries ≈ several innings of at-bats; almost all
    // simulated games score within that span.
    await waitForLogLines(page, 80, 90_000);

    // A run has scored — at least one team's batter must have a non-zero RBI.
    // Check BOTH team tabs: scoring could be by away or home first.
    const allRbi = await getBothTabsRbi(statsPanel);
    expect(allRbi.some((t) => t !== "–" && t.trim() !== "")).toBe(true);
  });

  test("RBI stats are preserved after save and reload", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "RBI save/load test is desktop-only");
    test.setTimeout(120_000);

    await startGameViaPlayBall(page, { seed: "rbi-save1" });
    const statsPanel = page.getByTestId("player-stats-panel");

    // Wait for enough log entries that scoring is virtually certain.
    await waitForLogLines(page, 50, 90_000);

    // Capture both-tab RBI state before saving.
    const rbiBeforeSave = await getBothTabsRbi(statsPanel);
    expect(rbiBeforeSave.some((t) => t !== "–")).toBe(true);

    // Save the game.
    await page.getByTestId("saves-button").click();
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("save-game-button").click();
    await expect(page.getByTestId("load-save-button").first()).toBeVisible({ timeout: 10_000 });

    // Load the saved game back.
    await page.getByTestId("load-save-button").first().click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });

    // RBI values after reload: at least one team must still have non-zero RBI.
    const rbiAfterLoad = await getBothTabsRbi(statsPanel);
    expect(rbiAfterLoad.some((t) => t !== "–" && t.trim() !== "")).toBe(true);
  });

  test("imported old save (no rbi field) loads without errors and shows stats", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Import RBI backfill test is desktop-only");

    await startGameViaPlayBall(page, { seed: "importrbi" });
    await waitForLogLines(page, 3);

    // Import the sample fixture (has empty playLog — no rbi fields).
    const fixturePath = path.resolve(__dirname, "../fixtures/sample-save.json");
    await page.getByTestId("saves-button").click();
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
    await expect(page.getByTestId("saves-modal").getByText("Mets vs Yankees")).toBeVisible({
      timeout: 10_000,
    });

    // Load the imported save.
    const modal = page.getByTestId("saves-modal");
    const importedRow = modal.locator("li").filter({ hasText: "Mets vs Yankees" });
    await importedRow.getByTestId("load-save-button").click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Stats panel must be visible and show RBI column (empty playLog → all "–").
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    await expect(statsPanel.getByRole("columnheader", { name: "RBI" })).toBeVisible();
    // With an empty playLog all RBI cells should show "–" (defaulted to 0 via backfill).
    const rbiCells = statsPanel.locator("tbody tr td:last-child");
    const texts = await rbiCells.allTextContents();
    expect(texts.every((t) => t === "–")).toBe(true);
  });
});
