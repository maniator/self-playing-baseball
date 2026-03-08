/**
 * Simulation metrics baseline capture.
 *
 * Runs 100+ full games via the browser using Instant speed mode (SPEED_INSTANT=0)
 * and collects aggregate statistics for the pre-tuning baseline.
 *
 * Intended to run on desktop Chromium only.  Excluded from the normal CI suite
 * because it is intentionally slow (~5–10 min); invoke manually or via the
 * `e2e-test-runner` agent when a before/after metrics capture is needed.
 *
 * How to run:
 *   yarn test:e2e --project=desktop --grep "metrics-baseline"
 *
 * Manager mode: disabled for all runs so games are fully unmanaged and Instant
 * mode never blocks on a human decision.
 */
import { expect, test } from "@playwright/test";

import { importTeamsFixture, resetAppState, waitForNewGameDialog } from "../utils/helpers";

/** Seeds used for the metrics run — 100 deterministic seeds. */
const SEEDS = Array.from({ length: 100 }, (_, i) => `metrics-seed-${i + 1}`);

/** Number of games to run in this batch. */
const NUM_GAMES = 100;

/**
 * Waits for the FINAL banner to appear, polling up to `timeoutMs`.
 * Throws a descriptive error if the game stalls (no new log lines for 10 s).
 */
async function waitForFinal(
  page: import("@playwright/test").Page,
  timeoutMs = 60_000,
): Promise<void> {
  let lastLogCount = 0;
  let lastLogChangeTime = Date.now();

  await expect(async () => {
    if (await page.getByText("FINAL").isVisible()) return;

    const currentCount = await page.locator("[data-log-index]").count();
    if (currentCount > lastLogCount) {
      lastLogCount = currentCount;
      lastLogChangeTime = Date.now();
    }
    const stalledMs = Date.now() - lastLogChangeTime;
    if (stalledMs > 10_000) {
      const scoreboardText = await page
        .getByTestId("scoreboard")
        .textContent()
        .catch(() => "?");
      throw new Error(
        `game stalled: no new log lines for ${stalledMs}ms ` +
          `(count=${currentCount}; scoreboard="${scoreboardText?.trim()}")`,
      );
    }
    throw new Error("FINAL not yet visible");
  }).toPass({ timeout: timeoutMs, intervals: [100, 200, 500] });
}

/**
 * Extracts per-game stats from the visible play-by-play log DOM.
 *
 * Parses log-line text content for recognizable phrases:
 *  - Walk:      "ball four" or "take your base"
 *  - Strikeout: "strike three"
 *  - Single:    "singles" or "infield single"
 *  - Double:    "doubles"
 *  - Triple:    "triples"
 *  - Home run:  "home run" or "homer"
 *  - Score:     from the scoreboard element
 */
async function extractGameStats(page: import("@playwright/test").Page): Promise<{
  walks: number;
  strikeouts: number;
  hits: number;
  homeRuns: number;
  awayScore: number;
  homeScore: number;
}> {
  // Read all visible play-by-play log lines.
  const logLines = await page.locator("[data-log-index]").allTextContents();

  let walks = 0;
  let strikeouts = 0;
  let hits = 0;
  let homeRuns = 0;

  for (const line of logLines) {
    const lower = line.toLowerCase();
    if (lower.includes("ball four") || lower.includes("take your base")) {
      walks++;
    } else if (lower.includes("strike three")) {
      strikeouts++;
    }
    if (lower.includes("home run") || lower.includes("homer")) {
      homeRuns++;
      hits++;
    } else if (
      lower.includes(" singles") ||
      lower.includes("infield single") ||
      lower.includes(" doubles") ||
      lower.includes(" triples")
    ) {
      hits++;
    }
  }

  // Extract final score from the scoreboard.
  // The scoreboard typically shows "Away  X  —  Y  Home" or similar.
  const scoreboardText = await page
    .getByTestId("scoreboard")
    .textContent()
    .catch(() => "");
  const scoreMatches = (scoreboardText ?? "").match(/\d+/g);
  const awayScore = scoreMatches ? parseInt(scoreMatches[0] ?? "0", 10) : 0;
  const homeScore = scoreMatches ? parseInt(scoreMatches[1] ?? "0", 10) : 0;

  return { walks, strikeouts, hits, homeRuns, awayScore, homeScore };
}

