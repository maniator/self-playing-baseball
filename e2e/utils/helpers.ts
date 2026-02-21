import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import path from "path";

// ─── Constants ───────────────────────────────────────────────────────────────

export const FIXTURES_DIR = path.join(__dirname, "../fixtures");

/** Fixed seed for deterministic tests (base-36 string). */
export const FIXED_SEED = "abc";

/** How many play-by-play log lines to wait for before capturing a signature. */
export const SIGNATURE_LOG_LINES = 5;

/** Timeout for waiting for manager decision (ms). */
export const MANAGER_DECISION_TIMEOUT = 60_000;

// ─── State Reset ─────────────────────────────────────────────────────────────

/**
 * Clears localStorage, sessionStorage, and all IndexedDB databases so each
 * test starts from a clean slate.  Also unregisters any service workers.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    // Clear all IndexedDB databases (RxDB uses IndexedDB)
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          ({ name }) =>
            new Promise<void>((resolve) => {
              if (!name) {
                resolve();
                return;
              }
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
      );
    }

    // Unregister service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Navigates to the app with a fixed seed, resets persisted state, then
 * reloads so the app boots clean with no saved data.
 */
export async function gotoFreshApp(page: Page, seed = FIXED_SEED): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await page.waitForLoadState("domcontentloaded");
  await resetAppState(page);
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

// ─── New Game Dialog ──────────────────────────────────────────────────────────

/** Waits for the New Game dialog to be visible. */
export async function waitForNewGameDialog(page: Page): Promise<void> {
  await expect(page.getByTestId("new-game-dialog")).toBeVisible({ timeout: 15_000 });
}

/**
 * Configures New Game dialog options (all optional; app defaults apply).
 */
export async function configureNewGame(
  page: Page,
  options: { homeTeam?: string; awayTeam?: string; managedTeam?: "none" | "0" | "1" } = {},
): Promise<void> {
  if (options.homeTeam) {
    await page.getByTestId("home-team-select").selectOption(options.homeTeam);
  }
  if (options.awayTeam) {
    await page.getByTestId("away-team-select").selectOption(options.awayTeam);
  }
  const managed = options.managedTeam ?? "none";
  await page.getByTestId(`managed-team-radio-${managed}`).check();
}

/** Clicks "Play Ball!" and waits for the dialog to close. */
export async function clickPlayBall(page: Page): Promise<void> {
  await page.getByTestId("play-ball-button").click();
  await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Full convenience helper: fresh app → configure → start.
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

/** Expands the play-by-play log (if collapsed) then waits for ≥ count entries. */
export async function waitForAtLeastLogLines(page: Page, count: number): Promise<void> {
  const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
  if (await expandBtn.isVisible()) await expandBtn.click();

  await page.waitForFunction(
    (n: number) =>
      document.querySelectorAll('[data-testid="announcements"] [data-testid="log-entry"]').length >=
      n,
    count,
    { timeout: 30_000 },
  );
}

// ─── Game Signature ───────────────────────────────────────────────────────────

export interface GameSignature {
  scores: string;
  bso: string;
  logLines: string[];
}

/**
 * Captures a deterministic snapshot of game state (score + BSO + first N log lines).
 */
export async function captureGameSignature(
  page: Page,
  logLineCount = SIGNATURE_LOG_LINES,
): Promise<GameSignature> {
  const expandBtn = page.getByRole("button", { name: "Expand play-by-play" });
  if (await expandBtn.isVisible()) await expandBtn.click();

  await expect(
    page.locator('[data-testid="announcements"] [data-testid="log-entry"]').first(),
  ).toBeVisible({ timeout: 30_000 });

  const entries = page.locator('[data-testid="announcements"] [data-testid="log-entry"]');
  const total = Math.min(logLineCount, await entries.count());
  const logLines: string[] = [];
  for (let i = 0; i < total; i++) {
    logLines.push((await entries.nth(i).textContent()) ?? "");
  }

  const scores = (await page.getByTestId("line-score").textContent()) ?? "";
  const bso =
    (await page
      .getByTestId("bso-row")
      .textContent()
      .catch(() => "")) ?? "";

  return { scores: scores.trim(), bso: bso.trim(), logLines };
}

// ─── Saves Modal ──────────────────────────────────────────────────────────────

/** Opens the Saves modal and waits for it to be visible. */
export async function openSavesModal(page: Page): Promise<void> {
  await page.getByTestId("saves-button").click();
  await expect(page.getByTestId("saves-dialog")).toBeVisible({ timeout: 5_000 });
}

/** Closes the Saves modal. */
export async function closeSavesModal(page: Page): Promise<void> {
  await page.getByTestId("close-saves-button").click();
  await expect(page.getByTestId("saves-dialog")).not.toBeVisible({ timeout: 5_000 });
}

/** Saves (or updates) the current game from inside the Saves modal. */
export async function saveCurrentGame(page: Page): Promise<void> {
  await page.getByTestId("save-current-button").click();
}

/** Loads a save by its displayed name (clicks the first matching Load button). */
export async function loadSaveByName(page: Page, name: string): Promise<void> {
  const row = page
    .getByTestId("saves-list")
    .locator('[data-testid="save-item"]')
    .filter({ hasText: name })
    .first();
  await row.getByRole("button", { name: "Load" }).first().click();
}

/** Imports a save JSON file via the file-input in the Saves modal. */
export async function importSaveFile(page: Page, fixturePath: string): Promise<void> {
  await page.getByTestId("import-file-input").setInputFiles(fixturePath);
}

/** Imports a save by pasting JSON text in the Saves modal. */
export async function importSavePaste(page: Page, json: string): Promise<void> {
  await page.getByTestId("import-json-textarea").fill(json);
  await page.getByTestId("import-from-text-button").click();
}

// ─── Manager Mode ─────────────────────────────────────────────────────────────

/** Waits for the manager decision panel to appear (bounded timeout). */
export async function waitForManagerDecision(
  page: Page,
  timeoutMs = MANAGER_DECISION_TIMEOUT,
): Promise<void> {
  await expect(page.getByTestId("decision-panel")).toBeVisible({ timeout: timeoutMs });
}

/** Clicks a manager action button by its visible label text. */
export async function takeManagerAction(page: Page, actionLabel: string): Promise<void> {
  await page.getByTestId("decision-panel").getByRole("button", { name: actionLabel }).click();
}

// ─── Layout Assertions ────────────────────────────────────────────────────────

/** Asserts scoreboard + field are visible and have non-zero dimensions. */
export async function assertCoreLayoutVisible(page: Page): Promise<void> {
  await expect(page.getByTestId("line-score")).toBeVisible();
  await expect(page.getByTestId("field")).toBeVisible();

  const fieldBox = await page.getByTestId("field").boundingBox();
  expect(fieldBox).not.toBeNull();
  expect(fieldBox!.width).toBeGreaterThan(50);
  expect(fieldBox!.height).toBeGreaterThan(50);
}

// ─── Visual Snapshots ─────────────────────────────────────────────────────────

/** Injects CSS that kills all transitions/animations for stable screenshots. */
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
