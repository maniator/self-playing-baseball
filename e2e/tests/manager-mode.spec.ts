import { expect, test } from "@playwright/test";

import {
  loadFixture,
  resetAppState,
  startGameViaPlayBall,
  waitForLogLines,
} from "../utils/helpers";

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
    // Load a fixture that already has pendingDecision=defensive_shift and
    // managerMode=true — the panel is visible immediately, no autoplay wait needed.
    await loadFixture(page, "pending-decision.json");

    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 10_000 });

    // Take the first available action button to resolve the decision.
    const actionButtons = page.getByTestId("manager-decision-panel").getByRole("button");
    await actionButtons.first().click();

    // Decision panel should close once the action is dispatched.
    await expect(page.getByTestId("manager-decision-panel")).not.toBeVisible({ timeout: 5_000 });
  });
});
