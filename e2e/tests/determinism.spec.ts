import { type Browser, expect, test } from "@playwright/test";

import { captureGameSignature, startGameViaPlayBall } from "../utils/helpers";

const FIXED_SEED = "deadbeef";

/**
 * Runs a full game-start sequence in a fresh isolated browser context and
 * returns a signature once enough log lines have appeared.
 *
 * A fresh context guarantees IndexedDB isolation so the PRNG always starts
 * fresh without being influenced by a prior run's auto-save.
 * The seed is typed into the seed-input field in the New Game dialog —
 * `reinitSeed()` fires on submit and sets the PRNG before the game starts.
 *
 * @param baseURL  The app's base URL (from the `baseURL` test fixture) —
 *                 manually-created contexts do not inherit the project's
 *                 `use.baseURL`, so it must be forwarded explicitly.
 */
async function runGameInFreshContext(
  browser: Browser,
  seed: string,
  baseURL = "http://localhost:5173",
): Promise<string> {
  const context = await browser.newContext({ baseURL });
  // Use fast autoplay speed and suppress inning pauses + announcements so the
  // 5 log lines we need appear in seconds rather than tens of seconds on CI.
  await context.addInitScript(() => {
    localStorage.setItem("speed", "150"); // SPEED_FAST
    localStorage.setItem("_e2eNoInningPause", "1");
    localStorage.setItem("announcementVolume", "0");
  });
  const page = await context.newPage();
  try {
    // startGameViaPlayBall handles: DB loading wait, fixture-team import,
    // exhibition setup navigation, team-select population guards, Play Ball
    // click, and scoreboard visibility — all anti-flake logic lives in one place.
    await startGameViaPlayBall(page, { seed });
    // Wait for 5 lines with a generous 30 s budget — at SPEED_FAST (150 ms/pitch)
    // the first 5 log lines appear within a few seconds on CI runners.
    // We only need 5 lines because captureGameSignature reads
    // data-log-index 0–4 which are stable oldest entries.
    return await captureGameSignature(page, 5, 30_000);
  } finally {
    await context.close();
  }
}

test.describe("Determinism", () => {
  // Each test runs two sequential fresh contexts.  Allow 2 minutes total:
  // at SPEED_FAST each context needs at most ~30 s for 5 log lines plus
  // startup/import overhead, well within this budget.
  test.setTimeout(120_000);

  test("same seed produces same play-by-play sequence", async ({ browser, baseURL }) => {
    const sig1 = await runGameInFreshContext(browser, FIXED_SEED, baseURL ?? undefined);
    const sig2 = await runGameInFreshContext(browser, FIXED_SEED, baseURL ?? undefined);

    expect(sig1).toBeTruthy();
    expect(sig1).toEqual(sig2);
  });

  test("different seeds produce different sequences", async ({ browser, baseURL }) => {
    const sig1 = await runGameInFreshContext(browser, "seed1", baseURL ?? undefined);
    const sig2 = await runGameInFreshContext(browser, "seed2", baseURL ?? undefined);

    expect(sig1).not.toEqual(sig2);
  });
});
