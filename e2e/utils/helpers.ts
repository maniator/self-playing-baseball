import { expect, type Locator, type Page } from "@playwright/test";
import path from "path";

/**
 * Speed value that effectively pauses autoplay (9 999 999 ms/pitch).
 * Set via `page.addInitScript` before loading a fixture to prevent rapid
 * game re-renders from detaching UI elements during E2E test setup flows.
 */
export const EFFECTIVELY_PAUSED_SPEED = "9999999";

/**
 * Clicks a locator using dispatchEvent inside a retry loop until `assertion`
 * passes.  Pass a `guard` predicate to skip the click when it is not needed
 * (e.g. the target state is already reached).
 *
 * This is needed when the click target can cycle between detach/reattach
 * during React re-renders on slow WebKit viewports — a direct .click() would
 * exceed Playwright's 90 s actionability timeout in those conditions.
 */
async function dispatchClickUntil(
  locator: Locator,
  assertion: () => Promise<void>,
  options?: { guard?: () => Promise<boolean>; timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 30_000;
  await expect(async () => {
    const shouldClick = options?.guard ? await options.guard() : true;
    if (shouldClick) {
      try {
        await locator.dispatchEvent("click", {}, { timeout: 2_000 });
      } catch {
        // Element was mid-detach — the outer retry will try again.
      }
    }
    await assertion();
  }).toPass({ timeout });
}

/**
 * Registers an `addInitScript` that mutes announcement volume exactly once per
 * `Page` instance. Safe to call from any helper — duplicates are a no-op.
 *
 * Muting speeds up tests: without it the scheduler waits up to 8 s for Web
 * Speech API announcements to finish before each pitch.
 */
async function ensureMutedAnnouncementsInit(page: Page): Promise<void> {
  const typedPage = page as Page & { _ballgameAnnouncementInitAdded?: boolean };
  if (!typedPage._ballgameAnnouncementInitAdded) {
    await page.addInitScript(() => {
      localStorage.setItem("announcementVolume", "0");
    });
    typedPage._ballgameAnnouncementInitAdded = true;
  }
}

/**
 * Registers an `addInitScript` that suppresses demo-team seeding exactly once
 * per `Page` instance.  Safe to call from any helper — duplicates are a no-op.
 *
 * Sets the `ballgame:demoSeedDone` localStorage key before the app loads so
 * `useSeedDemoTeams` skips its first-launch write.  Each Playwright test gets a
 * fresh BrowserContext (fresh localStorage), so this suppression applies only
 * to the current test's page and does not carry over.
 *
 * Without this guard every `resetAppState` call would seed the two demo teams,
 * breaking tests that rely on an empty custom-teams collection.
 */
async function ensureDemoSeedSuppressed(page: Page): Promise<void> {
  const typedPage = page as Page & { _ballgameDemoSeedSuppressed?: boolean };
  if (!typedPage._ballgameDemoSeedSuppressed) {
    await page.addInitScript(() => {
      // Key must stay in sync with DEMO_SEED_DONE_KEY in
      // src/shared/hooks/useSeedDemoTeams.ts.  Direct import is not possible
      // here because the e2e/ tsconfig clears @shared/* path aliases and the
      // hook depends on browser-only modules that cannot run in Node.js.
      try {
        localStorage.setItem("ballgame:demoSeedDone", "1");
      } catch {
        // localStorage may be blocked in some browser security configurations;
        // the demo-seeding hook handles the missing flag gracefully.
      }
    });
    typedPage._ballgameDemoSeedSuppressed = true;
  }
}

/**
 * Navigates to the app root and waits for it to finish loading (DB ready).
 * Each Playwright test runs in a fresh BrowserContext so IndexedDB and
 * localStorage are already isolated — no manual cleanup is needed.
 *
 * By default, mutes announcement volume to speed up tests — the scheduler
 * otherwise waits up to 8 seconds for speech announcements to complete.
 */
export async function resetAppState(page: Page): Promise<void> {
  // Mute announcement volume BEFORE navigation so React picks it up on mount.
  await ensureMutedAnnouncementsInit(page);
  // Suppress demo-team seeding so tests always start with an empty teams
  // collection and don't have to clean up seeded data.
  await ensureDemoSeedSuppressed(page);

  const home = page.getByTestId("home-screen");
  const loading = page.getByText("Loading game…");
  const debugConsole: string[] = [];
  const debugPageErrors: string[] = [];

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (debugConsole.length < 10) {
      debugConsole.push(`${message.type()}: ${message.text()}`);
    }
  };
  const onPageError = (error: Error) => {
    if (debugPageErrors.length < 10) {
      debugPageErrors.push(error.message);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  // Mobile WebKit can be slow to paint the first route under full parallel E2E load.
  // Retry navigation once before failing to reduce startup flakes.
  // Listeners are always removed in `finally` so repeated calls don't accumulate them.
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      try {
        await expect(home.or(loading)).toBeVisible({ timeout: 30_000 });
        await expect(loading).not.toBeVisible({ timeout: 30_000 });
        await expect(home).toBeVisible({ timeout: 30_000 });
        return;
      } catch (err) {
        if (attempt === 1) {
          const url = page.url();
          const title = await page.title().catch(() => "<no-title>");
          const bodyText = await page
            .locator("body")
            .innerText()
            .then((txt) => txt.slice(0, 500))
            .catch(() => "<no-body-text>");
          const htmlSnippet = await page
            .content()
            .then((html) => html.slice(0, 1000))
            .catch(() => "<no-html>");

          const consoleLog = debugConsole.length > 0 ? `console=[${debugConsole.join("; ")}]` : "";
          const errorLog =
            debugPageErrors.length > 0 ? `errors=[${debugPageErrors.join("; ")}]` : "";

          throw new Error(
            `resetAppState failed after 2 attempts. url=${url} title=${title} body=${bodyText} html=${htmlSnippet} ${consoleLog} ${errorLog}`,
            { cause: err as Error },
          );
        }
        await page.waitForTimeout(500);
      }
    }
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
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
 * Waits until the New Game setup UI is visible on screen.
 * With the react-router setup, clicking "New Game" from Home navigates to
 * `/exhibition/new` (an `exhibition-setup-page`). For the in-game New Game
 * button, a `new-game-dialog` opens instead — both are handled here.
 */
export async function waitForNewGameDialog(page: Page): Promise<void> {
  const setupUi = page.getByTestId("exhibition-setup-page").or(page.getByTestId("new-game-dialog"));

  await expect(page.getByTestId("home-screen").or(setupUi)).toBeVisible({ timeout: 15_000 });

  // Only navigate if we're on the home screen AND the setup UI hasn't already appeared
  // (i.e., the caller may have already clicked the button and navigation is underway).
  const homeVisible = await page.getByTestId("home-screen").isVisible();
  const setupVisible = await setupUi.isVisible();
  if (homeVisible && !setupVisible) {
    await page.getByTestId("home-new-game-button").click();
    // Wait for the DB loading screen to clear, then wait for the setup UI.
    await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
  }

  await expect(setupUi).toBeVisible({ timeout: 15_000 });
}

/**
 * Programmatically closes the New Game setup UI.
 * On `/exhibition/new` (primary flow) this navigates back via the back button.
 * For the in-game dialog it closes the `<dialog>` element.
 */
export async function closeNewGameDialog(page: Page): Promise<void> {
  if (await page.getByTestId("exhibition-setup-page").isVisible()) {
    await page.getByTestId("new-game-back-home-button").click();
    await expect(page.getByTestId("exhibition-setup-page")).not.toBeVisible({ timeout: 15_000 });
  } else {
    await page.evaluate(() => {
      const dialog = document.querySelector(
        '[data-testid="new-game-dialog"]',
      ) as HTMLDialogElement | null;
      dialog?.close();
    });
    await expect(page.getByTestId("new-game-dialog")).not.toBeVisible({ timeout: 15_000 });
  }
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
  /**
   * Select a managed team radio in the New Game dialog ("0" = away, "1" = home).
   * When set, the dialog calls `setManagerMode(true)` so manager mode is active
   * from the very first pitch — no localStorage pre-seeding required.
   */
  managedTeam?: "0" | "1";
}

/**
 * Configures the New Game dialog with the provided options.
 * All options are optional; omitted values keep defaults.
 *
 * If `options.seed` is given it is typed into the seed input field so that
 * `reinitSeed` fires with the correct value when Play Ball is clicked.
 */
export async function configureNewGame(page: Page, options: GameConfig = {}): Promise<void> {
  await waitForNewGameDialog(page);

  if (options.seed !== undefined) {
    const seedField = page.getByTestId("seed-input");
    await seedField.clear();
    await seedField.fill(options.seed);
  }
  if (options.managedTeam !== undefined) {
    // Click the radio button for the chosen managed team.
    await page.locator(`input[name="managed"][value="${options.managedTeam}"]`).check();
  }
}

/**
 * Ensures at least two custom teams exist for tests that need to start a custom exhibition game.
 * Uses the "Regenerate Defaults" button to fill in all required fields automatically,
 * so teams get auto-generated names (e.g. "Springfield Foxes") rather than fixed names.
 * Skips creation if two or more teams already exist.
 */
export async function createDefaultCustomTeamsForTest(page: Page): Promise<void> {
  // Mute announcer to speed up tests.
  await ensureMutedAnnouncementsInit(page);
  // Suppress demo-team seeding so only explicitly created teams are present.
  await ensureDemoSeedSuppressed(page);
  await page.goto("/teams");
  await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });

  const existingTeams = page.getByTestId("custom-team-list-item");
  const count = await existingTeams.count();
  if (count >= 2) {
    // Already have enough teams — skip creation but still return to home for callers.
    await page.goto("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    return;
  }

  const teamsToCreate = 2 - count;
  for (let i = 0; i < teamsToCreate; i++) {
    await page.getByTestId("manage-teams-create-button").click();
    await expect(page.getByTestId("custom-team-name-input")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("custom-team-regenerate-defaults-button").click();
    // Wait until regeneration populates the name field before saving
    await expect(page.getByTestId("custom-team-name-input")).not.toHaveValue("", {
      timeout: 5_000,
    });
    await page.getByTestId("custom-team-save-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 10_000 });
  }

  // Return to home
  await page.goto("/");
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
}

/**
 * Starts the game:
 * - Resets app state (navigates to `/`).
 * - Imports fixture teams via {@link importTeamsFixture} (fast and reliable across all viewports).
 * - If a seed is given, types it into the seed-input field in the dialog
 *   (calls `reinitSeed` on submit — no page reload needed).
 * - Clicks "Play Ball!" and waits until the game is active.
 */
export async function startGameViaPlayBall(page: Page, options: GameConfig = {}): Promise<void> {
  await resetAppState(page);
  // Import pre-built fixture teams — faster and more reliable than creating through the UI,
  // especially on mobile WebKit where async save navigation can be slow.
  await importTeamsFixture(page, "fixture-teams.json");
  await page.goto("/exhibition/new");
  await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });
  await configureNewGame(page, options);
  // Wait for both team selects to have non-empty values before clicking Play Ball.
  // The selects become visible as soon as customTeams.length > 0, but the useEffect
  // that sets customAwayId/customHomeId runs *after* the browser paint (React passive
  // effect).  On slow WebKit CI runners there is a window where the selects are visible
  // but both IDs are still "" — handleSubmit then fails with "Select valid away and home
  // teams" and the page stays stuck.  Both IDs are set in the same React effect batch,
  // so waiting for the away select is sufficient; we guard the home select too for
  // explicit clarity and defense-in-depth.
  await expect(page.getByTestId("new-game-custom-away-team-select")).not.toHaveValue("", {
    timeout: 20_000,
  });
  await expect(page.getByTestId("new-game-custom-home-team-select")).not.toHaveValue("", {
    timeout: 5_000, // away already resolved; home is set in the same effect batch
  });
  await page.getByTestId("play-ball-button").click();
  // The setup UI should disappear after starting.
  // Use a generous timeout: on CI WebKit/tablet runners, IndexedDB initialisation
  // can take 15+ seconds on first open, causing this to flake at 10 s.
  await expect(
    page.getByTestId("exhibition-setup-page").or(page.getByTestId("new-game-dialog")),
  ).not.toBeVisible({ timeout: 25_000 });
  // Wait for scoreboard to appear
  await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
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
 *
 * Uses a retry loop with dispatchEvent to handle the case where the button
 * cycles between detach/reattach during initial game-mount re-renders on slow
 * WebKit viewports — a direct .click() would exceed the 90 s actionability
 * timeout in those conditions.
 */
export async function openSavesModal(page: Page): Promise<void> {
  const savesBtn = page.getByTestId("saves-button");
  const savesModal = page.getByTestId("saves-modal");
  await savesBtn.waitFor({ state: "visible", timeout: 15_000 });
  await dispatchClickUntil(
    savesBtn,
    async () => {
      await expect(savesModal).toBeVisible({ timeout: 2_000 });
    },
    { guard: async () => !(await savesModal.isVisible()) },
  );
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
 *
 * Requires a game to already be active (saves-button visible).
 * For loading from the Home screen, use {@link loadFixture} instead.
 */
export async function importSaveFromFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await openSavesModal(page);
  await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
  // Auto-load closes the modal after a successful import
  await expect(page.getByTestId("saves-modal")).not.toBeVisible({ timeout: 10_000 });
}

/**
 * Loads a pre-crafted save fixture directly from the Home screen.
 *
 * Navigates to `/`, enters the game via "Load Saved Game", imports the
 * fixture JSON via the file input in the Saves modal, waits for the
 * auto-load to restore game state, and confirms the scoreboard is visible.
 *
 * **Self-contained** — callers do not need to call `resetAppState` first;
 * this helper always starts from `/` so the Home screen is guaranteed.
 *
 * Use this instead of `startGameViaPlayBall` + long wait whenever the test
 * needs a specific game situation (e.g. a pending manager decision, RBI values
 * already on the board, a specific inning/count).  The fixture's embedded
 * `stateSnapshot` is applied immediately — no autoplay or real-time
 * progression required.
 *
 * Fixtures live in `e2e/fixtures/` and must carry a valid FNV-1a signature
 * computed by `fnv1a("ballgame:rxdb:v1" + JSON.stringify({header, events}))`.
 * See the "Save Fixtures for E2E Testing" section in
 * `.github/copilot-instructions.md` for the full authoring guide.
 *
 * @param teamsFixtureName  Teams export file to import before loading the save.
 *   Defaults to `"fixture-teams.json"`. Pass a different file when the save
 *   fixture references team IDs that are not in the standard fixture-teams bundle
 *   (e.g. `"pending-decision-pinch-hitter-teams.json"` for the pinch-hitter fixture).
 */
export async function loadFixture(
  page: Page,
  fixtureName: string,
  teamsFixtureName = "fixture-teams.json",
): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  // Mute announcer to speed up tests.
  await ensureMutedAnnouncementsInit(page);
  // Suppress demo-team seeding so only fixture teams are present.
  await ensureDemoSeedSuppressed(page);
  // Import fixture teams first so the save's custom team IDs pass validation.
  // Callers may pass a custom teams fixture when the save references non-standard team IDs.
  await importTeamsFixture(page, teamsFixtureName);
  // Always start from the Home screen so this helper is self-contained.
  // Callers do not need to call resetAppState beforehand.
  await page.goto("/");
  await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
  // "Load Saved Game" navigates to the /saves page route.
  await page.getByTestId("home-load-saves-button").click();
  await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 15_000 });
  // Import the fixture — auto-load replaces game state and navigates to /game.
  await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
  // Confirm the game shell is now active.
  await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
}

