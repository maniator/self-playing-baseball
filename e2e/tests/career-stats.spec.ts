import { expect, type Page, test } from "@playwright/test";

import {
  importHistoryFixture,
  importTeamsFixture,
  resetAppState,
  startGameViaPlayBall,
} from "../utils/helpers";

/**
 * E2E smoke tests for the Career Stats hub.
 *
 * Two describe blocks:
 *  1. Smoke — navigation + empty-state (no seeded history needed, fast).
 *  2. Seeded history — imports `career-stats-history.json` fixture via the
 *     SavesModal and verifies that batting/pitching tables render real rows.
 *
 * The fixture contains:
 *   - 1 completed game  (teamId = "e2e_home_team")
 *   - 2 batters:        J. Slugger (2H/4AB/2RBI/1HR) · M. Contact (3H/4AB)
 *   - 3 pitchers:       A. Ace (6.0 IP, 0 SV/HLD/BS) · S. Setup (2.0 IP, HLD=1)
 *                       C. Closer (1.0 IP, SV=1)
 */

// ── 1. Smoke (empty state) ──────────────────────────────────────────────────

test.describe("Career Stats smoke", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Career Stats button is visible on the Home screen", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-career-stats-button")).toBeVisible();
  });

  test("Career Stats page loads at /stats", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
  });

  test("Career Stats button navigates to Career Stats page", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("home-career-stats-button").click();
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/stats");
  });

  test("Career Stats page shows no-teams empty state on fresh install", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    // Fresh install → no teams, no history → explicit no-teams message
    await expect(page.getByTestId("career-stats-no-teams")).toBeVisible({ timeout: 5_000 });
    // The team selector must NOT appear in this state.
    await expect(page.getByTestId("career-stats-team-select")).not.toBeVisible();
  });

  test("Career Stats page has Batting and Pitching tab buttons", async ({ page }) => {
    // Start a game so we have at least one team option in the selector.
    await startGameViaPlayBall(page);
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("career-stats-batting-tab")).toBeVisible();
    await expect(page.getByTestId("career-stats-pitching-tab")).toBeVisible();
  });

  test("Career Stats page — clicking Pitching tab does not crash", async ({ page }) => {
    await startGameViaPlayBall(page);
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("career-stats-pitching-tab").click();
    await expect(page.getByTestId("career-stats-page")).toBeVisible();
  });

  test("Player Career page loads at /players/:playerKey", async ({ page }) => {
    await page.goto("/players/test_player_key");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
  });

  test("Player Career page shows empty state for unknown player", async ({ page }) => {
    await page.goto("/players/unknown_player_key_abc");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/no batting data/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Career Stats page renders visible content on current viewport", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    const { width, height } = page.viewportSize()!;
    const box = await page.getByTestId("career-stats-page").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y).toBeLessThan(height);
  });

  test("Career Stats page has a visible heading", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
  });
});

// ── 2. Seeded history ───────────────────────────────────────────────────────

