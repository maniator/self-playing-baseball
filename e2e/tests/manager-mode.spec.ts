import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

test.describe("Manager Mode", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Manager Mode toggle is visible after game starts", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "manager1" });
    const toggle = page.getByTestId("manager-mode-toggle");
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test("enabling Manager Mode shows strategy selector", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "manager2" });
    const toggle = page.getByTestId("manager-mode-toggle");
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    // Enable manager mode
    await toggle.check();
    await expect(toggle).toBeChecked();

    // Strategy selector should appear (contains "Balanced" option)
    await expect(page.getByRole("combobox").filter({ hasText: "Balanced" })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("manager decision panel appears and action can be taken", async ({ page }) => {
    // This test waits up to 120 s for a decision point — set a generous
    // test-level timeout so the global 90 s limit doesn't fire first.
    test.setTimeout(150_000);

    // Selecting managedTeam "0" (away team) via the New Game dialog causes
    // GameInner's handleStart to call setManagerMode(true).  This is the
    // correct way to enable manager mode — it avoids the race condition where
    // handleStart would otherwise override any localStorage pre-set value.
    await startGameViaPlayBall(page, { seed: "mgr42", managedTeam: "0" });
    await waitForLogLines(page, 3);

    // With manager mode active from the start, autoplay pauses at the first
    // decision point (defensive_shift at the start of the home team's first
    // at-bat, or bunt / count30 / count02 — all happen within the first inning).
    // Allow 120 s so even slow CI runners have enough headroom.
    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 120_000 });

    // Take the first available action button to resolve the decision.
    const actionButtons = page.getByTestId("manager-decision-panel").getByRole("button");
    await actionButtons.first().click();

    // Decision panel should close once the action is dispatched.
    await expect(page.getByTestId("manager-decision-panel")).not.toBeVisible({ timeout: 5_000 });
  });
});
