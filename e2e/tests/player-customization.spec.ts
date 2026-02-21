import { expect, test } from "@playwright/test";

import {
  clickPlayBall,
  closeSavesModal,
  gotoFreshApp,
  loadSaveByName,
  openSavesModal,
  saveCurrentGame,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

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

  test("editing a player nickname persists after saving and reloading", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Expand the customization panel
    await page.getByTestId("customize-players-toggle").click();
    await expect(page.getByLabel("Catcher nickname")).toBeVisible({ timeout: 5_000 });

    // Type a distinctive nickname for the Catcher (first batter slot)
    const testNickname = "TestAce";
    await page.getByLabel("Catcher nickname").fill(testNickname);

    // Start the game
    await clickPlayBall(page);
    await page.getByTestId("speed-select").selectOption("350");
    await waitForAtLeastLogLines(page, 5);

    // Save, reload, load the saved game
    await openSavesModal(page);
    await saveCurrentGame(page);
    await page.waitForTimeout(500);
    await closeSavesModal(page);

    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    await clickPlayBall(page);
    await openSavesModal(page);
    await loadSaveByName(page, "New York Mets vs New York Yankees");
    await page.waitForTimeout(500);

    // The nickname must appear in the PlayerStatsPanel after loading.
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 5_000 });
    await expect(statsPanel.getByText(testNickname)).toBeVisible({ timeout: 5_000 });
  });

  test("editing a stat modifier changes the effective stat display", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Expand the customization panel
    await page.getByTestId("customize-players-toggle").click();
    await expect(page.getByLabel("Catcher nickname")).toBeVisible({ timeout: 5_000 });

    // Read the current effective value for the Catcher's Contact stat.
    const contactLabel = page.getByLabel("Catcher CON");
    const baseDisplayBefore = await contactLabel
      .locator("..")
      .locator("span, output, [class*='Base']")
      .first()
      .textContent();

    // Change contact modifier to "+20" (Elite) via the aria-labelled select
    await contactLabel.selectOption("+20");

    // The displayed effective value should now be different (higher).
    const baseDisplayAfter = await contactLabel
      .locator("..")
      .locator("span, output, [class*='Base']")
      .first()
      .textContent();

    expect(parseInt(baseDisplayAfter ?? "0", 10)).toBeGreaterThan(
      parseInt(baseDisplayBefore ?? "0", 10),
    );
  });
});