/**
 * Imports a custom teams export fixture via the Manage Teams screen.
 *
 * Navigates to Home → Manage Teams (`/teams`), uploads the fixture through
 * the `import-teams-file-input` file input, and waits for the success message.
 * Call this **before** `loadFixture` whenever the save fixture references custom
 * team IDs that must be present in the DB prior to save import (the strict
 * custom-team validation in `importRxdbSave` rejects saves whose team IDs are
 * missing from the local DB).
 *
 * The helper always starts from `/` so callers do not need to call
 * `resetAppState` beforehand.
 */
export async function importTeamsFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  // Mute announcer to speed up tests.
  await ensureMutedAnnouncementsInit(page);
  // Suppress demo-team seeding so only fixture teams are present.
  await ensureDemoSeedSuppressed(page);
  await page.goto("/");
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("home-manage-teams-button").click();
  await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("import-teams-file-input").setInputFiles(fixturePath);
  await expect(page.getByTestId("import-teams-success")).toBeVisible({ timeout: 15_000 });
  // Always return to the home screen so callers can proceed without an explicit goto("/").
  await page.goto("/");
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
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

/**
 * Asserts that the key in-game UI surfaces contain no raw `custom:` or `ct_`
 * ID fragments — all custom team references must be resolved to friendly names
 * before reaching the user.
 *
 * Checks: scoreboard, play-by-play log, hit log (if visible).
 */