test.describe("Metrics baseline — 100 games via Instant mode (desktop only)", () => {
  test.setTimeout(15 * 60 * 1000); // 15 minutes for 100 games

  test(
    "collect pre-tuning aggregate metrics across 100 seeded Instant-mode games",
    async ({ page }, testInfo) => {
      // Desktop Chromium only — other projects would multiply CI time.
      test.skip(testInfo.project.name !== "desktop", "Metrics baseline: desktop only");

      // ── One-time setup ─────────────────────────────────────────────────────
      // Configure localStorage before the app mounts so Instant mode and
      // muted announcements are active from the very first navigation.
      await page.addInitScript(() => {
        localStorage.setItem("speed", "0"); // SPEED_INSTANT = 0
        localStorage.setItem("announcementVolume", "0"); // mute TTS
        localStorage.setItem("alertVolume", "0"); // mute alert sounds
        localStorage.setItem("_e2eNoInningPause", "1"); // skip half-inning pause
        localStorage.setItem("managerMode", "false"); // fully unmanaged
      });

      await resetAppState(page);
      await importTeamsFixture(page, "fixture-teams.json");

      // ── Per-game loop ───────────────────────────────────────────────────────
      let totalWalks = 0;
      let totalK = 0;
      let totalHits = 0;
      let totalHR = 0;
      let totalRuns = 0;
      let gamesCompleted = 0;
      const perGameRuns: number[] = [];

      for (let i = 0; i < NUM_GAMES; i++) {
        const seed = SEEDS[i];

        // Navigate to the new-game dialog.
        await page.goto("/exhibition/new");
        await waitForNewGameDialog(page);

        // Set the seed and speed (speed should already be set in localStorage but re-confirm).
        const seedField = page.getByTestId("seed-input");
        await seedField.clear();
        await seedField.fill(seed);

        // Confirm Instant speed is selected (already in localStorage from addInitScript).
        // The speed dropdown should reflect localStorage value on mount.
        await expect(page.getByTestId("speed-select")).toHaveValue("0");

        // Click Play Ball!
        await page.getByTestId("play-ball-button").click();
        await expect(
          page.getByTestId("exhibition-setup-page").or(page.getByTestId("new-game-dialog")),
        ).not.toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });

        // Expand the play-by-play log.
        const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
        if (await logToggle.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await logToggle.click();
        }

        // Wait for the game to reach FINAL.
        await waitForFinal(page, 60_000);

        // Collect stats from the visible play-by-play log.
        const stats = await extractGameStats(page);
        totalWalks += stats.walks;
        totalK += stats.strikeouts;
        totalHits += stats.hits;
        totalHR += stats.homeRuns;
        const runs = stats.awayScore + stats.homeScore;
        totalRuns += runs;
        perGameRuns.push(runs);
        gamesCompleted++;

        // Log progress every 10 games.
        if ((i + 1) % 10 === 0) {
          console.log(
            `  [${i + 1}/${NUM_GAMES}] seed=${seed} runs=${runs} ` +
              `(cumulative BB=${totalWalks}, K=${totalK})`,
          );
        }
      }

      // ── Aggregate reporting ─────────────────────────────────────────────────
      // Plate appearances: approximate as (walks + K + hits + outs)
      // We only have exact counts for walks, K, and hits. Use runs as a proxy check.
      // For MLB, ~38% of PA end in non-K out, so: PA ≈ (walks + K + hits) / 0.62
      const knownOutcomes = totalWalks + totalK + totalHits;
      // Approximate total PA using the share we can count.
      // This is an undercount since many outs (groundouts, flyouts, etc.) don't appear
      // as separate recognizable log lines in the play-by-play.
      const approxPA = Math.round(knownOutcomes / 0.62);

      const bbPct = approxPA > 0 ? ((totalWalks / approxPA) * 100).toFixed(1) : "N/A";
      const kPct = approxPA > 0 ? ((totalK / approxPA) * 100).toFixed(1) : "N/A";
      const hitPct = approxPA > 0 ? ((totalHits / approxPA) * 100).toFixed(1) : "N/A";
      const hrPct = approxPA > 0 ? ((totalHR / approxPA) * 100).toFixed(1) : "N/A";
      const runsPerGame = (totalRuns / gamesCompleted).toFixed(1);

      const sortedRuns = [...perGameRuns].sort((a, b) => a - b);
      const medianRuns = sortedRuns[Math.floor(sortedRuns.length / 2)];

      console.log("\n");
      console.log("╔══════════════════════════════════════════════════════╗");
      console.log("║  BROWSER-DRIVEN METRICS BASELINE (PRE-TUNING)        ║");
      console.log("╠══════════════════════════════════════════════════════╣");
      console.log(`║  Games completed:   ${String(gamesCompleted).padEnd(33)}║`);
      console.log(`║  Seeds:             metrics-seed-1 to -${NUM_GAMES}           ║`);
      console.log(`║  Speed mode:        Instant (SPEED_INSTANT = 0)      ║`);
      console.log(`║  Manager mode:      Off (fully unmanaged)             ║`);
      console.log("╠══════════════════════════════════════════════════════╣");
      console.log(`║  BB%:               ${bbPct}%${" ".repeat(Math.max(0, 35 - String(bbPct).length - 1))}║`);
      console.log(`║  K%:                ${kPct}%${" ".repeat(Math.max(0, 35 - String(kPct).length - 1))}║`);
      console.log(`║  H%:                ${hitPct}%${" ".repeat(Math.max(0, 35 - String(hitPct).length - 1))}║`);
      console.log(`║  HR%:               ${hrPct}%${" ".repeat(Math.max(0, 35 - String(hrPct).length - 1))}║`);
      console.log(`║  Runs/game (mean):  ${runsPerGame}${" ".repeat(Math.max(0, 35 - String(runsPerGame).length))}║`);
      console.log(`║  Runs/game (median):${medianRuns}${" ".repeat(Math.max(0, 35 - String(medianRuns).length))}║`);
      console.log(`║  Total walks:       ${totalWalks}${" ".repeat(Math.max(0, 35 - String(totalWalks).length))}║`);
      console.log(`║  Total Ks:          ${totalK}${" ".repeat(Math.max(0, 35 - String(totalK).length))}║`);
      console.log(`║  Total hits:        ${totalHits}${" ".repeat(Math.max(0, 35 - String(totalHits).length))}║`);
      console.log("╚══════════════════════════════════════════════════════╝");
      console.log("\n");

      // Sanity assertions — intentionally wide so they pass in any simulation state.
      // These will be tightened once tuning is applied and post-tuning results are captured.
      expect(gamesCompleted, "should have completed all games").toBe(NUM_GAMES);
      expect(totalWalks, "should have recorded some walks").toBeGreaterThan(0);
      expect(totalK, "should have recorded some strikeouts").toBeGreaterThan(0);
      expect(Number(runsPerGame), "runs/game sanity check").toBeGreaterThan(0);
    },
  );
});
