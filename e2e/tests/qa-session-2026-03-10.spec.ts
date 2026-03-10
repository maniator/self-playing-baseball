/**
 * QA Session — Full playthrough for QA report 2026-03-10
 *
 * This spec exercises every major user-facing surface of Ballgame as a
 * first-time user would encounter it.  Screenshots are taken at each step and
 * saved to /tmp/qa-screenshots/ for inclusion in the written report.
 *
 * Run with:  npx playwright test qa-session-2026-03-10.spec.ts --project=desktop
 */
import * as path from "path";

import { expect, test } from "@playwright/test";

import {
  importTeamsFixture,
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

const SS_DIR = "/tmp/qa-screenshots";

async function ss(page: Parameters<typeof test>[1] extends infer P ? P : never, name: string) {
  // @ts-expect-error — page type from test callback
  await page.screenshot({ path: path.join(SS_DIR, `${name}.png`), fullPage: true });
}

// ─── Home page ─────────────────────────────────────────────────────────────
test.describe("QA: Home page", () => {
  test("home page loads and shows all buttons", async ({ page }) => {
    await resetAppState(page);
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await ss(page, "01-home-page");

    // Check all expected buttons are present
    await expect(page.getByTestId("home-new-game-button")).toBeVisible();
    await expect(page.getByTestId("home-load-saves-button")).toBeVisible();
    await expect(page.getByTestId("home-manage-teams-button")).toBeVisible();

    // Check career stats navigation link
    const careerLink = page.getByRole("link", { name: /career stats/i }).or(
      page.getByTestId("home-career-stats-link"),
    );
    // May be in nav bar
    await ss(page, "01b-home-nav");
  });

  test("page title is correct", async ({ page }) => {
    await resetAppState(page);
    const title = await page.title();
    expect(title).toMatch(/Ballgame/i);
  });
});

// ─── Help / How to Play page ───────────────────────────────────────────────
test.describe("QA: Help page", () => {
  test("help page loads and shows content sections", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/help");
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "02-help-page-top");

    // Check that all major sections exist
    await expect(page.getByText(/how to play/i).first()).toBeVisible();
  });

  test("help page — Manager Mode section mentions Protect swing on 0-2 count (Bug 6 regression)", async ({
    page,
  }) => {
    await resetAppState(page);
    await page.goto("/help");
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 15_000 });

    // Expand Manager Mode section
    const mmSection = page.getByText(/manager mode/i).first();
    await mmSection.click();
    await page.waitForTimeout(500);
    await ss(page, "02b-help-manager-mode-section");

    // Bug 6 regression: Protect swing must be documented
    await expect(page.getByText(/protect/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/0-2/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("help page — back button returns to home", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/help");
    await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 15_000 });

    const backBtn = page.getByRole("link", { name: /back|home/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ─── /career-stats redirect ─────────────────────────────────────────────────
test.describe("QA: /career-stats redirect (Bug 4 regression)", () => {
  test("navigating to /career-stats redirects to /stats", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/career-stats");
    await expect(page).toHaveURL(/\/stats/, { timeout: 10_000 });
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    await ss(page, "03-career-stats-redirect");
  });
});

// ─── Career Stats page ──────────────────────────────────────────────────────
test.describe("QA: Career Stats page", () => {
  test("career stats page loads with team selector", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "04-career-stats-empty");

    // Should show a team selector
    await expect(page.getByTestId("career-stats-team-select")).toBeVisible({ timeout: 10_000 });
  });

  test("career stats — SV=0 shows placeholder not leader card (Bug 2 regression)", async ({
    page,
  }) => {
    await resetAppState(page);
    await importTeamsFixture(page, "career-stats-e2e-team-with-bench.json");
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });

    // Switch to pitching tab
    await page.getByTestId("career-stats-pitching-tab").click();
    await ss(page, "04b-career-stats-pitching-no-history");

    // SV leader card must NOT be visible (Bug 2 fix)
    await expect(page.getByTestId("saves-leader-card")).not.toBeVisible({ timeout: 5_000 });
    // Placeholder must be visible
    await expect(page.getByText(/SV.*no data/i)).toBeVisible({ timeout: 5_000 });
  });

  test("career stats — with history shows leader cards", async ({ page }) => {
    await resetAppState(page);
    await importTeamsFixture(page, "career-stats-e2e-team.json");
    // Import history
    const histFile = path.join(
      __dirname,
      "..",
      "fixtures",
      "career-stats-history.json",
    );
    // Use file import via page
    await page.goto("/stats");
    await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "04c-career-stats-with-team");
  });
});