export async function expectNoRawIdsVisible(page: Page): Promise<void> {
  const RAW_ID_PATTERN = /custom:|ct_[a-z0-9]/i;

  const scoreboardText = await page.getByTestId("scoreboard").textContent();
  expect(scoreboardText ?? "").not.toMatch(RAW_ID_PATTERN);

  const logEl = page.getByTestId("play-by-play-log");
  if (await logEl.isVisible()) {
    const logText = await logEl.textContent();
    expect(logText ?? "").not.toMatch(RAW_ID_PATTERN);
  }

  const hitLogEl = page.getByTestId("hit-log");
  if (await hitLogEl.isVisible()) {
    const hitLogText = await hitLogEl.textContent();
    expect(hitLogText ?? "").not.toMatch(RAW_ID_PATTERN);
  }
}

/**
 * Computes the FNV-1a 32-bit signature for a save export bundle.
 * Uses page.evaluate so it runs the same algorithm in the browser context,
 * matching the implementation in saveStore.ts.
 */
export async function computeSaveSignature(
  page: Page,
  header: unknown,
  events: unknown[],
): Promise<string> {
  return page.evaluate(
    ([h, ev]) => {
      const RXDB_EXPORT_KEY = "ballgame:rxdb:v1";
      let hash = 0x811c9dc5;
      const str = RXDB_EXPORT_KEY + JSON.stringify({ header: h, events: ev });
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      return hash.toString(16).padStart(8, "0");
    },
    [header, events] as const,
  );
}

