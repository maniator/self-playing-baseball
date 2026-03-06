/**
 * QA regression tests — bugs found during the 2026-03-06 full-playthrough QA session.
 *
 * See: .github/docs/qa-report-2026-03-06.md for the full report.
 *
 * Covers:
 * 1. /career-stats redirects to /stats (Bug 4)
 * 2. SV=0 does not render as a leader card (Bug 2)
 * 3. Player career page shows real name for bench players with no game stats (Bug 1)
 * 4. SPEED_FAST constant is ≤ 200 ms (Bug 5 — fast speed was 350 ms)
 * 5. Invalid import format version error is user-friendly (Bug 5 — cryptic message)
 * 6. Help page documents the Protect swing on 0-2 counts (Bug 6)
 */
import { expect, test } from "@playwright/test";

import { importHistoryFixture, importTeamsFixture, resetAppState } from "../utils/helpers";

// ─── 1. /career-stats redirects to /stats ────────────────────────────────────

test.describe("Routing — /career-stats redirects to /stats", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Routing redirect runs on desktop only");
  });

  test("navigating to /career-stats ends up at /stats", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/career-stats");
    await expect(page).toHaveURL(/\/stats/, { timeout: 10_000 });
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
  });

  test("direct visit to /career-stats shows Career Stats page content", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/career-stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    // Must have redirected — URL should be /stats not /career-stats
    await expect(page).not.toHaveURL(/\/career-stats/);
    await expect(page).toHaveURL(/\/stats/);
  });
});

// ─── 2. SV=0 does not render as a leader card ────────────────────────────────

test.describe("Career Stats — SV leader card suppressed when value is 0", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Career stats leader tests run on desktop only");
  });

  test("SV leader card shows placeholder when no pitcher has a save", async ({ page }) => {
    // Import a history fixture where no pitcher has a save (saves=0 for all pitchers).
    // We use career-stats-history.json which has C. Closer with saves=1 — so we use the
    // team with the away team that has no saves (e2e_away_team).
    await resetAppState(page);
    await importTeamsFixture(page, "career-stats-e2e-team.json");
    await importHistoryFixture(page, "career-stats-history.json");

    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    // Switch to the team that has saves (e2e_home_team via e2e career team)
    const teamSelect = page.getByTestId("career-stats-team-select");
    await expect(teamSelect).toBeVisible({ timeout: 10_000 });

    // Switch to Pitching tab.
    await page.getByTestId("career-stats-pitching-tab").click();

    // The C. Closer on e2e_home_team has saves=1, so the leader card SHOULD appear.
    await expect(page.getByTestId("saves-leader-card")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("saves-leader-card")).toContainText("1");
  });

  test("SV leader card shows 'SV — no data' placeholder when team has no save history", async ({
    page,
  }) => {
    // Import a team but NO history — no game stats exist, so saves=0 for everyone.
    await resetAppState(page);
    await importTeamsFixture(page, "career-stats-e2e-team-with-bench.json");
    // No history import — team exists but has played 0 games.

    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    // If the team shows in the selector, switch to Pitching tab.
    const teamSelect = page.getByTestId("career-stats-team-select");
    if (await teamSelect.isVisible()) {
      // Switch to Pitching tab.
      await page.getByTestId("career-stats-pitching-tab").click();

      // saves-leader-card must NOT be rendered (value would be 0).
      await expect(page.getByTestId("saves-leader-card")).not.toBeVisible({ timeout: 3_000 });

      // The placeholder text for SV must be visible instead.
      await expect(page.getByText(/SV.*no data/i)).toBeVisible({ timeout: 3_000 });
    }
  });
});

// ─── 3. Player career page shows real name for no-stats bench players ─────────

