import { expect, test } from "@playwright/test";

import { disableAnimations, resetAppState } from "../../utils/helpers";

/**
 * Visual regression snapshot for the SW update banner.
 *
 * The banner is shown when the service worker posts a SW_UPDATED message
 * after activating a new deployed version.  We simulate that message via
 * page.evaluate() so we don't need to actually swap service workers in the
 * test environment.
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
    // Dispatch a fake SW_UPDATED message on navigator.serviceWorker,
    // exactly as the real service worker would after clients.claim().
    await page.evaluate(() => {
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent("message", { data: { type: "SW_UPDATED" } }),
      );
    });

    const banner = page.getByTestId("update-banner");
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveScreenshot("update-banner.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