/**
 * Computes the FNV-1a 32-bit bundle signature for a custom teams export payload.
 * Uses page.evaluate so the algorithm runs in the browser context, matching the
 * implementation in customTeamExportImport.ts.
 *
 * NOTE: The FNV-1a algorithm is intentionally inlined here rather than imported from
 * production code. `page.evaluate` serializes the function and runs it in the browser
 * process, which cannot access Node.js modules. Any change to the production `fnv1a`
 * implementation must be mirrored in both `computeSaveSignature` and this helper.
 */
export async function computeTeamsSignature(page: Page, payload: unknown): Promise<string> {
  return page.evaluate((p) => {
    const TEAMS_EXPORT_KEY = "ballgame:teams:v1";
    let hash = 0x811c9dc5;
    const str = TEAMS_EXPORT_KEY + JSON.stringify(p);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }, payload);
}

/**
 * Imports a game history export fixture via the SavesModal's history file-input.
 *
 * Requires a game to already be active (saves-button must be visible).  Call
 * `startGameViaPlayBall` (or `loadFixture`) first to enter a game session.
 *
 * History fixtures live in `e2e/fixtures/` and must carry a valid FNV-1a
 * signature: `fnv1a("ballgame:gameHistory:v1" + JSON.stringify(payload))`.
 */
