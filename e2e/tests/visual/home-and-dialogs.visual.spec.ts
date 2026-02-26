import { expect, test } from "@playwright/test";

import { disableAnimations, resetAppState, waitForNewGameDialog } from "../../utils/helpers";

/**
 * Visual regression snapshots — run across all 6 non-determinism viewport projects
 * (desktop, tablet, iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 * Captures home screen and dialog/modal screens.
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("Home screen screenshot", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-screen")).toHaveScreenshot("home-screen.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Exhibition Setup page screenshot", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("exhibition-setup-page")).toHaveScreenshot(
      "new-game-dialog.png",
      {
        mask: [page.getByTestId("seed-input")],
        maxDiffPixelRatio: 0.05,
      },
    );
  });

  /**
   * How to Play modal — default state.
   *
   * Starts a game to reach the /game route where the "How to Play" button
   * lives (inside GameControls). The "Basics" section is open by default;
   * all other sections are collapsed.
   */
  test("How to Play modal default state screenshot", async ({ page }) => {
    // Start a game so we're on /game where the How to Play button is available.
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    // Switch to MLB tab and submit to start the game quickly.
    await page.getByTestId("new-game-mlb-teams-tab").click();
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-default.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * How to Play modal — all accordion sections expanded.
   *
   * Desktop-only to keep CI time reasonable; the accordion layout is the
   * same across all viewports.  We programmatically open every closed
   * <details> element and then wait until all 8 sections are structurally
   * open before snapshotting.
   */
  test("How to Play modal all sections expanded screenshot", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "All sections expanded snapshot is desktop-only",
    );
    // Start a game to reach /game where the How to Play button is available.
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("new-game-mlb-teams-tab").click();
    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    // Use Playwright clicks (correct screen coordinates) so the dialog's
    // outside-click handler doesn't close it due to clientX/Y = 0.
    const closedSummaries = page.locator(
      '[data-testid="instructions-modal"] details:not([open]) > summary',
    );
    while ((await closedSummaries.count()) > 0) {
      await closedSummaries.first().click();
    }
    // Wait until all 8 sections are structurally open before snapshotting.
    await expect(page.locator('[data-testid="instructions-modal"] details[open]')).toHaveCount(8);
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-all-sections.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
