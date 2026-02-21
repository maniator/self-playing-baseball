import { test } from "@playwright/test";

// TODO: Auto-save in this app is implemented via RxDB (GameInner loads the most
// recent RxDB save matching the current URL seed on mount and offers a Resume
// button).  Full auto-save restore flow requires the RxDB IndexedDB database to
// persist across a page reload within the same browser context, which works in a
// real browser but can be unreliable in headless Playwright with IndexedDB.
// These tests are skipped until a reliable cross-reload IndexedDB strategy is
// established for the test environment.

test.describe("Auto-save", () => {
  test.skip("auto-save is created after game starts and Resume button appears on reload", async () => {
    // TODO: start game, wait for RxDB auto-save, reload with same seed,
    // verify Resume button visible in NewGameDialog.
  });

  test.skip("clicking Resume restores the game state from the auto-save", async () => {
    // TODO: start game, let it progress, reload, click Resume,
    // verify game state matches saved progress.
  });
});
