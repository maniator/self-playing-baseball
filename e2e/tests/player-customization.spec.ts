import { expect, test } from "@playwright/test";

import { clickPlayBall, gotoFreshApp, waitForNewGameDialog } from "../utils/helpers";

test.describe("Player customization", () => {
  test("New Game dialog shows home and away team selectors with options", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    const homeSelect = page.getByTestId("home-team-select");
    const awaySelect = page.getByTestId("away-team-select");
    await expect(homeSelect).toBeVisible();
    await expect(awaySelect).toBeVisible();

    // Both selectors should have options
    const homeOptions = await homeSelect.locator("option").count();
    const awayOptions = await awaySelect.locator("option").count();
    expect(homeOptions).toBeGreaterThan(0);
    expect(awayOptions).toBeGreaterThan(0);
  });

  test("team selection changes are reflected in managed-team radio labels", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Select the first available home team option
    const homeSelect = page.getByTestId("home-team-select");
    const firstHomeTeam = await homeSelect.locator("option").first().textContent();
    await homeSelect.selectOption({ index: 0 });

    // The "Home" managed-team radio should show the chosen team name
    const homeRadioLabel = page
      .getByTestId("managed-team-radio-1")
      .locator("..") // parent RadioLabel
      .textContent();
    const labelText = await homeRadioLabel;
    expect(labelText).toContain(firstHomeTeam ?? "");
  });

  test("player customization panel is present in the New Game dialog", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    // The PlayerCustomizationPanel should render inside the dialog
    const dialog = page.getByTestId("new-game-dialog");
    await expect(dialog).toBeVisible();
    // The panel renders collapsible team sections — check the form exists
    await expect(dialog.locator("form")).toBeVisible();
  });

  test.skip("editing a player nickname persists after saving and reloading", async () => {
    // TODO: expand the player customization panel, change a nickname,
    // start game, save, reload, load save, verify nickname appears in logs.
  });

  test.skip("editing a stat modifier changes the player display", async () => {
    // TODO: expand player panel, change contactMod to Elite,
    // start game, verify some observable difference.
  });
});