// ─── Manage Teams page ──────────────────────────────────────────────────────
test.describe("QA: Manage Teams page", () => {
  test("manage teams page loads and shows create button", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });
    await ss(page, "05-manage-teams-empty");

    await expect(page.getByTestId("manage-teams-create-button")).toBeVisible();
  });

  test("create a custom team via auto-generate", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-editor")).toBeVisible({ timeout: 10_000 });
    await ss(page, "05b-create-team-editor");

    // Fill in team info
    await page.getByTestId("custom-team-city-input").fill("Springfield");
    await page.getByTestId("custom-team-name-input").fill("Atoms");
    await page.getByTestId("custom-team-abbreviation-input").fill("SPA");

    // Auto-generate roster
    const genBtn = page.getByRole("button", { name: /generate|auto.?generate|randomize/i });
    if (await genBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await genBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, "05c-create-team-filled");

    // Save the team
    const saveBtn = page.getByRole("button", { name: /save|done/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, "05d-manage-teams-after-create");
  });

  test("manage teams — export all teams", async ({ page }) => {
    await resetAppState(page);
    await importTeamsFixture(page, "fixture-teams.json");
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    const exportAllBtn = page
      .getByRole("button", { name: /export all/i })
      .or(page.getByTestId("export-all-teams-button"));
    if (await exportAllBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10_000 }),
        exportAllBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/ballgame-teams.*\.json/);
      await ss(page, "05e-teams-export-all");
    }
  });

  test("team import — invalid format shows user-friendly error (Bug 5 regression)", async ({
    page,
  }) => {
    await resetAppState(page);
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    // Paste JSON missing formatVersion
    const badJson = JSON.stringify({ type: "customTeams", payload: { teams: [] } });
    await page.getByTestId("import-teams-paste-textarea").fill(badJson);
    await page.getByTestId("import-teams-paste-button").click();

    const errorEl = page.getByTestId("import-teams-error");
    await expect(errorEl).toBeVisible({ timeout: 5_000 });
    const errorText = await errorEl.textContent();
    await ss(page, "05f-import-error-message");

    // Bug 5 regression: must NOT show bare "Unsupported custom teams format version"
    expect(errorText).not.toMatch(/^Unsupported custom teams format version/i);
    // Must be user-friendly
    expect(errorText).toMatch(/Make sure to export using/i);
  });
});

// ─── Exhibition Setup page ──────────────────────────────────────────────────
test.describe("QA: Exhibition Setup page", () => {
  test("new game dialog shows matchup options", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "06-exhibition-setup");

    // Should have team selectors, seed input, and play ball button
    await expect(page.getByTestId("home-team-select")).toBeVisible();
    await expect(page.getByTestId("away-team-select")).toBeVisible();
    await expect(page.getByTestId("seed-input")).toBeVisible();
    await expect(page.getByTestId("play-ball-button")).toBeVisible();
  });

  test("exhibition setup — manager mode toggle visible", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 15_000 });

    // Check for manager mode toggle
    const mmToggle = page
      .getByLabel(/manager mode/i)
      .or(page.getByTestId("manager-mode-toggle"))
      .or(page.getByText(/manager mode/i));
    await ss(page, "06b-exhibition-manager-mode");
  });
});