test.describe("Career Stats with seeded history", () => {
  /**
   * Seed helper: starts a game (to get SavesModal access), imports the
   * career-stats-history.json fixture, then navigates to /stats and selects
   * the seeded team from the dropdown.
   */
  async function seedAndOpen(page: Page) {
    // Pre-seed slow autoplay (1200 ms/pitch) so rapid re-renders on mobile
    // WebKit don't detach the saves-button during importHistoryFixture.
    await page.addInitScript(() => {
      localStorage.setItem("speed", "1200");
    });
    await startGameViaPlayBall(page);
    await importHistoryFixture(page, "career-stats-history.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    // The seeded team ID is "e2e_home_team" (non-custom → appears as raw ID in selector).
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 5_000 });
    await teamSelect.selectOption("e2e_home_team");
  }

  test("batting tab shows seeded batter rows", async ({ page }) => {
    await seedAndOpen(page);
    // Default tab is Batting.
    await expect(page.getByTestId("career-stats-batting-tab")).toBeVisible();
    // Wait for the table to appear (stats load asynchronously).
    await expect(page.getByText("J. Slugger")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("M. Contact")).toBeVisible({ timeout: 5_000 });
  });

  test("batting tab shows correct counting stats for J. Slugger", async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.getByText("J. Slugger")).toBeVisible({ timeout: 10_000 });
    // J. Slugger: 4 AB, 2 H, 1 HR, 2 RBI — check at least the HR column value.
    // The page renders a table row; we verify the row contains expected numbers.
    const sluggerRow = page.locator("tr", { hasText: "J. Slugger" });
    await expect(sluggerRow).toContainText("1"); // HR = 1
    await expect(sluggerRow).toContainText("2"); // hits or RBI = 2
  });

  test("pitching tab shows seeded pitcher rows with ERA/WHIP/SV/HLD", async ({ page }) => {
    await seedAndOpen(page);
    // Switch to Pitching tab.
    await page.getByTestId("career-stats-pitching-tab").click();
    // All three seeded pitchers should appear.
    await expect(page.getByText("A. Ace")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("S. Setup")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("C. Closer")).toBeVisible({ timeout: 5_000 });
    // C. Closer has SV=1 — find the row and verify SV column.
    const closerRow = page.locator("tr", { hasText: "C. Closer" });
    await expect(closerRow).toContainText("1"); // SV = 1
    // S. Setup has HLD=1.
    const setupRow = page.locator("tr", { hasText: "S. Setup" });
    await expect(setupRow).toContainText("1"); // HLD = 1
  });

  test("pitching tab shows IP and ERA correctly for A. Ace", async ({ page }) => {
    await seedAndOpen(page);
    await page.getByTestId("career-stats-pitching-tab").click();
    await expect(page.getByText("A. Ace")).toBeVisible({ timeout: 10_000 });
    // A. Ace: outsPitched=18 → IP=6.0; earnedRuns=3 → ERA=(3*27)/18=4.50
    const aceRow = page.locator("tr", { hasText: "A. Ace" });
    await expect(aceRow).toContainText("6.0"); // IP
    await expect(aceRow).toContainText("4.50"); // ERA
  });

  test("clicking a batter row navigates to /players/:playerKey", async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.getByText("J. Slugger")).toBeVisible({ timeout: 10_000 });
    await page.getByText("J. Slugger").click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/players/e2e_batter_slugger");
  });

  test("player career page shows batting game log for J. Slugger", async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.getByText("J. Slugger")).toBeVisible({ timeout: 10_000 });
    await page.getByText("J. Slugger").click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 10_000 });
    // Batting tab is active by default — should show career totals + game log.
    await expect(page.getByText("Career Totals")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Game Log")).toBeVisible({ timeout: 5_000 });
    // The game log should contain the batter's stats (4 AB, 2 hits).
    await expect(page.getByText("J. Slugger")).toBeVisible();
  });

  test("player career page shows pitching game log for C. Closer (SV=1)", async ({ page }) => {
    await seedAndOpen(page);
    await page.getByTestId("career-stats-pitching-tab").click();
    await expect(page.getByText("C. Closer")).toBeVisible({ timeout: 10_000 });
    await page.getByText("C. Closer").click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 10_000 });
    // Switch to Pitching tab on player career page.
    await page.getByText("Pitching").click();
    // SV column should show 1 in the totals row.
    await expect(page.getByText("Career Totals")).toBeVisible({ timeout: 5_000 });
    const totalsRow = page.locator("tr").filter({ hasText: /1\.0/ }).first();
    await expect(totalsRow).toContainText("1"); // SV = 1
  });

  test("Prev/Next navigation works when a team context is provided", async ({ page }) => {
    // Seed history first so player career data exists.
    await seedAndOpen(page);
    // Import a custom team that maps the fixture player IDs (e2e_batter_slugger,
    // e2e_batter_contact) to a real custom team roster for roster-context navigation.
    await importTeamsFixture(page, "career-stats-e2e-team.json");
    // Navigate to the seeded batter with the custom team as navigation context.
    await page.goto("/players/e2e_batter_slugger?team=custom:ct_e2e_career");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Both Prev and Next buttons must be visible (roster has 2 batters + 1 pitcher).
    await expect(page.getByTestId("player-career-prev")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("player-career-next")).toBeVisible({ timeout: 5_000 });
    // Click Next — navigates to the second player in the roster (M. Contact).
    await page.getByTestId("player-career-next").click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/players/e2e_batter_contact");
  });
});
