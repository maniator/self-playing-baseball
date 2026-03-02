/**
 * Manager Substitution — E2E tests for in-game roster substitutions.
 *
 * Covers:
 * 1. Substitution button appears in manager mode when a game is in progress
 * 2. Clicking the button opens the substitution panel
 * 3. Substitution panel shows batter and pitcher sections
 * 4. Panel can be closed without making a change
 */
import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

test.describe("Manager Substitution Panel", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("substitution button is visible when manager mode is active during a game", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "sub1", managedTeam: "0" });
    await waitForLogLines(page, 2);
    await expect(page.getByRole("button", { name: /substitution/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("clicking substitution button opens the substitution panel", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "sub2", managedTeam: "0" });
    await waitForLogLines(page, 2);
    const subBtn = page.getByRole("button", { name: /substitution/i });
    await expect(subBtn).toBeVisible({ timeout: 10_000 });
    await subBtn.click();
    await expect(page.getByTestId("substitution-panel")).toBeVisible({ timeout: 5_000 });
  });

  test("substitution panel shows Batter Substitution and Pitching Change sections", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "sub3", managedTeam: "0" });
    await waitForLogLines(page, 2);
    const subBtn = page.getByRole("button", { name: /substitution/i });
    await expect(subBtn).toBeVisible({ timeout: 10_000 });
    await subBtn.click();
    const panel = page.getByTestId("substitution-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(/Batter Substitution/i)).toBeVisible();
    await expect(panel.getByText(/Pitching Change/i)).toBeVisible();
  });

  test("substitution panel can be closed with the close button", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "sub4", managedTeam: "0" });
    await waitForLogLines(page, 2);
    const subBtn = page.getByRole("button", { name: /substitution/i });
    await expect(subBtn).toBeVisible({ timeout: 10_000 });
    await subBtn.click();
    const panel = page.getByTestId("substitution-panel");
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await panel.getByRole("button", { name: /close/i }).click();
    await expect(panel).not.toBeVisible({ timeout: 3_000 });
  });
});