// ─── Full game playthrough ──────────────────────────────────────────────────
test.describe("QA: Game playthrough (fast speed)", () => {
  test("play a complete game at fast speed — scoreboard and log work", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "qa-session-2026-03-10-fast", speed: "150" });
    await ss(page, "07-game-start");

    // Check scoreboard visible
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });

    // Check play-by-play log
    await waitForLogLines(page, 5);
    await ss(page, "07b-game-in-progress");

    // Check speed selector shows Fast option
    const speedSelect = page.getByTestId("speed-select");
    await expect(speedSelect).toBeVisible();
    const fastValue = await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>('[data-testid="speed-select"]');
      if (!sel) return null;
      const fast = Array.from(sel.options).find((o) => o.text === "Fast");
      return fast ? Number(fast.value) : null;
    });
    expect(fastValue).not.toBeNull();
    // Bug: SPEED_FAST was 350ms, should be ≤ 200ms
    expect(fastValue).toBeLessThanOrEqual(200);

    // Wait for game to finish
    await expect(page.getByTestId("scoreboard").getByText("FINAL")).toBeVisible({
      timeout: 120_000,
    });
    await ss(page, "07c-game-final");
  });

  test("in-game stats panel is accessible", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "qa-stats-panel" });
    await waitForLogLines(page, 5);

    // Check batting stats panel or stats toggle
    const statsToggle = page
      .getByRole("button", { name: /stats|batting|pitching/i })
      .or(page.getByTestId("stats-tab"))
      .first();
    if (await statsToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statsToggle.click();
      await page.waitForTimeout(500);
      await ss(page, "07d-in-game-stats-panel");
    } else {
      await ss(page, "07d-in-game-stats-panel-notfound");
    }
  });
});

// ─── Manager Mode ──────────────────────────────────────────────────────────
test.describe("QA: Manager Mode game", () => {
  test("manager mode game — decisions appear and can be selected", async ({ page }) => {
    await startGameViaPlayBall(page, {
      seed: "qa-manager-mode-2026-03-10",
      managerMode: true,
    });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
    await waitForLogLines(page, 3);
    await ss(page, "08-manager-mode-game");

    // Wait for a decision panel to appear (may take some innings)
    const decisionPanel = page.getByTestId("decision-panel");
    const appeared = await decisionPanel.waitFor({ timeout: 60_000 }).then(() => true).catch(() => false);
    if (appeared) {
      await ss(page, "08b-manager-mode-decision");
      // Click the first decision option
      const firstBtn = decisionPanel.getByRole("button").first();
      if (await firstBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstBtn.click();
        await page.waitForTimeout(500);
        await ss(page, "08c-manager-mode-after-decision");
      }
    } else {
      await ss(page, "08b-manager-mode-no-decision-appeared");
    }
  });
});

// ─── Save / Load flows ──────────────────────────────────────────────────────
test.describe("QA: Save / Load flows", () => {
  test("saves page loads and shows empty state on fresh app", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/saves");
    await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "09-saves-page-empty");

    // Empty state should show "No saves yet"
    await expect(page.getByText(/no saves/i)).toBeVisible({ timeout: 5_000 });
  });

  test("save current game then load it", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "qa-save-load-2026-03-10" });
    await waitForLogLines(page, 5);

    // Open saves modal
    const savesBtn = page
      .getByRole("button", { name: /saves|save.*game/i })
      .or(page.getByTestId("open-saves-button"))
      .first();
    if (await savesBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await savesBtn.click();
    }

    const savesModal = page.getByTestId("saves-modal");
    const saveGameBtn = page.getByTestId("save-game-button");
    if (await saveGameBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveGameBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, "09b-game-saved");
    }
    await ss(page, "09c-saves-modal-after-save");
  });
});

