import { expect, test } from "@playwright/test";

import { assertFieldAndLogVisible, resetAppState, startGameViaPlayBall } from "../utils/helpers";

test.describe("Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("app loads and New Game dialog is visible", async ({ page }) => {
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("play-ball-button")).toBeVisible();
  });

  test("Play Ball! button starts the game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "abc123" });
    await expect(page.getByTestId("scoreboard")).toBeVisible();
  });

  test("scoreboard and field visible after game starts", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "abc123" });
    await assertFieldAndLogVisible(page);
  });

  test("play-by-play log updates automatically (autoplay)", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "abc123" });
    // Expand the play-by-play log
    const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
    if (await logToggle.isVisible()) {
      await logToggle.click();
    }
    // The log should populate without any user interaction (autoplay is always on)
    await expect(async () => {
      const entries = page.getByTestId("play-by-play-log").locator("div");
      expect(await entries.count()).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 30_000, intervals: [500, 1000, 1000] });
  });
});