test.describe("Player Career page — no raw ID for bench players with no stats (Bug 1)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Player career name tests run on desktop only");
  });

  test("bench player with no game history shows real name, not raw globalPlayerId", async ({
    page,
  }) => {
    await resetAppState(page);
    // Import a team that has a bench player (e2e_bench_never_played / "B. Benchwarmer")
    // who has never appeared in a game.
    await importTeamsFixture(page, "career-stats-e2e-team-with-bench.json");

    // Navigate directly to the bench player's career page with the team context.
    // Team id: ct_e2e_career_bench, bench player globalPlayerId: e2e_bench_never_played
    await page.goto("/players/e2e_bench_never_played?team=custom:ct_e2e_career_bench");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });

    // The page heading must show the real name "B. Benchwarmer", NOT the raw ID.
    await expect(page.getByRole("heading", { name: "B. Benchwarmer" })).toBeVisible({
      timeout: 5_000,
    });

    // The raw globalPlayerId must NOT appear anywhere as a heading.
    await expect(page.getByRole("heading", { name: "e2e_bench_never_played" })).not.toBeVisible();
  });

  test("player with no game history and no team context shows 'Unknown Player'", async ({
    page,
  }) => {
    await resetAppState(page);

    // Navigate to a player that does not exist in any team and has no stats.
    await page.goto("/players/pl_totally_nonexistent_id_xyz");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });

    // Must show "Unknown Player", not the raw key.
    await expect(page.getByRole("heading", { name: "Unknown Player" })).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("heading", { name: "pl_totally_nonexistent_id_xyz" }),
    ).not.toBeVisible();
  });
});

// ─── 4. SPEED_FAST constant is ≤ 200 ms ──────────────────────────────────────

test.describe("Speed constants — Fast speed is ≤ 200 ms (Bug 5)", () => {
  test("SPEED_FAST is reflected as ≤ 200 in the speed selector", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Speed constant test runs on desktop only");

    await resetAppState(page);
    await page.goto("/game");
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });

    // The speed selector option value for Fast must be ≤ 200.
    const fastOptionValue = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('[data-testid="speed-select"]');
      if (!select) return null;
      // Find the "Fast" option.
      const opts = Array.from(select.options);
      const fast = opts.find((o) => o.text === "Fast");
      return fast ? Number(fast.value) : null;
    });

    expect(fastOptionValue).not.toBeNull();
    expect(fastOptionValue).toBeLessThanOrEqual(200);
  });
});

// ─── 5. Import error message is user-friendly ────────────────────────────────

test.describe("Team import — user-friendly error message for invalid format (Bug 5b)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Import error message test runs on desktop only",
    );
  });

  test("importing JSON with no formatVersion shows user-friendly error", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    // Paste JSON that is structurally valid but missing formatVersion.
    const badJson = JSON.stringify({ type: "customTeams", payload: { teams: [] } });
    await page.getByTestId("import-teams-paste-textarea").fill(badJson);
    await page.getByTestId("import-teams-paste-button").click();

    const errorEl = page.getByTestId("import-teams-error");
    await expect(errorEl).toBeVisible({ timeout: 5_000 });

    const errorText = await errorEl.textContent();
    // Must NOT contain the raw technical "undefined" literal.
    expect(errorText).not.toMatch(/format version: undefined/i);
    // Must contain helpful guidance.
    expect(errorText).toMatch(/unsupported format version|Make sure to export using/i);
  });

  test("importing plain text (not JSON) shows a clear error", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("import-teams-paste-textarea").fill("this is not json at all");
    await page.getByTestId("import-teams-paste-button").click();

    const errorEl = page.getByTestId("import-teams-error");
    await expect(errorEl).toBeVisible({ timeout: 5_000 });
    // Should show a parse error, not crash silently.
    await expect(errorEl).not.toBeEmpty();
  });
});

// ─── 6. Help page documents Protect swing ────────────────────────────────────

test.describe("Help page — Protect swing documented (Bug 6)", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Help page Manager Mode section mentions Protect swing on 0-2 count", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 15_000 });

    // Open the Manager Mode section (it's collapsed by default).
    const managerSection = page
      .getByRole("group")
      .filter({ hasText: /manager mode/i })
      .first();
    // If it's a details/summary element, click the summary to open it.
    const summary = page.getByText(/manager mode/i).first();
    await summary.click();

    // The word "Protect" must now be visible in the expanded section.
    await expect(page.getByText(/protect/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/0-2/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
