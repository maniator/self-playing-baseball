import { type Browser, expect, test } from "@playwright/test";

import { captureGameSignature, configureNewGame } from "../utils/helpers";

const FIXED_SEED = "deadbeef";
const GAME_CONFIG = {
  seed: FIXED_SEED,
  homeTeam: "New York Yankees",
  awayTeam: "New York Mets",
};

/**
 * Runs a full game-start sequence in a fresh isolated browser context and
 * returns a signature after enough log lines.  The context is closed afterwards.
 * A fresh context guarantees IndexedDB isolation so the PRNG always starts
 * from the same seed without being influenced by a prior run's auto-save.
 */
async function runGameInFreshContext(
  browser: Browser,
  seed: string,
  config: { homeTeam?: string; awayTeam?: string } = {},
): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`/?seed=${seed}`);
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await configureNewGame(page, { ...config, seed });
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // 10 lines is enough for a stable signature and completes within budget on
    // slower browsers (WebKit / mobile emulation).
    return captureGameSignature(page, 10);
  } finally {
    await context.close();
  }
}

test.describe("Determinism", () => {
  // Two sequential fresh-context game runs; give slow browsers plenty of room.
  test.setTimeout(120_000);

  test("same seed produces same play-by-play sequence", async ({ browser }) => {
    const sig1 = await runGameInFreshContext(browser, FIXED_SEED, GAME_CONFIG);
    const sig2 = await runGameInFreshContext(browser, FIXED_SEED, GAME_CONFIG);

    expect(sig1).toBeTruthy();
    expect(sig1).toEqual(sig2);
  });

  test("different seeds produce different sequences", async ({ browser }) => {
    const sig1 = await runGameInFreshContext(browser, "seed1", GAME_CONFIG);
    const sig2 = await runGameInFreshContext(browser, "seed2", GAME_CONFIG);

    expect(sig1).not.toEqual(sig2);
  });
});
