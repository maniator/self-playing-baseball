import { expect, type Page, test } from "@playwright/test";

import {
  disableAnimations,
  EFFECTIVELY_PAUSED_SPEED,
  importHistoryFixture,
  loadFixture,
  resetAppState,
} from "../../utils/helpers";

/**
 * Visual regression snapshots for the Career Stats hub.
 *
 * Two groups:
 *  1. Empty states — fresh install, no history.
 *  2. Seeded data — imports `career-stats-history.json` fixture so tables
 *     render with real rows (batting, pitching ERA/WHIP/SV/HLD, player career).
 *
 * Run across all 6 non-determinism viewport projects (desktop, tablet,
 * iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 *
 * Baselines must be regenerated inside the CI Docker container
 * (mcr.microsoft.com/playwright:v1.58.2-noble) — never run
 * `yarn test:e2e:update-snapshots` locally.
 */

// ── Empty states ────────────────────────────────────────────────────────────

test.describe("Visual — empty states", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Career Stats page — no teams empty state", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot("career-stats-empty.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Player Career page — empty state", async ({ page }) => {
    await page.goto("/players/smoke_test_player");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ── Seeded data ─────────────────────────────────────────────────────────────

test.describe("Visual — seeded history data", () => {
  /**
   * Seed the DB (via SavesModal import) and navigate to /stats, selecting
   * the e2e_home_team in the dropdown.
   */
  async function seedAndOpen(page: Page) {
    // Pre-seed an effectively-paused autoplay speed (9999999 ms/pitch) so the
    // game never auto-advances during the importHistoryFixture flow. Without
    // this, rapid re-renders on mobile WebKit detach the saves-button and the
    // saves-modal-close-button from the DOM, causing flaky 90-second timeouts.
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    // Use loadFixture (loads a pre-built save snapshot) instead of startGameViaPlayBall
    // to avoid the Play Ball → /game navigation timing-out on slow mobile webkit in CI.
    await loadFixture(page, "sample-save.json");
    await disableAnimations(page);
    await importHistoryFixture(page, "career-stats-history.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 5_000 });
    // Wait for the e2e_home_team option to be in the DOM before selecting — the
    // one-shot loadTeamIds effect may still be in-flight when the page mounts on
    // slow mobile WebKit, so the option might not exist yet at selectOption time.
    await expect(teamSelect.locator('option[value="e2e_home_team"]')).toBeAttached({
      timeout: 15_000,
    });
    await teamSelect.selectOption("e2e_home_team");
    // Wait for J. Slugger (a batter specific to e2e_home_team) rather than
    // team-summary-section, which can appear for ANY team (including the
    // auto-selected sample-save team) and would resolve immediately for the wrong
    // team, causing the subsequent 5 s batting-tab check to time out.
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  test("Career Stats page — batting tab with real rows", async ({ page }) => {
    await seedAndOpen(page);
    await page.getByTestId("career-stats-batting-tab").click();
    // Use exact role to target the table-row PlayerLink, not the HR/RBI leader cards.
    await expect(page.getByRole("button", { name: "J. Slugger", exact: true })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-batting-data.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Career Stats page — pitching tab with ERA/WHIP/SV/HLD columns", async ({ page }) => {
    await seedAndOpen(page);
    await page.getByTestId("career-stats-pitching-tab").click();
    // A. Ace is both the K leader card and in the pitching table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "A. Ace", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-pitching-data.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Player Career page — batting log for seeded player", async ({ page }) => {
    await seedAndOpen(page);
    // Navigate to the seeded batter's player career page.
    await page.goto("/players/e2e_batter_slugger");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Use a generous timeout for Career Totals on slower mobile WebKit viewports.
    await expect(page.getByText("Career Totals")).toBeVisible({ timeout: 10_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-batting-data.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Player Career page — pitching log for C. Closer (SV=1)", async ({ page }) => {
    await seedAndOpen(page);
    await page.goto("/players/e2e_pitcher_closer");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Switch to the Pitching tab.
    await page.getByText("Pitching").click();
    // Use a generous timeout for Career Totals on slower mobile WebKit viewports.
    await expect(page.getByText("Career Totals")).toBeVisible({ timeout: 10_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-pitching-data.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ── Team Summary + Leaders ───────────────────────────────────────────────────

test.describe("Visual — Team Summary and Leaders", () => {
  async function seedSummaryAndOpen(page: Page) {
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    await loadFixture(page, "sample-save.json");
    await importHistoryFixture(page, "team-summary-history.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 5_000 });
    await expect(teamSelect.locator('option[value="e2e_summary_team"]')).toBeAttached({
      timeout: 15_000,
    });
    await teamSelect.selectOption("e2e_summary_team");
    // Use a data-specific guard (W/L = "2-1") instead of team-summary-section,
    // which renders for any team and can resolve immediately for the wrong team.
    // Use a generous 45 s timeout: on slow CI desktop runners the RxDB query
    // that aggregates the three imported games can take longer than 30 s.
    await expect(page.getByTestId("summary-wl")).toHaveText("2-1", { timeout: 45_000 });
    await disableAnimations(page);
  }

  test("Career Stats — Team Summary + leaders batting tab", async ({ page }) => {
    await seedSummaryAndOpen(page);
    await page.getByTestId("career-stats-batting-tab").click();
    // J. Qualify is in all three batting leader cards AND the batting table; use exact role to target table row.
    await expect(page.getByRole("button", { name: "J. Qualify", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-team-summary-batting.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Career Stats — Team Summary + leaders pitching tab", async ({ page }) => {
    await seedSummaryAndOpen(page);
    await page.getByTestId("career-stats-pitching-tab").click();
    // A. Starter appears in both ERA and K leader cards AND the pitching table.
    // Use exact role to target the table-row PlayerLink button only.
    await expect(page.getByRole("button", { name: "A. Starter", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-team-summary-pitching.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ── Role-aware Player Career tab snapshots ───────────────────────────────────

test.describe("Visual — Role-aware Player Career tabs", () => {
  async function seedForRoleAware(page: Page) {
    await page.addInitScript(() => {
      localStorage.setItem("speed", EFFECTIVELY_PAUSED_SPEED);
    });
    await loadFixture(page, "sample-save.json");
    await disableAnimations(page);
    await importHistoryFixture(page, "team-summary-history.json");
  }

  test("Player Career page — batter-only (no Pitching tab)", async ({ page }) => {
    await seedForRoleAware(page);
    await page.goto("/players/e2e_batter_qualify");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("J. Qualify")).toBeVisible({ timeout: 10_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-batter-only.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Player Career page — pitcher-only (no Batting tab)", async ({ page }) => {
    await seedForRoleAware(page);
    await page.goto("/players/e2e_pitcher_starter");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("A. Starter")).toBeVisible({ timeout: 10_000 });
    await disableAnimations(page);
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-pitcher-only.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
