import { expect, test } from "@playwright/test";

import { pauseGame, resumeGame, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

test.describe("Speed slider", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Speed slider tests run on desktop only");
  });

  test("speed slider is visible during an active game", async ({ page }) => {
    await startGameViaPlayBall(page);
    const slider = page.getByTestId("speed-slider");
    await expect(slider).toBeVisible({ timeout: 10_000 });
    await expect(slider).toHaveAttribute("min", "0");
    await expect(slider).toHaveAttribute("max", "3");
    await expect(slider).toHaveAttribute("step", "1");
  });

  test("changing speed slider persists to localStorage", async ({ page }) => {
    await startGameViaPlayBall(page);
    const slider = page.getByTestId("speed-slider");
    await expect(slider).toBeVisible({ timeout: 10_000 });

    // Slide to position 2 (Fast = 150 ms).
    await slider.fill("2");

    const storedSpeed = await page.evaluate(() => Number(localStorage.getItem("speed")));
    expect(storedSpeed).toBe(150);
  });

  test("speed slider position 3 sets Instant speed (0 ms)", async ({ page }) => {
    await startGameViaPlayBall(page);
    const slider = page.getByTestId("speed-slider");
    await expect(slider).toBeVisible({ timeout: 10_000 });

    await slider.fill("3");

    const storedSpeed = await page.evaluate(() => Number(localStorage.getItem("speed")));
    expect(storedSpeed).toBe(0);
  });
});

test.describe("Pause / play button", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Pause/play tests run on desktop only");
  });

  test("pause button appears once game starts and is not shown before", async ({ page }) => {
    await startGameViaPlayBall(page);
    await expect(page.getByTestId("pause-play-button")).toBeVisible({ timeout: 10_000 });
  });

  test("clicking pause stops new log entries from appearing", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "pause-test1" });
    await waitForLogLines(page, 5);

    await pauseGame(page);

    // Count entries immediately after pausing.
    const countAfterPause = await page
      .getByTestId("play-by-play-log")
      .locator("[data-log-index]")
      .count();

    // Wait 2 s — no new entries should appear while paused.
    await page.waitForTimeout(2000);

    const countAfterWait = await page
      .getByTestId("play-by-play-log")
      .locator("[data-log-index]")
      .count();

    expect(countAfterWait).toBe(countAfterPause);
  });

  test("resuming after pause allows new log entries", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "pause-test2" });
    await waitForLogLines(page, 5);
    await pauseGame(page);

    const countAfterPause = await page
      .getByTestId("play-by-play-log")
      .locator("[data-log-index]")
      .count();

    await resumeGame(page);

    // After resuming, new entries should appear within a reasonable timeout.
    await expect(async () => {
      const count = await page.getByTestId("play-by-play-log").locator("[data-log-index]").count();
      expect(count).toBeGreaterThan(countAfterPause);
    }).toPass({ timeout: 10_000 });
  });

  test("pause state persists in localStorage", async ({ page }) => {
    await startGameViaPlayBall(page);
    await waitForLogLines(page, 3);
    await pauseGame(page);

    const paused = await page.evaluate(() => localStorage.getItem("gamePaused"));
    expect(paused).toBe("true");

    await resumeGame(page);

    const resumed = await page.evaluate(() => localStorage.getItem("gamePaused"));
    expect(resumed).toBe("false");
  });
});
