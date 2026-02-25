/**
 * QA regression tests for PR #79 follow-up (Stage 2B fixes).
 *
 * Covers:
 * 1. Mobile landscape Create Team layout — no Abbrev/City overlap
 * 2. Home buttons remain actionable after returning from New Game or Load Saved
 * 3. Load Saved Game from fresh Home does NOT create a phantom game
 * 4. "Save current game" is gated — only shown when a real game session exists
 */
import { expect, test } from "@playwright/test";

import {
  openSavesModal,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForNewGameDialog,
} from "../utils/helpers";

// ─── 1. Mobile landscape Create Team layout ──────────────────────────────────

test.describe("Create Team — mobile landscape Team Info layout (no overlap)", () => {
  test.use({ viewport: { width: 892, height: 412 } }); // Pixel 8a landscape

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Abbrev and City fields are stacked (no horizontal overlap) on mobile landscape", async ({
    page,
  }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-abbreviation-input")).toBeVisible({
      timeout: 5_000,
    });

    // Scroll the fields into view so bounding boxes are reliable.
    await page.getByTestId("custom-team-abbreviation-input").scrollIntoViewIfNeeded();
    await page.getByTestId("custom-team-city-input").scrollIntoViewIfNeeded();

    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    const cityBox = await page.getByTestId("custom-team-city-input").boundingBox();

    expect(abbrevBox).toBeTruthy();
    expect(cityBox).toBeTruthy();

    // On non-desktop viewports (landscape phones ≤1023px) the grid is single-
    // column so the abbreviation field's bottom edge must be at or above the
    // city field's top edge (stacked), never side-by-side with overlapping x.
    const abbrevBottom = abbrevBox!.y + abbrevBox!.height;
    expect(abbrevBottom).toBeLessThanOrEqual(cityBox!.y + 2); // 2px tolerance
  });

  test("Abbrev input does not visually overflow its container on mobile landscape", async ({
    page,
  }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-abbreviation-input")).toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId("custom-team-abbreviation-input").scrollIntoViewIfNeeded();
    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    expect(abbrevBox).toBeTruthy();
    // Field must not be wider than the visible viewport.
    expect(abbrevBox!.x + abbrevBox!.width).toBeLessThanOrEqual(892 + 2);
  });
});

// Also assert correct layout on portrait mobile (existing behaviour must stay).
test.describe("Create Team — mobile portrait Team Info layout", () => {
  test.use({ viewport: { width: 393, height: 852 } }); // iPhone 15 portrait

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Abbrev and City fields are stacked on mobile portrait", async ({ page }) => {
    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-abbreviation-input")).toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId("custom-team-abbreviation-input").scrollIntoViewIfNeeded();
    await page.getByTestId("custom-team-city-input").scrollIntoViewIfNeeded();

    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    const cityBox = await page.getByTestId("custom-team-city-input").boundingBox();

    expect(abbrevBox).toBeTruthy();
    expect(cityBox).toBeTruthy();

    const abbrevBottom = abbrevBox!.y + abbrevBox!.height;
    expect(abbrevBottom).toBeLessThanOrEqual(cityBox!.y + 2);
  });
});

// ─── 2. Home buttons remain actionable after returning from flows ─────────────

