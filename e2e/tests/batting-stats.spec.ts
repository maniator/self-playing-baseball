/**
 * E2E tests for batting stats consistency — seed 30nl0i regression.
 *
 * Verifies that after a full game completes the Batting Stats panel for the
 * away team shows internally consistent data:
 *
 *   • The First Baseman (slot 2) has fewer AB than the Second Baseman (slot 3)
 *     because of a walk — the AB deficit equals the BB count (valid baseball).
 *   • The PA ordering invariant holds: every earlier slot has >= PA than the
 *     slot that follows it.
 *   • K <= AB for every batter (strikeouts must count as official at-bats).
 */

import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall } from "../utils/helpers";

const SEED = "30nl0i";
// At SPEED_FAST (350 ms/pitch) a ~250-pitch game finishes in ~90 s.
// Allow 180 s total (generous for CI).
const GAME_TIMEOUT = 180_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a stat cell value — "–" displayed as zero. */
const parseCell = (text: string): number => (text.trim() === "–" ? 0 : parseInt(text.trim(), 10));

/** Read { ab, h, bb, k } from a table row (slot-name cell is [0]). */
interface RowStats {
  ab: number;
  h: number;
  bb: number;
  k: number;
}

async function readRowStats(rowLocator: import("@playwright/test").Locator): Promise<RowStats> {
  const cells = await rowLocator.locator("td").allTextContents();
  // Column layout (from PlayerStatsPanel): name(0) AB(1) H(2) BB(3) K(4)
  return {
    ab: parseCell(cells[1] ?? "–"),
    h: parseCell(cells[2] ?? "–"),
    bb: parseCell(cells[3] ?? "–"),
    k: parseCell(cells[4] ?? "–"),
  };
}

// ---------------------------------------------------------------------------
// Tests — run on the "desktop" project only (not the determinism project).
// ---------------------------------------------------------------------------

test.describe("Batting Stats — seed 30nl0i", () => {
  test.setTimeout(GAME_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    // Enable fastest autoplay before page load so the game completes quickly.
    await page.addInitScript(() => {
      localStorage.setItem("autoPlay", "true");
      localStorage.setItem("speed", "350"); // SPEED_FAST
    });
    await resetAppState(page);
  });

  test("game reaches FINAL state", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: SEED });
    await expect(page.getByText("FINAL")).toBeVisible({ timeout: GAME_TIMEOUT - 10_000 });
  });

  test("slot 2 (First Baseman) has fewer AB than slot 3 due to a walk", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: SEED });
    await expect(page.getByText("FINAL")).toBeVisible({ timeout: GAME_TIMEOUT - 10_000 });

    // Away-team tab is active by default (▲ New York Mets)
    const table = page.getByTestId("batting-stats-table");
    await expect(table).toBeVisible();

    const slot2Row = page.getByRole("row").filter({ hasText: /^First Baseman/ });
    const slot3Row = page.getByRole("row").filter({ hasText: /^Second Baseman/ });

    const slot2 = await readRowStats(slot2Row);
    const slot3 = await readRowStats(slot3Row);

    // First Baseman walked at least once in this game.
    expect(slot2.bb).toBeGreaterThan(0);

    // The AB shortfall equals the walk count — this is valid baseball, not a bug.
    expect(slot3.ab - slot2.ab).toBe(slot2.bb);

    // Plate appearances (AB + BB) must be equal or earlier slot has more.
    expect(slot2.ab + slot2.bb).toBeGreaterThanOrEqual(slot3.ab + slot3.bb);
  });

  test("K <= AB for every away batter (strikeouts always count as at-bats)", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: SEED });
    await expect(page.getByText("FINAL")).toBeVisible({ timeout: GAME_TIMEOUT - 10_000 });

    const table = page.getByTestId("batting-stats-table");
    await expect(table).toBeVisible();

    const rows = table.locator("tbody tr");
    expect(await rows.count()).toBe(9);

    for (let i = 0; i < 9; i++) {
      const stats = await readRowStats(rows.nth(i));
      expect(stats.k).toBeLessThanOrEqual(stats.ab);
    }
  });

  test("PA ordering invariant holds for all 9 away slots", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: SEED });
    await expect(page.getByText("FINAL")).toBeVisible({ timeout: GAME_TIMEOUT - 10_000 });

    const table = page.getByTestId("batting-stats-table");
    await expect(table).toBeVisible();

    const rows = table.locator("tbody tr");
    expect(await rows.count()).toBe(9);

    const pas: number[] = [];
    for (let i = 0; i < 9; i++) {
      const stats = await readRowStats(rows.nth(i));
      pas.push(stats.ab + stats.bb);
    }

    // Earlier slots must have >= PA than later slots.
    for (let i = 0; i < 8; i++) {
      expect(pas[i]).toBeGreaterThanOrEqual(pas[i + 1]);
    }
  });

  test("batting stats table is visible on away team tab and hidden when collapsed", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: SEED });
    // Don't need to wait for FINAL — just verify the panel works.
    const table = page.getByTestId("batting-stats-table");
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Collapse
    await page.getByRole("button", { name: /collapse batting stats/i }).click();
    await expect(table).not.toBeVisible();

    // Expand
    await page.getByRole("button", { name: /expand batting stats/i }).click();
    await expect(table).toBeVisible();
  });
});
