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

    const homeOptions = await homeSelect.locator("option").count();
    const awayOptions = await awaySelect.locator("option").count();
    expect(homeOptions).toBeGreaterThan(0);
    expect(awayOptions).toBeGreaterThan(0);
  });

  test("team selection changes are reflected in managed-team radio labels", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    const homeSelect = page.getByTestId("home-team-select");
    const firstHomeTeam = await homeSelect.locator("option").first().textContent();
    await homeSelect.selectOption({ index: 0 });

    const homeRadioLabel = page.getByTestId("managed-team-radio-1").locator("..").textContent();
    const labelText = await homeRadioLabel;
    expect(labelText).toContain(firstHomeTeam ?? "");
  });

  test("player customization panel is present in the New Game dialog", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);
    const dialog = page.getByTestId("new-game-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("form")).toBeVisible();
  });

  test("editing a player nickname persists after saving and reloading", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Expand the customization panel
    await page.getByTestId("customize-players-toggle").click();
    // The first batter position is "C" (Catcher) — aria-label is "C nickname"
    await expect(page.getByLabel("C nickname")).toBeVisible({ timeout: 5_000 });

    const testNickname = "TestAce";
    await page.getByLabel("C nickname").fill(testNickname);

    // Start game and wait for progress
    await clickPlayBall(page);
    await page.getByTestId("speed-select").selectOption("350");
    await waitForAtLeastLogLines(page, 5);

    // Save
    await openSavesModal(page);
    await saveCurrentGame(page);
    await page.waitForTimeout(500);
    await closeSavesModal(page);

    // Navigate WITHOUT clearing IndexedDB — just go to a different seed URL
    // so the New Game dialog opens fresh, but RxDB data is preserved.
    await page.goto("/?seed=reload-test-nick");
    await page.waitForLoadState("domcontentloaded");
    await waitForNewGameDialog(page);
    await clickPlayBall(page);

    // Load the previously saved game
    await openSavesModal(page);
    await loadSaveByName(page, "New York Mets vs New York Yankees");
    await page.waitForTimeout(500);

    // The nickname must appear in the PlayerStatsPanel after loading
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 5_000 });
    await expect(statsPanel.getByText(testNickname)).toBeVisible({ timeout: 5_000 });
  });

  test("editing a stat modifier changes the effective stat display", async ({ page }) => {
    await gotoFreshApp(page);
    await waitForNewGameDialog(page);

    // Expand the customization panel
    await page.getByTestId("customize-players-toggle").click();
    // First batter is "C" (Catcher)
    await expect(page.getByLabel("C nickname")).toBeVisible({ timeout: 5_000 });

    // Read the current effective value for the Catcher's Contact stat (aria: "C CON")
    const contactSelect = page.getByLabel("C CON");
    await expect(contactSelect).toBeVisible({ timeout: 3_000 });

    // Get the base stat display before the change
    const statDisplay = contactSelect
      .locator("..")
      .locator("span[class*='Base'], [class*='BaseStat']")
      .first();
    const valueBefore = parseInt((await statDisplay.textContent()) ?? "0", 10);

    // Change contact modifier to "+20" (Elite)
    await contactSelect.selectOption("+20");

    // The displayed effective value should now be higher
    const valueAfter = parseInt((await statDisplay.textContent()) ?? "0", 10);
    expect(valueAfter).toBeGreaterThan(valueBefore);
  });
});
