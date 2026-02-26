import { expect, test } from "@playwright/test";

import {
  closeNewGameDialog,
  disableAnimations,
  loadFixture,
  resetAppState,
  saveCurrentGame,
  startGameViaPlayBall,
  waitForLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

/**
 * Visual regression snapshots — run across all 6 non-determinism viewport projects
 * (desktop, tablet, iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 * Captures a small, high-signal set of screens per viewport.
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("Home screen screenshot", async ({ page }) => {
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-screen")).toHaveScreenshot("home-screen.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("New Game dialog screenshot", async ({ page }) => {
    await waitForNewGameDialog(page);
    await expect(page.getByTestId("new-game-dialog")).toHaveScreenshot("new-game-dialog.png", {
      mask: [],
      maxDiffPixelRatio: 0.05,
    });
  });

  test("in-game state screenshot after a few events", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual1" });
    await waitForLogLines(page, 8);
    // Capture the full scoreboard + field area
    await expect(page.getByTestId("scoreboard")).toHaveScreenshot("scoreboard-in-game.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Team tab bar screenshot — verifies the global Away/Home TeamTabBar that
   * sits at the top of the log panel and controls both Batting Stats and Hit
   * Log simultaneously.  The tab bar itself is stable once the game starts
   * (team names don't change), so no masking is needed.
   */
  test("team tab bar screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const tabBar = page.getByTestId("team-tab-bar");
    await expect(tabBar).toBeVisible({ timeout: 10_000 });
    await expect(tabBar).toHaveScreenshot("team-tab-bar.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Player stats panel screenshot — captures the panel with Player Details in
   * the empty (no batter selected) state.  Verifies the stats table layout and
   * the placeholder copy across all viewports.
   *
   * We use a deterministic seed and wait for a fixed log-line count so the
   * entire panel (including live stat values) is stable at screenshot time.
   */
  test("player stats panel with RBI column screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    // Seed is deterministic and we wait for a fixed log-line count, so the
    // entire panel (including tbody stats) is stable — no masking needed.
    await expect(statsPanel).toHaveScreenshot("player-stats-panel.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Player stats panel — selected batter state.
   *
   * Clicks the first batter row so the Player Details section renders the
   * expanded stat card (player name, sublabel, counting + rate stats grids).
   * Verifies the selected-row highlight and populated Player Details UI
   * across all viewports.
   */
  test("player stats panel selected batter screenshot", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual-stats1" });
    await waitForLogLines(page, 8);
    const statsPanel = page.getByTestId("player-stats-panel");
    await expect(statsPanel).toBeVisible({ timeout: 10_000 });
    // Select the first batter row — this transitions Player Details from empty
    // to the populated card for batter slot 1.
    await page.getByTestId("batter-row-1").click();
    // Wait for the SubLabel ("This game") to confirm the selected state is rendered.
    await expect(statsPanel.getByText(/this game/i)).toBeVisible({ timeout: 5_000 });
    await expect(statsPanel).toHaveScreenshot("player-stats-panel-selected.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("saves modal screenshot with one save present", async ({ page }) => {
    await startGameViaPlayBall(page, { seed: "visual2" });
    await waitForLogLines(page, 5);
    await saveCurrentGame(page);
    await expect(page.getByTestId("saves-modal")).toHaveScreenshot("saves-modal-with-save.png", {
      mask: [
        // Mask the date/time stamps which change every run
        page.getByTestId("slot-date"),
      ],
      maxDiffPixelRatio: 0.05,
    });
  });

  /**
   * Manager decision panel screenshot — captures the DecisionPanel UI that
   * appears when Manager Mode is active and a decision point is reached.
   *
   * Uses a pre-crafted save fixture (pending-decision.json) that already has
   * pendingDecision set to "defensive_shift", making this test instant instead
   * of waiting up to 120 s for autoplay to reach a decision point.
   *
   * Restricted to desktop because the panel layout is identical across viewports.
   */
  test("manager decision panel screenshot", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Decision panel snapshot is desktop-only");

    await loadFixture(page, "pending-decision.json");
    // The fixture has pendingDecision=defensive_shift and managerMode=true,
    // so the panel is visible immediately after load.
    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 10_000 });

    // Snapshot just the decision panel itself so the screenshot is stable
    // regardless of what is happening in the scoreboard / log behind it.
    await expect(page.getByTestId("manager-decision-panel")).toHaveScreenshot(
      "manager-decision-panel.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * How to Play modal — default state.
   *
   * Opens the dialog from the New Game screen.  The "Basics" section is open
   * by default; all other sections are collapsed.  Runs on all 6 viewports
   * so we catch any mobile / tablet layout regressions.
   */
  test("How to Play modal default state screenshot", async ({ page }) => {
    await waitForNewGameDialog(page);
    // Close the New Game <dialog> so the rest of the page is no longer inert.
    await closeNewGameDialog(page);
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-default.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * How to Play modal — all accordion sections expanded.
   *
   * Desktop-only to keep CI time reasonable; the accordion layout is the
   * same across all viewports.  We programmatically open every closed
   * <details> element and then wait until all 8 sections are structurally
   * open before snapshotting.
   */
  test("How to Play modal all sections expanded screenshot", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "All sections expanded snapshot is desktop-only",
    );
    await waitForNewGameDialog(page);
    // Close the New Game <dialog> so the rest of the page is no longer inert.
    await closeNewGameDialog(page);
    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByTestId("instructions-modal")).toBeVisible();
    // Use Playwright clicks (correct screen coordinates) so the dialog's
    // outside-click handler doesn't close it due to clientX/Y = 0.
    const closedSummaries = page.locator(
      '[data-testid="instructions-modal"] details:not([open]) > summary',
    );
    while ((await closedSummaries.count()) > 0) {
      await closedSummaries.first().click();
    }
    // Wait until all 8 sections are structurally open before snapshotting.
    await expect(page.locator('[data-testid="instructions-modal"] details[open]')).toHaveCount(8);
    await expect(page.getByTestId("instructions-modal")).toHaveScreenshot(
      "instructions-modal-all-sections.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── Stage 2B: Custom Team UI visual snapshots ────────────────────────────────
//
// These snapshots cover new Stage 2B surfaces:
//   1. Manage Teams screen (desktop baseline)
//   2. Create Team editor — Team Info section, mobile portrait
//   3. Create Team editor — Team Info section, narrow phone landscape
//   4. Edit Team editor — mobile portrait
//   5. Saves modal with a custom-team saved game row (human-readable names)
//
// Viewport strategy:
//   • Manage Teams / Create / Edit portrait: run on iphone-15 + desktop only
//     to avoid 6× matrix for screens that look the same per-device class.
//   • Narrow landscape: uses a fixed 731×412 viewport override (Pixel 8a-class
//     landscape) inside a describe block with test.use() so it does not pollute
//     the device-level viewports for other tests.
//   • Saves modal: desktop + iphone-15 only (sufficient coverage of the row layout).

/** Helper: navigate to Manage Teams, click Create, click Generate Defaults, and
 *  fill in a deterministic team name. Returns once the name input is stable. */
async function openCreateEditorWithName(page: Parameters<typeof resetAppState>[0], name: string) {
  await page.getByTestId("home-manage-teams-button").click();
  await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("manage-teams-create-button").click();
  await expect(page.getByTestId("custom-team-name-input")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("custom-team-regenerate-defaults-button").click();
  await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", { timeout: 3_000 });
  await page.getByTestId("custom-team-name-input").fill(name);
}

/** Helper: create and save a custom team, then return to the home screen. */
async function createAndSaveTeam(
  page: Parameters<typeof resetAppState>[0],
  name: string,
): Promise<void> {
  await openCreateEditorWithName(page, name);
  await page.getByTestId("custom-team-save-button").click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("manage-teams-back-button").click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
}

// ─── 1. Manage Teams screen baseline ─────────────────────────────────────────
test.describe("Visual — Stage 2B: Manage Teams screen", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Desktop baseline: empty team list state (no custom teams yet).
   * Desktop-only because the layout is identical across viewports and
   * a single stable baseline is sufficient for regression detection.
   */
  test("manage teams screen — empty list (desktop)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Manage Teams baseline is desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("manage-teams-screen")).toHaveScreenshot(
      "manage-teams-screen-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * Desktop baseline: team list with one team present.
   * Captures the TeamListItem with Edit/Delete buttons.
   */
  test("manage teams screen — one team in list (desktop)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Manage Teams baseline is desktop-only");

    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Snapshot City Sox");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Snapshot City Sox")).toBeVisible({ timeout: 5_000 });

    await expect(page.getByTestId("manage-teams-screen")).toHaveScreenshot(
      "manage-teams-screen-with-team.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 2. Create Team editor — mobile portrait ──────────────────────────────────
test.describe("Visual — Stage 2B: Create Team editor, mobile portrait", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Team Info section visible/usable on mobile portrait.
   * Restricted to iphone-15 (393×659) — one narrow-phone representative.
   * Confirms name, abbreviation, and city fields are present and non-overlapping.
   */
  test("create team — Team Info section visible on mobile portrait (iphone-15)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone-15",
      "Create Team mobile portrait is iphone-15 only",
    );

    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", {
      timeout: 3_000,
    });

    // Scroll to the top of the editor shell so Team Info section is in view.
    await page.getByTestId("manage-teams-editor-shell").evaluate((el) => el.scrollTo(0, 0));

    // Snapshot just the editor shell element to keep the screenshot stable
    // regardless of what is behind the semi-transparent overlay.
    await expect(page.getByTestId("manage-teams-editor-shell")).toHaveScreenshot(
      "create-team-editor-mobile-portrait.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 3. Create Team editor — narrow phone landscape ───────────────────────────
//
// Uses test.use() to override the viewport to 731×412 (Pixel 8a-class landscape).
// Restricted to the desktop project so the test.use viewport override does not
// conflict with device-emulation viewports in mobile projects.
// This catches the Abbrev/City two-column → single-column stacking regression.
test.describe("Visual — Stage 2B: Create Team editor, narrow landscape", () => {
  test.use({ viewport: { width: 731, height: 412 } });

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Narrow phone landscape (731×412 ≈ Pixel 8a landscape).
   * At this width the TeamInfoSecondRow must stack Abbrev and City in a
   * single column — NOT two columns which would overlap at narrow heights.
   */
  test("create team — no Abbrev/City overlap on narrow landscape (desktop@731x412)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Narrow landscape snapshot uses desktop project with viewport override",
    );

    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", {
      timeout: 3_000,
    });

    // Non-visual assertion: abbreviation and city inputs must not overlap.
    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    const cityBox = await page.getByTestId("custom-team-city-input").boundingBox();
    expect(abbrevBox).not.toBeNull();
    expect(cityBox).not.toBeNull();
    // In single-column layout the city box top must be below the abbreviation box bottom.
    expect(cityBox!.y + cityBox!.height / 2 > abbrevBox!.y + abbrevBox!.height / 2).toBe(true);

    await page.getByTestId("manage-teams-editor-shell").evaluate((el) => el.scrollTo(0, 0));

    await expect(page.getByTestId("manage-teams-editor-shell")).toHaveScreenshot(
      "create-team-editor-narrow-landscape.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 4. Edit Team editor — mobile portrait ────────────────────────────────────
test.describe("Visual — Stage 2B: Edit Team editor, mobile portrait", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Edit mode pre-fills all fields from the saved team.
   * Restricted to iphone-15 (393×659) — one narrow-phone representative.
   * Verifies the editor shell is usable in edit mode on mobile portrait.
   */
  test("edit team — editor loaded in edit mode, mobile portrait (iphone-15)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone-15", "Edit Team mobile portrait is iphone-15 only");

    // Create a team first so we have something to edit.
    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await page.getByTestId("custom-team-name-input").fill("Visual Edit Team");
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByText("Visual Edit Team")).toBeVisible({ timeout: 5_000 });

    // Open edit mode for the saved team.
    await page.getByTestId("custom-team-edit-button").first().click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 5_000 });

    // Name should be pre-filled.
    await expect(page.getByTestId("custom-team-name-input")).toHaveValue("Visual Edit Team");

    await page.getByTestId("manage-teams-editor-shell").evaluate((el) => el.scrollTo(0, 0));

    await expect(page.getByTestId("manage-teams-editor-shell")).toHaveScreenshot(
      "edit-team-editor-mobile-portrait.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 5. Create Team editor — desktop (empty + filled states) ─────────────────
//
// Covers the Team Info two-column layout (Abbrev 150px + City) that was
// previously broken on desktop due to an undersized first grid column.
// Desktop-only: one stable baseline is sufficient to catch layout regressions;
// mobile portrait is already covered in the section above.
test.describe("Visual — Create Team editor, desktop", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Empty form state: editor is open but no defaults have been generated yet.
   * Verifies Team Info row (Name / Abbrev + City) renders without overlap
   * before any user input.
   */
  test("create team — empty form state, Team Info layout (desktop)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Create Team desktop empty-state snapshot is desktop-only",
    );

    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 5_000 });

    // Non-visual assertion: Abbrev and City inputs must not overlap.
    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    const cityBox = await page.getByTestId("custom-team-city-input").boundingBox();
    expect(abbrevBox).not.toBeNull();
    expect(cityBox).not.toBeNull();
    // In two-column layout the City box left edge must be to the right of the Abbrev box.
    expect(cityBox!.x).toBeGreaterThan(abbrevBox!.x + abbrevBox!.width / 2);

    await page.getByTestId("manage-teams-editor-shell").evaluate((el) => el.scrollTo(0, 0));
    await expect(page.getByTestId("manage-teams-editor-shell")).toHaveScreenshot(
      "create-team-desktop-empty.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });

  /**
   * Filled / generated state: Team Info populated + a generated roster.
   * Verifies the Abbrev (150 px) + City side-by-side row and the generated
   * player cards (lineup + bench + pitchers) render cleanly on desktop.
   */
  test("create team — filled state after Generate Defaults (desktop)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Create Team desktop filled-state snapshot is desktop-only",
    );

    await page.getByTestId("home-manage-teams-button").click();
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("manage-teams-editor-shell")).toBeVisible({ timeout: 5_000 });

    // Generate defaults to populate fields deterministically (counter = 0 on fresh page).
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", {
      timeout: 3_000,
    });

    // Overwrite the name with a stable value so the snapshot is deterministic.
    await page.getByTestId("custom-team-name-input").fill("Desktop Test Team");

    // Non-visual assertion: Abbrev and City must be side by side (two-column layout).
    const abbrevBox = await page.getByTestId("custom-team-abbreviation-input").boundingBox();
    const cityBox = await page.getByTestId("custom-team-city-input").boundingBox();
    expect(abbrevBox).not.toBeNull();
    expect(cityBox).not.toBeNull();
    expect(cityBox!.x).toBeGreaterThan(abbrevBox!.x + abbrevBox!.width / 2);

    await page.getByTestId("manage-teams-editor-shell").evaluate((el) => el.scrollTo(0, 0));
    await expect(page.getByTestId("manage-teams-editor-shell")).toHaveScreenshot(
      "create-team-desktop-filled.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 6. Saves modal with custom-team saved game rows ──────────────────────────
test.describe("Visual — Stage 2B: saves modal with custom-team game rows", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Saves modal shows human-readable team names (not raw `custom:ct_*` IDs).
   *
   * Flow:
   *   1. Create two custom teams via Manage Teams.
   *   2. Start a New Game using those custom teams (Custom Teams tab).
   *   3. Wait for a few log lines, then save the game.
   *   4. Open the saves modal and snapshot it.
   *
   * The save-row team label should read the custom team name, not an ID.
   * Dates are masked (they change every run).
   *
   * Restricted to desktop only — the row layout is the same across viewports
   * and a single stable baseline is sufficient.
   */
  test("saves modal — custom-team game row shows display names (desktop)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Custom-team saves modal snapshot is desktop-only",
    );

    // Step 1: create two custom teams.
    // Note: generateDefaultTeam fills a city, so the display name becomes
    // "GeneratedCity TeamName". We keep the names simple for readability.
    await createAndSaveTeam(page, "Sox");
    await createAndSaveTeam(page, "Cubs");

    // Step 2: start a new game using those custom teams.
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Switch to Custom Teams tab.
    await page.getByTestId("new-game-custom-teams-tab").click();

    // The two custom team selects should now be visible.
    const awaySelect = page.getByTestId("new-game-custom-away-team-select");
    const homeSelect = page.getByTestId("new-game-custom-home-team-select");
    await expect(awaySelect).toBeVisible({ timeout: 5_000 });
    await expect(homeSelect).toBeVisible({ timeout: 5_000 });

    // Wait until the selects are populated with our two custom teams.
    // (useCustomTeams loads asynchronously; options appear once it resolves.)
    // The auto-selection in NewGameDialog already picks the first two teams —
    // no explicit selectOption call needed, avoiding fragile label matching.
    await expect(awaySelect.locator("option")).toHaveCount(2, { timeout: 5_000 });
    await expect(homeSelect.locator("option")).toHaveCount(2, { timeout: 5_000 });

    // Fill seed for determinism.
    await page.getByTestId("seed-input").fill("saves-visual1");

    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });

    // Wait for a few log lines so the game is progressing.
    await waitForLogLines(page, 5);

    // Step 3: save the game.
    await saveCurrentGame(page);

    // Step 4: snapshot the saves modal — modal stays open after saving.
    await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 5_000 });

    // Verify no raw IDs are visible in the modal (non-visual assertion).
    const modalText = await page.getByTestId("saves-modal").textContent();
    expect(modalText).not.toMatch(/custom:ct_/);

    await expect(page.getByTestId("saves-modal")).toHaveScreenshot(
      "saves-modal-with-custom-team-row.png",
      {
        mask: [page.getByTestId("slot-date")],
        maxDiffPixelRatio: 0.05,
      },
    );
  });
});

