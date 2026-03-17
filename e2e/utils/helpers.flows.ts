import { expect, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

import {
  configureNewGame,
  DEFAULT_E2E_SEED,
  dispatchClickUntil,
  ensureDemoSeedSuppressed,
  ensureMutedAnnouncementsInit,
  type GameConfig,
  resetAppState,
} from "./helpers.core";
import { expectNoRawIdsVisible } from "./helpers.gameplay";

/**
 * Ensures at least two deterministic custom teams exist for tests that need to
 * start a custom exhibition game.
 */
export async function createDefaultCustomTeamsForTest(page: Page): Promise<void> {
  await importTeamsFixture(page, "fixture-teams.json");
}

/**
 * Starts the game by importing default fixture teams, configuring setup, and
 * clicking Play Ball.
 */
export async function startGameViaPlayBall(page: Page, options: GameConfig = {}): Promise<void> {
  await resetAppState(page);
  await importTeamsFixture(page, "fixture-teams.json", { minTeams: 2 });
  await page.goto("/exhibition/new");
  await expect(page.getByTestId("exhibition-setup-page")).toBeVisible({ timeout: 10_000 });

  const awaySelect = page.getByTestId("new-game-custom-away-team-select");
  await expect(awaySelect).toBeVisible({ timeout: 30_000 });

  await configureNewGame(page, {
    seed: options.seed ?? DEFAULT_E2E_SEED,
    ...(options.managedTeam !== undefined ? { managedTeam: options.managedTeam } : {}),
  });

  await expect(page.getByTestId("new-game-custom-away-team-select")).not.toHaveValue("", {
    timeout: 20_000,
  });
  await expect(page.getByTestId("new-game-custom-home-team-select")).not.toHaveValue("", {
    timeout: 5_000,
  });

  const playBallButton = page.getByTestId("play-ball-button");
  const setupSurface = page
    .getByTestId("exhibition-setup-page")
    .or(page.getByTestId("new-game-dialog"));

  await dispatchClickUntil(
    playBallButton,
    async () => {
      await expect(setupSurface).not.toBeVisible({ timeout: 2_000 });
    },
    {
      guard: async () => await setupSurface.isVisible(),
      timeout: 30_000,
    },
  );

  await expect(setupSurface).not.toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
  await expectNoRawIdsVisible(page);
}

/**
 * Loads a pre-crafted save fixture directly from the Home screen.
 */
export async function loadFixture(
  page: Page,
  fixtureName: string,
  teamsFixtureName = "fixture-teams.json",
): Promise<void> {
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  await ensureMutedAnnouncementsInit(page);
  await ensureDemoSeedSuppressed(page);
  await importTeamsFixture(page, teamsFixtureName);

  await page.goto("/");
  await expect(page.getByText("Loading game…")).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("home-load-saves-button").click();
  await expect(page.getByTestId("saves-page")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("import-save-file-input").setInputFiles(fixturePath);
  await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 15_000 });
  await expectNoRawIdsVisible(page);
}

export interface ImportTeamsFixtureOptions {
  minTeams?: number;
  returnHome?: boolean;
}

/**
 * Imports a custom teams export fixture via the Manage Teams screen.
 */
export async function importTeamsFixture(
  page: Page,
  fixtureName: string,
  options: ImportTeamsFixtureOptions = {},
): Promise<void> {
  const minTeams = options.minTeams ?? 1;
  const returnHome = options.returnHome ?? true;
  const fixturePath = path.resolve(__dirname, "../fixtures", fixtureName);
  const fixtureJson = readFileSync(fixturePath, "utf8");

  await ensureMutedAnnouncementsInit(page);
  await ensureDemoSeedSuppressed(page);

  const runImportAttempt = async (): Promise<void> => {
    await page.goto("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("home-manage-teams-button").click();
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    const pasteTextarea = page.getByTestId("import-teams-paste-textarea");
    await pasteTextarea.fill(fixtureJson);
    await page.getByTestId("import-teams-paste-button").click();

    const importSuccess = page.getByTestId("import-teams-success");
    const importError = page.getByTestId("import-teams-error");
    const duplicateBanner = page.getByTestId("teams-duplicate-banner");

    await expect(async () => {
      if (await importSuccess.isVisible().catch(() => false)) return;

      if (await duplicateBanner.isVisible().catch(() => false)) {
        await page.getByTestId("teams-duplicate-confirm-button").click();
        await expect(importSuccess).toBeVisible({ timeout: 15_000 });
        return;
      }

      if (await importError.isVisible().catch(() => false)) {
        const message = (await importError.textContent())?.trim() || "unknown import error";
        throw new Error(`Fixture team import failed: ${message}`);
      }

      throw new Error("Waiting for team import result");
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1000] });

    await expect(async () => {
      const count = await page.getByTestId("custom-team-list-item").count();
      expect(count).toBeGreaterThanOrEqual(minTeams);
    }).toPass({ timeout: 15_000, intervals: [250, 500, 1000] });

    await page.goto("/");
    await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    await page.goto("/teams");
    await expect(page.getByTestId("manage-teams-screen")).toBeVisible({ timeout: 15_000 });

    await expect(async () => {
      const count = await page.getByTestId("custom-team-list-item").count();
      expect(count).toBeGreaterThanOrEqual(minTeams);
    }).toPass({ timeout: 15_000, intervals: [250, 500, 1000] });

    if (returnHome) {
      await page.goto("/");
      await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 10_000 });
    }
  };

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 250;

  const attemptImport = async (attempt: number): Promise<void> => {
    try {
      await runImportAttempt();
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS - 1) {
        throw err;
      }
      await page.waitForTimeout(RETRY_DELAY_MS);
      await attemptImport(attempt + 1);
    }
  };

  await attemptImport(0);
}
