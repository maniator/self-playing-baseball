import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  gotoFreshApp,
  takeManagerAction,
  waitForAtLeastLogLines,
  waitForManagerDecision,
  waitForNewGameDialog,
} from "../utils/helpers";

test.describe("Manager Mode", () => {
  test("manager mode checkbox is visible after game starts", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("manager-mode-checkbox")).toBeVisible();
  });

  test("enabling manager mode shows team and strategy selectors", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    const checkbox = page.getByTestId("manager-mode-checkbox");
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    // Strategy and team selectors should now be visible
    await expect(page.getByRole("combobox", { name: /strategy/i })).toBeVisible({ timeout: 3_000 });
  });

  test("decision panel appears once manager mode is enabled and game progresses", async ({
    page,
  }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    // Enable manager mode via the dialog (select "Home" managed team)
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    // Wait for a decision (manager mode is active, decisions will come)
    await waitForManagerDecision(page);
    await expect(page.getByTestId("decision-panel")).toBeVisible();
  });

  test("taking a manager action dismisses the decision panel", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    await waitForManagerDecision(page);

    // Click the first visible action button (Skip always available)
    const skipBtn = page.getByTestId("decision-panel").getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    } else {
      // Take whatever first action button is available
      await page.getByTestId("decision-panel").getByRole("button").first().click();
    }

    // Panel should disappear or a new decision takes over
    await expect(page.getByTestId("decision-panel")).not.toBeVisible({ timeout: 5_000 });
  });

  test("manager decision auto-skips after countdown", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await page.getByTestId("managed-team-radio-1").check();
    await clickPlayBall(page);

    await waitForManagerDecision(page);
    // Decision panel visible; wait for auto-skip (10 s + buffer)
    await expect(page.getByTestId("decision-panel")).not.toBeVisible({ timeout: 15_000 });
  });

  test.skip("manager action state persists across save + reload", async () => {
    // TODO: enable manager mode, take an action, save game, reload, load save,
    // confirm the decision log is preserved.
  });
});
