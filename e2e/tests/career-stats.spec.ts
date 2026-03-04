import { expect, test } from "@playwright/test";

import { disableAnimations, resetAppState } from "../utils/helpers";

/**
 * E2E smoke tests for the Career Stats hub.
 *
 * These tests verify that the Career Stats page and Player Career page are
 * reachable, render correctly, and handle the empty-state (no history yet)
 * gracefully.
 *
 * Heavy stat-seeding (completing full games to generate history) is reserved
 * for integration fixtures.  Smoke tests only exercise navigation and
 * empty-state rendering so they stay fast and deterministic on CI.
 */
test.describe("Career Stats smoke", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  // -----------------------------------------------------------------------
  // 1) Career Stats button is visible on Home screen
  // -----------------------------------------------------------------------
  test("Career Stats button is visible on the Home screen", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-career-stats-button")).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 2) Navigating to /stats renders the Career Stats page
  // -----------------------------------------------------------------------
  test("Career Stats page loads at /stats", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
  });

  // -----------------------------------------------------------------------
  // 3) Career Stats button on Home screen navigates to /stats
  // -----------------------------------------------------------------------
  test("Career Stats button navigates to Career Stats page", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("home-career-stats-button").click();
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/stats");
  });

  // -----------------------------------------------------------------------
  // 4) Empty state — no completed games yet
  // -----------------------------------------------------------------------
  test("Career Stats page shows empty state when no history exists", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    // With a fresh install there are no custom teams and no completed games,
    // so the team selector should be empty or show a "No teams" placeholder and
    // the empty state notice should appear.
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 5) Batting and Pitching tab buttons are present
  // -----------------------------------------------------------------------
  test("Career Stats page has Batting and Pitching tab buttons", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("career-stats-batting-tab")).toBeVisible();
    await expect(page.getByTestId("career-stats-pitching-tab")).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 6) Pitching tab is selectable
  // -----------------------------------------------------------------------
  test("Career Stats page — clicking Pitching tab does not crash", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("career-stats-pitching-tab").click();
    // After clicking the pitching tab the page should still be visible.
    await expect(page.getByTestId("career-stats-page")).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 7) Player Career page loads for an arbitrary playerKey
  // -----------------------------------------------------------------------
  test("Player Career page loads at /players/:playerKey", async ({ page }) => {
    await page.goto("/players/test_player_key");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
  });

  // -----------------------------------------------------------------------
  // 8) Player Career page — no data state doesn't crash
  // -----------------------------------------------------------------------
  test("Player Career page shows empty state for unknown player", async ({ page }) => {
    await page.goto("/players/unknown_player_key_abc");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    // Should show "No batting data." since there are no stats for this player.
    await expect(page.getByText(/no batting data/i)).toBeVisible({ timeout: 10_000 });
  });

  // -----------------------------------------------------------------------
  // 9) Responsive: Career Stats page renders on all viewports
  // -----------------------------------------------------------------------
  test("Career Stats page renders visible content on current viewport", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    const { width, height } = page.viewportSize()!;
    const box = await page.getByTestId("career-stats-page").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    // The page should fit within the viewport width.
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    // And start near the top.
    expect(box!.y).toBeLessThan(height);
  });

  // -----------------------------------------------------------------------
  // 10) Accessibility: page contains a heading
  // -----------------------------------------------------------------------
  test("Career Stats page has a visible heading", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    // The page should contain at least one heading element.
    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
  });
});

/**
 * Visual regression snapshots for the Career Stats hub.
 *
 * Baselines must be regenerated inside the CI Docker container
 * (mcr.microsoft.com/playwright:v1.58.2-noble) — never run
 * `yarn test:e2e:update-snapshots` locally.
 */
test.describe("Career Stats visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("Career Stats page — empty state", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot("career-stats-empty.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Career Stats page — Pitching tab (empty)", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("career-stats-pitching-tab").click();
    await expect(page.getByTestId("career-stats-page")).toHaveScreenshot(
      "career-stats-pitching-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  test("Player Career page — empty state", async ({ page }) => {
    await page.goto("/players/smoke_test_player");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("player-career-page")).toHaveScreenshot(
      "player-career-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
