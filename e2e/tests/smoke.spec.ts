import { expect, test } from "@playwright/test";

import {
  assertFieldAndLogVisible,
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Smoke", () => {
  test("app loads and shows the Home screen", async ({ page }) => {
    await resetAppState(page);
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-new-game-button")).toBeVisible();
    await expect(page.getByTestId("home-load-saves-button")).toBeVisible();
    await expect(page.getByTestId("home-manage-teams-button")).toBeVisible();
  });

  test("New Game button on Home screen shows the New Game dialog", async ({ page }) => {
    await resetAppState(page);
    await waitForNewGameDialog(page);
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
      const entries = page.getByTestId("play-by-play-log").locator("[data-log-index]");
      expect(await entries.count()).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 30_000, intervals: [500, 1000, 1000] });
  });

  // ---------------------------------------------------------------------------
  // Game-start gating: the simulation must not produce events until the user
  // submits the New Game dialog ("Play Ball!").
  // ---------------------------------------------------------------------------

  test("game does not start (no log entries) before Play Ball is clicked", async ({ page }) => {
    await resetAppState(page);
    await waitForNewGameDialog(page);

    // While the new-game dialog is open it intercepts all pointer events,
    // so we cannot click any controls behind it. Instead we simply pause
    // and then assert the play-by-play log has no entries — an indirect check
    // that the autoplay scheduler has NOT fired before Play Ball is clicked.
    await page.waitForTimeout(2_000);

    // The play-by-play log should have zero entries while the dialog is open.
    // We check via DOM query rather than clicking a toggle (which would be
    // blocked by the dialog overlay).
    const entryCount = await page.evaluate(() => {
      return document.querySelectorAll("[data-log-index]").length;
    });
    expect(entryCount).toBe(0);
  });

  test("autoplay begins immediately after Play Ball — no manual input required", async ({
    page,
  }) => {
    // Click Play Ball without pre-seeding localStorage for autoPlay.
    // The app default is autoPlay=true, so this exercises the "out of the box"
    // experience: game starts → pitches happen → log grows, all without any click.
    await startGameViaPlayBall(page, { seed: "abc123" });

    // Expand the play-by-play log if necessary, then wait for ≥3 entries.
    // This confirms the autoplay scheduler fired without user input.
    await waitForLogLines(page, 3, 30_000);
  });

  test("game completes (FINAL banner) without any user interaction", async ({ page }, testInfo) => {
    // Long-running: a full 9-inning game at SPEED_FAST still takes 70–90 s.
    // Restrict to desktop Chromium to avoid multiplying CI time across all
    // viewport projects — the game-completion path is viewport-independent.
    test.skip(
      testInfo.project.name !== "desktop",
      "Full-game completion test runs on desktop only",
    );
    test.setTimeout(180_000);

    // Fastest speed ensures the full game finishes quickly.
    await page.addInitScript(() => {
      localStorage.setItem("speed", "350"); // SPEED_FAST
    });
    await startGameViaPlayBall(page, { seed: "smoke-final1" });
    await expect(page.getByText("FINAL")).toBeVisible({ timeout: 120_000 });

    // After FINAL, the scoreboard should still be visible and no errors thrown.
    await expect(page.getByTestId("scoreboard")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Long-session performance stability: after 50+ log lines the app must still
  // respond to interactions within a reasonable time (no freeze / stall).
  // ---------------------------------------------------------------------------

  test("app remains responsive after 50+ autoplay log entries (no stall)", async ({
    page,
  }, testInfo) => {
    // Long-running: generates 50+ autoplay entries before asserting responsiveness.
    // Restrict to desktop Chromium — viewport does not affect scheduling behavior.
    test.skip(
      testInfo.project.name !== "desktop",
      "Long-session responsiveness test runs on desktop only",
    );
    test.setTimeout(120_000);

    // Use fast speed so we hit 50 entries quickly.
    await page.addInitScript(() => {
      localStorage.setItem("speed", "350");
    });
    await startGameViaPlayBall(page, { seed: "perf-smoke1" });
    await waitForLogLines(page, 50, 90_000);

    // The Saves button must still be clickable and the modal open quickly —
    // verifies the main thread is not frozen after a long autoplay burst.
    const savesBtn = page.getByTestId("saves-button");
    await expect(savesBtn).toBeVisible();

    await savesBtn.click();
    // If the main thread is frozen, this assertion will time out (generous 5 s bound).
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 5_000 });

    // Close the modal to leave a clean state.
    await page.getByRole("button", { name: /close/i }).click();
  });
});
