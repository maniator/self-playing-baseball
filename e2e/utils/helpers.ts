import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import path from "path";

// ─── Constants ───────────────────────────────────────────────────────────────

export const FIXTURES_DIR = path.join(__dirname, "../fixtures");

/** Fixed seed for deterministic tests (base-36 string). */
export const FIXED_SEED = "abc";

/** URL with a fixed seed so PRNG is deterministic. */
export const SEED_URL = `/?seed=${FIXED_SEED}`;

/** How many play-by-play log lines to wait for before capturing a signature. */
export const SIGNATURE_LOG_LINES = 5;

/** Timeout for waiting for manager decision (ms). */
export const MANAGER_DECISION_TIMEOUT = 60_000;

// ─── State Reset ─────────────────────────────────────────────────────────────

/**
 * Clears localStorage, sessionStorage, and all IndexedDB databases so each
 * test starts from a clean slate.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Clear Web Storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear all IndexedDB databases
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          ({ name }) =>
            new Promise<void>((resolve, reject) => {
              if (!name) {
                resolve();
                return;
              }
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
              req.onblocked = () => resolve();
            }),
        ),
      );
    }

    // Unregister service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Navigates to the app with a fixed seed, waits for the page to be ready,
 * then resets app state (to clear any persisted data from a previous test run).
 */
export async function gotoFreshApp(page: Page, seed = FIXED_SEED): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await page.waitForLoadState("networkidle");
  await resetAppState(page);
  // Reload after clearing state so the app boots clean
  await page.reload();
  await page.waitForLoadState("networkidle");
}

// ─── New Game Dialog ──────────────────────────────────────────────────────────

/** Waits for the New Game dialog to be visible. */
export async function waitForNewGameDialog(page: Page): Promise<void> {
  await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
}

/**
 * Configures the New Game dialog options.
 * All parameters are optional; defaults match the app defaults.
 */
export async function configureNewGame(
  page: Page,
  options: {
    homeTeam?: string;
    awayTeam?: string;
    managedTeam?: "none" | "0" | "1";
  } = {},
): Promise<void> {
  const { managedTeam = "none" } = options;

  if (options.homeTeam) {
    await page.getByTestId("home-team-select").selectOption(options.homeTeam);
  }
  if (options.awayTeam) {
    await page.getByTestId("away-team-select").selectOption(options.awayTeam);
  }
  if (managedTeam !== "none") {
    await page.getByTestId(`managed-team-radio-${managedTeam}`).check();
  } else {
    await page.getByTestId("managed-team-radio-none").check();
  }
}

/**
 * Clicks "Play Ball!" and waits for the New Game dialog to close.
 */
export async function clickPlayBall(page: Page): Promise<void> {
  await page.getByTestId("play-ball-button").click();
  await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Full helper: reset state, open app with seed, configure and start game.
 */
export async function startGameViaPlayBall(
  page: Page,
  options: {
    seed?: string;
    homeTeam?: string;
    awayTeam?: string;
    managedTeam?: "none" | "0" | "1";
  } = {},
): Promise<void> {
  await gotoFreshApp(page, options.seed ?? FIXED_SEED);
  await waitForNewGameDialog(page);
  await configureNewGame(page, options);
  await clickPlayBall(page);
}

// ─── Play-by-play Log ─────────────────────────────────────────────────────────

/**
 * Expands the play-by-play log (if collapsed) and waits for at least `count`
 * log entries to appear.
 */
export async function waitForLogLines(page: Page, count: number): Promise<void> {
  // Expand if collapsed
  const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  }
  await expect(page.locator('[data-testid="announcements"] [data-testid="log-entry"]')).toHaveCount(
    count,
    { timeout: 30_000 },
  );
}

/**
 * Waits for AT LEAST `count` log entries without requiring exact count.
 */
export async function waitForAtLeastLogLines(page: Page, count: number): Promise<void> {
  // Expand if collapsed
  const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  }
  await expect(
    page.locator('[data-testid="announcements"] [data-testid="log-entry"]').first(),
  ).toBeVisible({ timeout: 30_000 });

  await page.waitForFunction(
    (n: number) => {
      const entries = document.querySelectorAll(
        '[data-testid="announcements"] [data-testid="log-entry"]',
      );
      return entries.length >= n;
    },
    count,
    { timeout: 30_000 },
  );
}

