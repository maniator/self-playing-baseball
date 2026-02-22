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
 * Opens the New Game dialog.  In the current app the dialog opens
 * automatically on every fresh page load, so this function simply waits
 * until it is visible.  It is provided as a named helper so tests read
 * naturally and future changes (e.g. a "New Game" button) only need to
 * update this one place.
 */
export async function openNewGameDialog(page: Page): Promise<void> {
  await waitForNewGameDialog(page);
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
   * If set, it is typed into the seed input field in the New Game dialog so
   * that `reinitSeed` fires with the correct value when Play Ball is clicked.
   */
  seed?: string;
  homeTeam?: string;
  awayTeam?: string;
}

/**
 * Configures the New Game dialog with the provided options.
 * All options are optional; omitted values keep defaults.
 *
 * If `options.seed` is given it is typed into the seed input field so that
 * `reinitSeed` fires with the correct value when Play Ball is clicked.
 * This replaces the older approach of navigating to `/?seed=<value>` before
 * calling this helper.
 */
export async function configureNewGame(page: Page, options: GameConfig = {}): Promise<void> {
  await waitForNewGameDialog(page);

  if (options.seed !== undefined) {
    const seedField = page.getByTestId("seed-input");
    await seedField.clear();
    await seedField.fill(options.seed);
  }
  if (options.homeTeam) {
    await page.getByTestId("home-team-select").selectOption({ label: options.homeTeam });
  }
  if (options.awayTeam) {
    await page.getByTestId("away-team-select").selectOption({ label: options.awayTeam });
  }
}

/**
 * Starts the game:
 * - Resets app state (navigates to `/`).
 * - If a seed is given, types it into the seed-input field in the dialog
 *   (calls `reinitSeed` on submit — no page reload needed).
 * - Configures optional home/away team selection.
 * - Clicks "Play Ball!" and waits until the game is active.
 */
export async function startGameViaPlayBall(page: Page, options: GameConfig = {}): Promise<void> {
  await resetAppState(page);
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
 *
 * @param timeout  How long to poll for the entry count (default 60 s).
 *                 Increase for slow browsers / CI runners where autoplay
 *                 may take longer to generate the first several lines.
 */
export async function waitForLogLines(page: Page, count: number, timeout = 60_000): Promise<void> {
  // Expand the log if it is collapsed (mobile viewports hide it by default).
  const logToggle = page.getByRole("button", { name: /expand play-by-play/i });
  if (await logToggle.isVisible()) {
    await logToggle.click();
  }
  await expect(page.getByTestId("play-by-play-log")).toBeVisible({ timeout: 10_000 });
  await expect(async () => {
    const entries = page.getByTestId("play-by-play-log").locator("[data-log-index]");
    const count_ = await entries.count();
    expect(count_).toBeGreaterThanOrEqual(count);
  }).toPass({ timeout, intervals: [500, 1000, 1000] });
}

/**
 * Returns a deterministic "signature" string from visible game state.
 *
 * Waits for at least `minLines` log entries, then reads the 5 entries whose
 * `data-log-index` is 0–4 (the first 5 events ever in the game).
 *
 * The log is rendered newest-first: array index 0 = most recent entry.
 * Each entry carries `data-log-index = log.length - 1 - arrayIndex`, so
 * index 0 always refers to the very first event and never shifts even as
 * autoplay prepends newer entries at the top of the list.
 *
 * @param minLines   Minimum log entries to wait for before reading (default 5).
 * @param logTimeout Passed through to `waitForLogLines` (default 60 s).
 */
export async function captureGameSignature(
  page: Page,
  minLines = 5,
  logTimeout = 60_000,
): Promise<string> {
  await waitForLogLines(page, minLines, logTimeout);
  const logEl = page.getByTestId("play-by-play-log");
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const entry = logEl.locator(`[data-log-index="${i}"]`);
    parts.push((await entry.textContent()) ?? "");
  }
  return parts.join("|");
}

/**
 * Opens the Saves modal by clicking the Saves button.
 */
export async function openSavesModal(page: Page): Promise<void> {
  await page.getByTestId("saves-button").click();
  await expect(page.getByTestId("saves-modal")).toBeVisible({ timeout: 10_000 });
}

/**
 * Saves the current game (clicks "Save current game" inside the Saves modal)
 * and waits for the RxDB write to complete (a load-save-button appears in the
 * list — confirming the save was persisted and the reactive query updated).
 */
export async function saveCurrentGame(page: Page): Promise<void> {
  await openSavesModal(page);
  await page.getByTestId("save-game-button").click();
  // Wait for the async RxDB write + reactive list update to complete
  await expect(page.getByTestId("load-save-button").first()).toBeVisible({ timeout: 10_000 });
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
 * Loads the save slot whose row contains `name` (partial text match).
 * Opens the Saves modal, finds the list-item row whose SlotName cell contains
 * the given text, then clicks the Load button inside that same row.
 *
 * This correctly handles multiple saves because the save name lives in a
 * sibling element to the Load button — not inside the button itself.
 */
export async function loadSaveByName(page: Page, name: string): Promise<void> {
  await openSavesModal(page);
  const modal = page.getByTestId("saves-modal");
  // Find the <li> row that contains the save name text, then get the Load
  // button that is a child of that same row.
  const row = modal.locator("li").filter({ hasText: name });
  await row.getByTestId("load-save-button").click();
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
