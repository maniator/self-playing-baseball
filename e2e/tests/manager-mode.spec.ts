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

  test.skip("manager decision panel appears and action can be taken", async ({ page }) => {
    // TODO: This test requires waiting for a specific game state (e.g. 3-0 count)
    // which is hard to time deterministically in this sprint.
    // Re-enable once decision point injection or state mocking is available.
    await startGameViaPlayBall(page, { seed: "manager3" });
    await waitForLogLines(page, 5);

    // Enable manager mode and managed team
    await page.getByTestId("manager-mode-toggle").check();

    // Wait for a decision panel to appear (may take a while depending on seed)
    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 60_000 });

    // Take the first available action button
    const actionButtons = page.getByTestId("manager-decision-panel").getByRole("button");
    await actionButtons.first().click();

    // Decision panel should close after action
    await expect(page.getByTestId("manager-decision-panel")).not.toBeVisible({ timeout: 5_000 });
  });
});
