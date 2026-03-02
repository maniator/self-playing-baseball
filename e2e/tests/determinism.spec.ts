import { type Browser, expect, test } from "@playwright/test";

import { captureGameSignature, configureNewGame, importTeamsFixture } from "../utils/helpers";

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
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    // Import fixture teams before starting (required since MLB tab removed).
    await importTeamsFixture(page, "fixture-teams.json");
    await page.goto("/exhibition/new");
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    await configureNewGame(page, { seed });
    await page.getByTestId("play-ball-button").click();
    await expect(
      page.getByTestId("exhibition-setup-page").or(page.getByTestId("new-game-dialog")),
    ).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
    // Wait for 5 lines with a generous 60 s budget — on CI runners autoplay
    // can be slower. We only need 5 lines because captureGameSignature reads
    // data-log-index 0–4 which are stable oldest entries.
    return await captureGameSignature(page, 5, 60_000);
  } finally {
    await context.close();
  }
}

test.describe("Determinism", () => {
  // Each test runs two sequential fresh contexts.  Allow 3 minutes total so
  // even slow CI runners have enough headroom (2 × ~60 s + startup overhead).
  test.setTimeout(200_000);

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