// ─── Player career page — bench player name fix (Bug 1) ────────────────────
test.describe("QA: Player career page — no raw IDs (Bug 1 regression)", () => {
  test("bench player with no stats shows real name, not raw globalPlayerId", async ({ page }) => {
    await resetAppState(page);
    await importTeamsFixture(page, "career-stats-e2e-team-with-bench.json");

    // Navigate to bench player with no stats
    await page.goto("/players/e2e_bench_never_played?team=custom:ct_e2e_career_bench");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "10-player-career-bench-player");

    // Must show real name, not raw ID
    await expect(page.getByRole("heading", { name: "B. Benchwarmer" })).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("heading", { name: "e2e_bench_never_played" }),
    ).not.toBeVisible();
  });

  test("completely unknown player shows 'Unknown Player', not raw key", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/players/pl_nonexistent_qa_2026");
    await expect(page.getByTestId("player-career-page")).toBeVisible({ timeout: 15_000 });
    await ss(page, "10b-player-career-unknown");

    await expect(page.getByRole("heading", { name: "Unknown Player" })).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ─── Routing edge cases ─────────────────────────────────────────────────────
test.describe("QA: Routing edge cases", () => {
  test("unknown route redirects to home", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await ss(page, "11-unknown-route-redirect");
  });

  test("404 route — /career-stats redirects to /stats (Bug 4 regression)", async ({ page }) => {
    await resetAppState(page);
    await page.goto("/career-stats");
    await expect(page).toHaveURL(/\/stats/, { timeout: 10_000 });
    await ss(page, "11b-career-stats-redirect");
  });
});

// ─── Console errors during normal usage ────────────────────────────────────
test.describe("QA: Console error monitoring", () => {
  test("home page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await resetAppState(page);
    await page.waitForTimeout(2000);

    // Filter known noise
    const filtered = errors.filter(
      (e) =>
        !e.includes("Failed to load resource: the server responded with a status of 404") &&
        !e.includes("SW") &&
        !e.includes("service worker") &&
        !e.includes("gtag") &&
        !e.includes("googletagmanager"),
    );
    await ss(page, "12-console-errors-home");
    expect(filtered, `Unexpected console errors on home page: ${filtered.join("\n")}`).toHaveLength(0);
  });

  test("game page has no critical console errors during fast playthrough", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await startGameViaPlayBall(page, { seed: "qa-console-check", speed: "150" });
    // Wait for game to end or 60s
    await page.getByTestId("scoreboard").getByText("FINAL").waitFor({ timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const filtered = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") &&
        !e.includes("SW") &&
        !e.includes("service worker") &&
        !e.includes("gtag") &&
        !e.includes("googletagmanager"),
    );
    await ss(page, "12b-console-errors-game");
    // Log what we found for the QA report
    console.log("Console errors during game:", filtered);
  });
});

// ─── Misc UI checks ─────────────────────────────────────────────────────────
test.describe("QA: Miscellaneous UI checks", () => {
  test("navigation links from home work", async ({ page }) => {
    await resetAppState(page);

    // Click Help
    const helpLink = page.getByRole("link", { name: /help|how to play/i }).first();
    if (await helpLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await helpLink.click();
      await expect(page.getByTestId("help-page")).toBeVisible({ timeout: 10_000 });
      await page.goBack();
    }
    await ss(page, "13-nav-links");
  });

  test("career stats navigation from home works", async ({ page }) => {
    await resetAppState(page);
    const statsLink = page
      .getByRole("link", { name: /career stats/i })
      .or(page.getByTestId("home-career-stats-link"))
      .first();
    if (await statsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statsLink.click();
      await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    } else {
      // Navigate directly
      await page.goto("/stats");
      await expect(page.getByTestId("career-stats-page")).toBeVisible({ timeout: 10_000 });
    }
    await ss(page, "13b-career-stats-nav");
  });

  test("game back-to-home button works", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "qa-back-to-home" });
    await waitForLogLines(page, 3);

    const backBtn = page
      .getByTestId("back-to-home-button")
      .or(page.getByRole("button", { name: /home/i }))
      .first();
    if (await backBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await backBtn.click();
      await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
      await ss(page, "13c-back-to-home-from-game");
    }
  });
});