// ─── Game Signature ───────────────────────────────────────────────────────────

export interface GameSignature {
  scores: string;
  inning: string;
  logLines: string[];
}

/**
 * Captures a deterministic snapshot of the current game state for comparison.
 * Reads the line score, current inning, and the first few play-by-play entries.
 */
export async function captureGameSignature(
  page: Page,
  logLineCount = SIGNATURE_LOG_LINES,
): Promise<GameSignature> {
  // Expand play-by-play if needed
  const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  }

  // Wait for some log entries
  await expect(
    page.locator('[data-testid="announcements"] [data-testid="log-entry"]').first(),
  ).toBeVisible({ timeout: 30_000 });

  const logEntries = page.locator('[data-testid="announcements"] [data-testid="log-entry"]');
  const count = Math.min(logLineCount, await logEntries.count());
  const logLines: string[] = [];
  for (let i = 0; i < count; i++) {
    logLines.push(await logEntries.nth(i).textContent() ?? "");
  }

  const scores = await page.getByTestId("line-score").textContent() ?? "";
  const inning =
    (await page.getByTestId("bso-row").textContent().catch(() => "")) ?? "";

  return { scores: scores.trim(), inning: inning.trim(), logLines };
}

// ─── Saves Modal ──────────────────────────────────────────────────────────────

/** Opens the Saves modal. */
export async function openSavesModal(page: Page): Promise<void> {
  await page.getByTestId("saves-button").click();
  await expect(page.getByTestId("saves-dialog")).toBeVisible({ timeout: 5_000 });
}

/** Closes the Saves modal. */
export async function closeSavesModal(page: Page): Promise<void> {
  await page.getByTestId("close-saves-button").click();
  await expect(page.getByTestId("saves-dialog")).not.toBeVisible({ timeout: 5_000 });
}

/** Saves the current game from inside the Saves modal. */
export async function saveCurrentGame(page: Page): Promise<void> {
  await page.getByTestId("save-current-button").click();
}

/** Loads a save by its displayed name. */
export async function loadSaveByName(page: Page, name: string): Promise<void> {
  const row = page.getByTestId("saves-list").locator('[data-testid="save-item"]').filter({ hasText: name });
  await row.getByRole("button", { name: "Load" }).click();
}

/** Imports a save file via the file input in the Saves modal. */
export async function importSaveFile(page: Page, fixturePath: string): Promise<void> {
  await page.getByTestId("import-file-input").setInputFiles(fixturePath);
}

/** Imports a save via paste in the Saves modal. */
export async function importSavePaste(page: Page, json: string): Promise<void> {
  await page.getByTestId("import-json-textarea").fill(json);
  await page.getByTestId("import-from-text-button").click();
}

// ─── Manager Mode ─────────────────────────────────────────────────────────────

/**
 * Waits for the manager decision panel to appear.
 * Throws if no decision appears within the timeout.
 */
export async function waitForManagerDecision(
  page: Page,
  timeoutMs = MANAGER_DECISION_TIMEOUT,
): Promise<void> {
  await expect(page.getByTestId("decision-panel")).toBeVisible({ timeout: timeoutMs });
}

/**
 * Takes a manager action by clicking the button with the given text/label.
 */
export async function takeManagerAction(page: Page, actionLabel: string): Promise<void> {
  await page.getByTestId("decision-panel").getByRole("button", { name: actionLabel }).click();
}

// ─── Layout Assertions ────────────────────────────────────────────────────────

/**
 * Asserts that core game elements are visible and have non-zero dimensions.
 */
export async function assertCoreLayoutVisible(page: Page): Promise<void> {
  await expect(page.getByTestId("line-score")).toBeVisible();
  await expect(page.getByTestId("field")).toBeVisible();

  const fieldBox = await page.getByTestId("field").boundingBox();
  expect(fieldBox).not.toBeNull();
  expect(fieldBox!.width).toBeGreaterThan(50);
  expect(fieldBox!.height).toBeGreaterThan(50);
}

/**
 * Asserts that the log panel (hit log + announcements) is visible and scrollable.
 */
export async function assertLogPanelVisible(page: Page): Promise<void> {
  await expect(page.getByTestId("hit-log")).toBeVisible();
}

// ─── CSS Injection for Visual Tests ──────────────────────────────────────────

/**
 * Injects CSS to disable transitions and animations for stable visual snapshots.
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}
