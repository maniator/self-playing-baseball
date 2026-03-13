import { expect, test } from "@playwright/test";

import { disableAnimations, resetAppState } from "../../utils/helpers";

/**
 * Visual regression snapshot for the SW update banner.
 *
 * The banner is shown when `useServiceWorkerUpdate` detects a new app version
 * is waiting (workbox `needRefresh`).  We trigger it in E2E without a real
 * service worker by navigating to `/?_sw_update=1`, which the hook treats as
 * a forced-show override.
 *
 * Run across all 6 non-determinism viewport projects (desktop, tablet,
 * iphone-15-pro-max, iphone-15, pixel-7, pixel-5).
 */
test.describe("Visual", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await disableAnimations(page);
  });

  test("SW update banner screenshot", async ({ page }) => {
    // Navigate with ?_sw_update=1 to force the update banner visible.
    // The init scripts registered by resetAppState() in beforeEach persist
    // across this navigation; we re-apply animations disabling afterwards
    // because addStyleTag() is cleared on each navigation.
    await page.goto("/?_sw_update=1");
    await disableAnimations(page);

    const banner = page.getByTestId("update-banner");
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveScreenshot("update-banner.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
