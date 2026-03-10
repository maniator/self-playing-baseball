/**
 * E2E tests for the Team Summary and per-player role-aware Career tabs
 * on the Career Stats hub (/stats).
 *
 * Split out from career-stats.spec.ts so that team-aggregate tests
 * (W/L record, run scoring, leader cards) and player career tab
 * visibility tests live alongside the data they verify.
 *
 * Fixture: team-summary-history.json
 *   - 3 games: W/L/W → streak=W1, record=2-1, RS=16, RA=10, DIFF=+6
 *   - Batting:  J.Qualify (22 AB, qualifies), P.NoQualify (4 AB, does not qualify)
 *   - Pitching: A.Starter (36 outs, qualifies), R.Reliever (3 outs, does not qualify)
 */

import { expect, type Page, test } from "@playwright/test";

import {
  EFFECTIVELY_PAUSED_SPEED,
  importHistoryFixture,
  startGameViaPlayBall,
} from "../utils/helpers";

// ── Team Summary + Leaders ────────────────────────────────────────────────────

test.describe("Team Summary and Leaders", () => {
  /**
   * Seeds the team-summary-history fixture and opens /stats with e2e_summary_team selected.
   * The fixture has 3 games: W/L/W → streak=W1, W/L=2-1, RS=16, RA=10, DIFF=+6.
   * Batting: J.Qualify (22 AB, qualifies), P.NoQualify (4 AB, does not qualify).
   * Pitching: A.Starter (36 outs, qualifies), R.Reliever (3 outs, does not qualify).
   */
  async function seedSummaryAndOpen(page: Page) {
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    await startGameViaPlayBall(page);
    await importHistoryFixture(page, "team-summary-history.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 5_000 });
    await teamSelect.selectOption("e2e_summary_team");
    // Wait for the W-L record that is unique to the e2e_summary_team fixture
    // (2 wins, 1 loss → "2-1") rather than just waiting for team-summary-section.
    //
    // team-summary-section renders for ANY selected team — even a custom team
    // imported by startGameViaPlayBall that has zero history (getTeamCareerSummary
    // always returns a non-null object, making the condition truthy immediately).
    // The auto-select picks the first custom team from fixture-teams.json, so the
    // old guard resolved instantly against the wrong team's empty summary section.
    // The test then found saves-leader-card absent while e2e_summary_team was still
    // loading — causing the flaky "[tablet]/[iphone-15-pro-max] saves leader card"
    // failures.
    //
    // summary-wl is inside team-summary-section and is set in the SAME React batch
    // as savesLeader (both come from the single loadStats async function), so when
    // summary-wl shows "2-1", saves-leader-card is also rendered.  Using a specific
    // text check makes this guard immune to the early-resolution race condition.
    await expect(page.getByTestId("summary-wl")).toHaveText("2-1", { timeout: 30_000 });
  }

  test("team summary section shows W/L record", async ({ page }) => {
    await seedSummaryAndOpen(page);
    // W/L = 2-1
    await expect(page.getByTestId("summary-wl")).toHaveText("2-1", { timeout: 10_000 });
  });

  test("team summary section shows correct RS and RA", async ({ page }) => {
    await seedSummaryAndOpen(page);
    // RS=16 (7+3+6), RA=10 (3+5+2)
    await expect(page.getByTestId("summary-rs")).toHaveText("16", { timeout: 10_000 });
    await expect(page.getByTestId("summary-ra")).toHaveText("10", { timeout: 5_000 });
  });

  test("team summary section shows correct run differential", async ({ page }) => {
    await seedSummaryAndOpen(page);
    // DIFF = +6
    await expect(page.getByTestId("summary-diff")).toHaveText("+6", { timeout: 10_000 });
  });

  test("team summary section shows current streak", async ({ page }) => {
    await seedSummaryAndOpen(page);
    // Last game is a win → streak = W1
    await expect(page.getByTestId("summary-streak")).toHaveText("W1", { timeout: 10_000 });
  });

  test("team summary section shows last-10 record", async ({ page }) => {
    await seedSummaryAndOpen(page);
    // 3 games total, 2 wins 1 loss
    await expect(page.getByTestId("summary-last10")).toHaveText("2-1", { timeout: 10_000 });
  });

  test("HR leader card shows J. Qualify with 1 HR", async ({ page }) => {
    await seedSummaryAndOpen(page);
    const hrCard = page.getByTestId("hr-leader-card");
    await expect(hrCard).toBeVisible({ timeout: 10_000 });
    await expect(hrCard).toContainText("J. Qualify");
    await expect(hrCard).toContainText("1");
  });

  test("AVG leader card shows J. Qualify (qualifies with 22 AB)", async ({ page }) => {
    await seedSummaryAndOpen(page);
    const avgCard = page.getByTestId("avg-leader-card");
    await expect(avgCard).toBeVisible({ timeout: 10_000 });
    await expect(avgCard).toContainText("J. Qualify");
    // P. NoQualify (4 AB) should not appear — they don't meet the threshold
    await expect(avgCard).not.toContainText("P. NoQualify");
  });

  test("ERA leader shows A. Starter (qualifies with 36 outs)", async ({ page }) => {
    await seedSummaryAndOpen(page);
    const eraCard = page.getByTestId("era-leader-card");
    await expect(eraCard).toBeVisible({ timeout: 10_000 });
    await expect(eraCard).toContainText("A. Starter");
    // R. Reliever (3 outs) should not appear — doesn't meet the threshold
    await expect(eraCard).not.toContainText("R. Reliever");
  });

  test("saves leader card shows R. Reliever with 1 save", async ({ page }) => {
    await seedSummaryAndOpen(page);
    const svCard = page.getByTestId("saves-leader-card");
    await expect(svCard).toBeVisible({ timeout: 10_000 });
    await expect(svCard).toContainText("R. Reliever");
    await expect(svCard).toContainText("1");
  });

  test("clicking HR leader card navigates to the player's career page", async ({ page }) => {
    await seedSummaryAndOpen(page);
    const hrCard = page.getByTestId("hr-leader-card");
    await expect(hrCard).toBeVisible({ timeout: 10_000 });
    await hrCard.click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain("/players/e2e_batter_qualify");
    expect(page.url()).toContain("team=e2e_summary_team");
  });
});

// ── Role-aware Player Career tabs ─────────────────────────────────────────────

test.describe("Role-aware Player Career tabs", () => {
  async function seedForRoleAware(page: Page) {
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    await startGameViaPlayBall(page);
    await importHistoryFixture(page, "team-summary-history.json");
  }

  test("batter-only player (no pitching history) does NOT show Pitching tab", async ({ page }) => {
    await seedForRoleAware(page);
    await page.goto("/players/e2e_batter_qualify");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Wait for player name (only rendered after loading completes) to avoid checking
    // not.toBeVisible() while loading=true shows both tabs as placeholders.
    await expect(page.getByText("J. Qualify")).toBeVisible({ timeout: 10_000 });
    // Pitching tab must NOT be shown for a batter-only player
    await expect(page.getByRole("button", { name: /^pitching$/i })).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("pitcher-only player (no batting history) does NOT show Batting tab", async ({ page }) => {
    await seedForRoleAware(page);
    await page.goto("/players/e2e_pitcher_starter");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Wait for player name (only rendered after loading completes) to avoid checking
    // not.toBeVisible() while loading=true shows both tabs as placeholders.
    await expect(page.getByText("A. Starter")).toBeVisible({ timeout: 10_000 });
    // Batting tab must NOT be shown for a pitcher-only player
    await expect(page.getByRole("button", { name: /^batting$/i })).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("player with no history shows both tabs (empty state)", async ({ page }) => {
    await seedForRoleAware(page);
    await page.goto("/players/e2e_unknown_player");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Both tabs present in the empty state
    await expect(page.getByRole("button", { name: /^batting$/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /^pitching$/i })).toBeVisible({ timeout: 5_000 });
  });
});
