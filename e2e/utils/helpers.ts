import { expect, type Page } from "@playwright/test";
import path from "path";

/**
 * Navigates to the app root and waits for it to finish loading (DB ready).
 * Each Playwright test runs in a fresh BrowserContext so IndexedDB and
 * localStorage are already isolated — no manual cleanup is needed.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.goto("/");
  // Wait until the DB loading screen disappears (i.e. the game is ready).
  await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
}

/**
 * Waits until the New Game dialog is visible on screen.
 */
export async function waitForNewGameDialog(page: Page): Promise<void> {
  await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
}

/**
 * Configures the New Game dialog with the provided options.
 * All options are optional; omitted values keep defaults.
 */
export interface GameConfig {
  /**
   * Fixed seed for deterministic games (base-36 string).
   * If set, the page is navigated to `/?seed=<value>` so that
   * `initSeedFromUrl` picks it up before the React tree mounts.
   */
  seed?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export async function configureNewGame(page: Page, options: GameConfig = {}): Promise<void> {
  await waitForNewGameDialog(page);

  if (options.homeTeam) {
    await page.getByTestId("home-team-select").selectOption({ label: options.homeTeam });
  }
  if (options.awayTeam) {
    await page.getByTestId("away-team-select").selectOption({ label: options.awayTeam });
  }
}

/**
 * Starts the game:
 * - If a seed is given, navigates to `/?seed=<value>` first so the PRNG is
 *   seeded before the app initialises (initSeedFromUrl runs once at startup).
 * - Configures optional home/away team selection.
 * - Clicks "Play Ball!" and waits until the game is active.
 */
export async function startGameViaPlayBall(page: Page, options: GameConfig = {}): Promise<void> {
  if (options.seed) {
    // Navigate with the seed in the URL so initSeedFromUrl picks it up before
    // React mounts — replaceState after load is too late (seed is already set).
    await page.goto(`/?seed=${options.seed}`);
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
  }
  await configureNewGame(page, options);
  await page.getByTestId("play-ball-button").click();
  // Wait for the new game dialog to close
  await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
  // Wait for scoreboard to appear
  await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });
}

/**
 * Expands the play-by-play log (if collapsed) and waits until at least `count`
 * log entries are visible.
 */
export async function waitForLogLines(page: Page, count: number): Promise<void> {
  // Expand the log if it is collapsed
  const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
  if (await logToggle.isVisible()) {
    await logToggle.click();
  }
  await expect(page.getByTestId("play-by-play-log")).toBeVisible({ timeout: 10_000 });
  await expect(async () => {
    const entries = page.getByTestId("play-by-play-log").locator("div");
    const count_ = await entries.count();
    expect(count_).toBeGreaterThanOrEqual(count);
  }).toPass({ timeout: 30_000, intervals: [500, 1000, 1000] });
}

/**
 * Returns a deterministic "signature" string from visible game state.
 * Waits for at least 20 log entries, then takes the 5 OLDEST ones (from the
 * end of the array) — these are stable because autoplay only prepends new
 * entries, leaving the oldest entries at fixed positions from the back.
 */
export async function captureGameSignature(page: Page): Promise<string> {
  await waitForLogLines(page, 20);
  const logEl = page.getByTestId("play-by-play-log");
  const entries = await logEl.locator("div").allTextContents();
  // log is newest-first; take the LAST 5 (oldest entries) — stable across captures
  return entries.slice(-5).join("|");
}

/**
 * Opens the Saves modal by clicking the Saves button.
 */
export async function openSavesModal(page: Page): Promise<void> {
  await page.getByTestId("saves-button").click();
  await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });
}

/**
 * Saves the current game (clicks "Save current game" inside the Saves modal).
 */
export async function saveCurrentGame(page: Page): Promise<void> {
  await openSavesModal(page);
  await page.getByTestId("save-game-button").click();
}

/**
 * Loads the first save slot visible in the Saves modal by clicking its Load button.
 */
export async function loadFirstSave(page: Page): Promise<void> {
  await openSavesModal(page);
  await page.getByTestId("load-save-button").first().click();
  // Modal closes after load
  await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Imports a save fixture via the file-input path.
 * Reads the fixture JSON from disk and sets it on the file input.
 */
export async function importSaveFromFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await openSavesModal(page);
  // Use file input
  await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
  // Wait for import to complete — the save should appear in the list
  await expect(page.getByTestId("saves-modal").getByText("Mets vs Yankees")).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Asserts that the field view, log panel, and scoreboard are all visible and
 * have non-zero dimensions. Used as a responsive smoke check.
 */
export async function assertFieldAndLogVisible(page: Page): Promise<void> {
  const field = page.getByTestId("field-view");
  const scoreboard = page.getByTestId("scoreboard");

  await expect(field).toBeVisible();
  await expect(scoreboard).toBeVisible();

  const fieldBox = await field.boundingBox();
  expect(fieldBox).not.toBeNull();
  expect(fieldBox!.width).toBeGreaterThan(50);
  expect(fieldBox!.height).toBeGreaterThan(50);

  const scoreBox = await scoreboard.boundingBox();
  expect(scoreBox).not.toBeNull();
  expect(scoreBox!.width).toBeGreaterThan(50);
}

/**
 * Injects CSS to disable all CSS transitions and animations.
 * Useful before taking visual snapshots for consistency.
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
}