// ─── 7. Starting pitcher selector in New Game dialog ─────────────────────────
//
// Captures the pitcher-selection UI that appears in the New Game dialog when
// a user starts a managed custom-team game. Desktop-only since this UI element
// renders identically across viewport sizes.
test.describe("Visual — Starting pitcher selector in New Game dialog", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Shows the starting pitcher dropdown that appears when a user chooses
   * to manage a custom team. The dropdown only shows SP-eligible pitchers.
   */
  test("starting pitcher selector visible for managed custom game (desktop)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Starting pitcher selector snapshot is desktop-only",
    );

    // Create two custom teams with pitchers (generateDefaultTeam creates an SP + bullpen).
    await createAndSaveTeam(page, "Pitcher Test Home");
    await createAndSaveTeam(page, "Pitcher Test Away");

    // Open the New Game dialog.
    await page.getByTestId("home-new-game-button").click();
    await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 10_000 });

    // Switch to Custom Teams tab.
    await page.getByTestId("new-game-custom-teams-tab").click();

    // Wait for both custom team selects to populate.
    const awaySelect = page.getByTestId("new-game-custom-away-team-select");
    const homeSelect = page.getByTestId("new-game-custom-home-team-select");
    await expect(awaySelect).toBeVisible({ timeout: 5_000 });
    await expect(homeSelect).toBeVisible({ timeout: 5_000 });
    await expect(awaySelect.locator("option")).toHaveCount(2, { timeout: 5_000 });

    // Select the away team as managed to trigger the pitcher selector.
    await page.locator('input[name="managed"][value="0"]').check();

    // The starting pitcher selector should appear.
    await expect(page.getByTestId("starting-pitcher-select")).toBeVisible({ timeout: 3_000 });

    // Snapshot the New Game dialog with the pitcher selector visible.
    await expect(page.getByTestId("new-game-dialog")).toHaveScreenshot(
      "new-game-dialog-with-pitcher-selector.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});

// ─── 8. Pinch hitter player dropdown in Decision Panel ───────────────────────
//
// Captures the player-selection dropdown inside the DecisionPanel when a
// pinch-hitter opportunity arises in a managed custom-team game.
// Uses a pre-crafted save fixture so the panel is visible immediately —
// no autoplay or real-time game progression needed.
// Restricted to desktop only.
test.describe("Visual — Pinch hitter player dropdown in Decision Panel", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  /**
   * Loads a fixture whose stateSnapshot has pendingDecision set to a
   * pinch_hitter decision with two named bench candidates.  Because the
   * fixture also carries managerMode=true, the DecisionPanel mounts
   * instantly and shows the player-selection dropdown.
   */
  test("pinch hitter player dropdown visible in Decision Panel (desktop)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Pinch hitter dropdown snapshot is desktop-only",
    );

    await loadFixture(page, "pending-decision-pinch-hitter.json");
    // The fixture has pendingDecision=pinch_hitter with candidates, so the
    // player-selection dropdown is visible immediately after load.
    await expect(page.getByTestId("pinch-hitter-select")).toBeVisible({ timeout: 10_000 });

    // Snapshot the decision panel with the dropdown visible.
    await expect(page.getByTestId("manager-decision-panel")).toHaveScreenshot(
      "manager-decision-panel-pinch-hitter-dropdown.png",
      { maxDiffPixelRatio: 0.05 },
    );
  });
});