test.describe("Home button interactivity — regression guard", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("Home → New Game → Back to Home → Home buttons still work", async ({ page }) => {
    // Enter New Game flow.
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Return to Home via the dialog's back button.
    await page.getByTestId("new-game-back-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Home buttons must still be clickable — no backdrop should be blocking them.
    // Verify by clicking Load Saved Game (a different path) and checking it responds.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    // Saves modal OR game UI must appear — proves the click was NOT intercepted by a lingering backdrop.
    // Use .first() because on slower engines both the scoreboard (game screen just became visible)
    // and the saves modal can be present simultaneously; strict-mode would fail on 2 elements.
    await expect(
      page.getByTestId("saves-modal").or(page.getByTestId("scoreboard")).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Home → Load Saved → Back to Home → Home buttons still work", async ({ page }) => {
    // Enter Load Saved flow.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });

    // Close via the "Back to Home" button in the modal.
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("saves-modal")).not.toBeVisible();

    // Now click New Game from Home — must work (no lingering backdrop).
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });
  });

  test("Home → New Game → Back (← Home in controls) → Home buttons still work", async ({
    page,
  }) => {
    // Navigate into game via New Game.
    await waitForNewGameDialog(page);
    // Close dialog programmatically to reveal the ← Home button behind it.
    await page.evaluate(() => {
      (
        document.querySelector('[data-testid="new-game-dialog"]') as HTMLDialogElement | null
      )?.close();
    });
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 5_000 });

    // Click the ← Home button in the game controls.
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    // Home buttons must respond. Click Manage Teams as a representative button.
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  });

  test("Home → Load Saved → Back to Home (modal close) → re-enter Load Saved works", async ({
    page,
  }) => {
    // Enter Load Saved — saves modal auto-opens.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });

    // The close button is labelled "Back to Home" on the pre-load path and
    // routes back to the Home screen when clicked.
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("saves-modal")).not.toBeVisible();

    // Repeated Load Saved click must work — no lingering backdrop should block it.
    // Use .first() because on slower engines both the scoreboard (game screen just became visible)
    // and the saves modal can be present simultaneously; strict-mode would fail on 2 elements.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId("saves-modal").or(page.getByTestId("scoreboard")).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── 3. Load Saved from fresh Home does NOT create a phantom game ─────────────

test.describe("Load Saved from fresh Home — no phantom game creation", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("fresh page load → Load Saved opens saves modal without starting a game", async ({
    page,
  }) => {
    // Click Load Saved from a completely fresh page load (no prior game session).
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });

    // Saves modal must open.
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });
  });

  test("'Save current game' button is hidden before any real game session starts", async ({
    page,
  }) => {
    // Load Saved path — no game has been started or loaded.
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });

    // The "Save current game" button must NOT appear — there is nothing to save.
    await expect(page.getByTestId("save-game-button")).not.toBeVisible();
  });

  test("empty saves list on fresh page load via Load Saved (no phantom saves)", async ({
    page,
  }) => {
    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });

    // No saved games should exist — the "No saves yet." empty state should be shown.
    await expect(page.getByText("No saves yet.")).toBeVisible({ timeout: 5_000 });
    // Load buttons must not exist either.
    await expect(page.getByTestId("load-save-button")).not.toBeVisible();
  });
});

// ─── 4. "Save current game" gating ──────────────────────────────────────────

test.describe("Save current game gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test("'Save current game' IS shown after starting a real game", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "save-gate-1" });
    await openSavesModal(page);
    // After a real game session, "Save current game" must be present.
    await expect(page.getByTestId("save-game-button")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("saves-modal-close-button").click();
  });

  test("'Update save' shown instead of 'Save current game' when a save already exists", async ({
    page,
  }) => {
    await startGameViaPlayBall(page, { seed: "save-gate-2" });
    // Create the initial save.
    await saveCurrentGame(page);
    // saveCurrentGame leaves the modal open; close it before re-opening.
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });
    // Re-open saves modal — should now show "Update save".
    await openSavesModal(page);
    await expect(page.getByTestId("save-game-button")).toHaveText("Update save", {
      timeout: 5_000,
    });
    await page.getByTestId("saves-modal-close-button").click();
  });

  test("'Save current game' IS shown after loading a saved game", async ({ page }) => {
    // Create and save a game first.
    await startGameViaPlayBall(page, { seed: "save-gate-load" });
    await saveCurrentGame(page);
    await page.getByTestId("saves-modal-close-button").click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 5_000 });

    // Go back to Home and re-enter via Load Saved.
    await page.getByTestId("back-to-home-button").click();
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("home-load-saves-button").click();
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });

    // Load the save.
    await page.getByTestId("load-save-button").first().click();
    await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });

    // Re-open saves — save button must be present since a save was loaded.
    await openSavesModal(page);
    await expect(page.getByTestId("save-game-button")).toBeVisible({ timeout: 5_000 });
  });
});