export async function importHistoryFixture(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await openSavesModal(page);
  await page.getByTestId("import-history-file-input").setInputFiles(fixturePath);
  await expect(page.getByTestId("import-history-success")).toBeVisible({ timeout: 10_000 });
  // Use the same retry+dispatchEvent pattern for the close button — it can
  // also cycle detach/reattach on slow WebKit viewports while the history
  // import triggers background DB writes and game-state updates.
  const closeBtn = page.getByTestId("saves-modal-close-button");
  const modal = page.getByTestId("saves-modal");
  await dispatchClickUntil(
    closeBtn,
    async () => {
      await expect(modal).not.toBeVisible({ timeout: 2_000 });
    },
    { guard: async () => await modal.isVisible() },
  );
}

/**
 * Pauses the autoplay scheduler by clicking the pause/play button.
 * Only clicks if the game is not already paused (button shows ⏸, aria-label "Pause game").
 * After clicking, waits for the button to confirm the paused state (aria-label "Resume game").
 *
 * Call this after waitForLogLines to freeze game state before taking visual snapshots,
 * guaranteeing deterministic screenshot content regardless of autoplay timing.
 */
export async function pauseGame(page: Page): Promise<void> {
  const btn = page.getByTestId("pause-play-button");
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  const label = await btn.getAttribute("aria-label");
  if (label !== "Resume game") {
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", "Resume game", { timeout: 5_000 });
  }
}

/**
 * Resumes the autoplay scheduler by clicking the pause/play button.
 * Only clicks if the game is currently paused (button shows ▶, aria-label "Resume game").
 */
export async function resumeGame(page: Page): Promise<void> {
  const btn = page.getByTestId("pause-play-button");
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  const label = await btn.getAttribute("aria-label");
  if (label !== "Pause game") {
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", "Pause game", { timeout: 5_000 });
  }
}
