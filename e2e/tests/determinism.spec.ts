import { expect, test } from "@playwright/test";

import { captureGameSignature, configureNewGame, waitForLogLines } from "../utils/helpers";

const FIXED_SEED = "deadbeef";
const GAME_CONFIG = {
  seed: FIXED_SEED,
  homeTeam: "New York Yankees",
  awayTeam: "New York Mets",
};

/**
 * Runs a full game-start sequence in a fresh isolated browser context and
 * returns a signature after N log lines.  The context is closed afterwards.
 */
async function runGameInFreshContext(
  browser: Parameters<Parameters<typeof test>[1]>[0]["browser"],
  seed: string,
  config: { homeTeam?: string; awayTeam?: string } = {},
): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    // Navigate with seed in URL so initSeedFromUrl picks it up on first load.
    await page.goto(`/?seed=${seed}`);
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await configureNewGame(page, { ...config, seed });
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    await waitForLogLines(page, 20);
    return captureGameSignature(page);
  } finally {
    await context.close();
  }
}

test.describe("Determinism", () => {
  test("same seed produces same play-by-play sequence", async ({ browser }) => {
    // Each call creates a fresh isolated context (own IndexedDB, own RNG init).
    const sig1 = await runGameInFreshContext(browser, FIXED_SEED, GAME_CONFIG);
    const sig2 = await runGameInFreshContext(browser, FIXED_SEED, GAME_CONFIG);

    expect(sig1).toBeTruthy();
    expect(sig1).toEqual(sig2);
  });

  test("different seeds produce different sequences", async ({ browser }) => {
    const sig1 = await runGameInFreshContext(browser, "seed1", GAME_CONFIG);
    const sig2 = await runGameInFreshContext(browser, "seed2", GAME_CONFIG);

    // Different seeds should produce different outputs
    expect(sig1).not.toEqual(sig2);
  });
});
