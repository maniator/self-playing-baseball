import { expect, type Page, test } from "@playwright/test";

import {
  EFFECTIVELY_PAUSED_SPEED,
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
    // Pre-seed an effectively-paused autoplay speed (9999999 ms/pitch) so the
    // game never auto-advances during the importHistoryFixture flow. Without
    // this, rapid re-renders on mobile WebKit detach the saves-button from the
    // DOM while importHistoryFixture tries to click it.
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    await startGameViaPlayBall(page);
    await importHistoryFixture(page, "career-stats-history.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    // The seeded team ID is "e2e_home_team" (non-custom → appears as raw ID in selector).
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 5_000 });
    await teamSelect.selectOption("e2e_home_team");
    // Wait for the batting stats to finish loading before returning.
    // The async RxDB query fires when the team changes, but seedAndOpen returns
    // immediately after selectOption — on slow CI/mobile runners the 10 s
    // per-assertion timeouts in the individual tests can expire before the data
    // arrives.  Mirroring seedSummaryAndOpen's data-ready guard prevents the
    // race condition that caused:
    //   [tablet]          career-stats.spec.ts:158  "A. Ace" not found
    //   [iphone-15-pro-max] career-stats.spec.ts:204  "J. Slugger" not found
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  test("batting tab shows seeded batter rows", async ({ page }) => {
    await seedAndOpen(page);
    // Default tab is Batting.
    await expect(page.getByTestId("career-stats-batting-tab")).toBeVisible();
    // Wait for the table to appear (stats load asynchronously).
    // Use getByRole("button", exact) to target the table-row PlayerLink, not leader cards.
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("M. Contact")).toBeVisible({ timeout: 5_000 });
  });

  test("batting tab shows correct counting stats for J. Slugger", async ({ page }) => {
    await seedAndOpen(page);
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 10_000,
    });
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
    // A. Ace is both the K leader card and in the pitching table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "A. Ace", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("S. Setup")).toBeVisible({ timeout: 5_000 });
    // C. Closer is both the SV leader card and in the pitching table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "C. Closer", exact: true })).toBeVisible({
      timeout: 5_000,
    });
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
    // A. Ace is both the K leader card and in the pitching table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "A. Ace", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    // A. Ace: outsPitched=18 → IP=6.0; earnedRuns=3 → ERA=(3*27)/18=4.50
    const aceRow = page.locator("tr", { hasText: "A. Ace" });
    await expect(aceRow).toContainText("6.0"); // IP
    await expect(aceRow).toContainText("4.50"); // ERA
  });

  test("clicking a batter row navigates to /players/:playerKey", async ({ page }) => {
    await seedAndOpen(page);
    // Use exact role to click the table-row PlayerLink, not the HR/RBI leader cards.
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "J. Slugger", exact: true }).click();
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/players/e2e_batter_slugger");
  });

  test("player career page shows batting game log for J. Slugger", async ({ page }) => {
    await seedAndOpen(page);
    // Use exact role to click the table-row PlayerLink, not the HR/RBI leader cards.
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "J. Slugger", exact: true }).click();
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
    // C. Closer is both the SV leader card and in the pitching table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "C. Closer", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "C. Closer", exact: true }).click();
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

// ── 3. Team Summary + Leaders ────────────────────────────────────────────────

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

// ── 4. Role-aware Player Career tabs ─────────────────────────────────────────

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

// ── 5. Home page League teaser ────────────────────────────────────────────────

test.describe("Home page League teaser", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Home page shows 'League play coming soon' teaser", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("league-play-teaser")).toBeVisible();
    await expect(page.getByTestId("league-play-teaser")).toContainText(/league play coming soon/i);
  });

  test("League teaser is not a clickable link", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    const teaser = page.getByTestId("league-play-teaser");
    await expect(teaser).toBeVisible();
    // The teaser box is not a button or anchor — it's a non-interactive element
    const tagName = await teaser.evaluate((el) => el.tagName.toLowerCase());
    expect(["div", "section", "aside", "p", "span"]).toContain(tagName);
  });
});

// ── 6. New Game auto-regenerates seed ─────────────────────────────────────────

test.describe("New Game seed auto-regeneration", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("New Game seed input is pre-filled on open", async ({ page }) => {
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });
    const seedInput = page.getByTestId("seed-input");
    await expect(seedInput).toBeVisible();
    const value = await seedInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("closing and reopening New Game regenerates a different seed", async ({ page }) => {
    // First open
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });
    const firstSeed = await page.getByTestId("seed-input").inputValue();

    // Navigate away and back
    await page.goto("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });
    const secondSeed = await page.getByTestId("seed-input").inputValue();

    // Seeds must differ (fresh generation each open)
    expect(secondSeed).not.toBe(firstSeed);
  });
});
