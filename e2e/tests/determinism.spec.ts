import { expect, test } from "@playwright/test";

import {
  captureGameSignature,
  clickPlayBall,
  FIXED_SEED,
  gotoFreshApp,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Determinism", () => {
  test("same seed produces the same play-by-play sequence on two separate loads", async ({
    page,
  }) => {
    // ── First run ──
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);
    const sig1 = await captureGameSignature(page);

    // ── Second run (same seed, clean state) ──
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);
    const sig2 = await captureGameSignature(page);

    // Both runs must produce identical output
    expect(sig1.logLines).toEqual(sig2.logLines);
    expect(sig1.scores).toEqual(sig2.scores);
  });

  test("different seeds produce different play-by-play sequences", async ({ page }) => {
    await gotoFreshApp(page, "seed1");
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);
    const sig1 = await captureGameSignature(page);

    await gotoFreshApp(page, "seed2");
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 5);
    const sig2 = await captureGameSignature(page);

    // Different seeds should not produce the exact same log lines
    expect(sig1.logLines).not.toEqual(sig2.logLines);
  });

  test("Share seed button copies a URL containing the current seed", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoFreshApp(page, FIXED_SEED);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    await page.getByTestId("share-seed-button").click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("seed=");
    expect(copied).toContain(FIXED_SEED);
  });
});
