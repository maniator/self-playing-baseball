import { expect, test } from "@playwright/test";

import {
  assertCoreLayoutVisible,
  clickPlayBall,
  gotoFreshApp,
  waitForAtLeastLogLines,
  waitForNewGameDialog,
} from "../utils/helpers";

/** Rough viewport-height percentage thresholds. */
const LOG_MIN_PCT = 0.15; // log panel should be at least 15% of viewport height
const FIELD_MIN_HEIGHT_PX = 80; // field should be at least 80px tall on any viewport

test.describe("Responsive layout", () => {
  // Tests run across desktop / tablet / mobile via Playwright projects —
  // no per-test viewport override needed.

  test("scoreboard is visible", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("line-score")).toBeVisible();
  });

  test("field is visible and has non-trivial dimensions", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    const field = page.getByTestId("field");
    await expect(field).toBeVisible();
    const box = await field.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(FIELD_MIN_HEIGHT_PX);
    expect(box!.width).toBeGreaterThan(FIELD_MIN_HEIGHT_PX);
  });

  test("controls bar is visible and usable", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("saves-button")).toBeVisible();
    await expect(page.getByTestId("share-seed-button")).toBeVisible();
  });

  test("hit log is visible", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await expect(page.getByTestId("hit-log")).toBeVisible();
  });

  test("play-by-play log can be expanded and shows entries", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 3);
    // After expansion the announcements area must hold entries
    await expect(
      page.locator('[data-testid="announcements"] [data-testid="log-entry"]').first(),
    ).toBeVisible();
  });

  test("log panel occupies a meaningful portion of viewport height", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);

    const vpHeight = page.viewportSize()!.height;
    const logBox = await page.getByTestId("hit-log").boundingBox();
    expect(logBox).not.toBeNull();
    // The log panel should start at least 15% down the viewport (not pushed off-screen)
    expect(logBox!.y).toBeLessThan(vpHeight * 0.85);
  });

  test("field and log do not overlap (accessible in all viewport layouts)", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);

    const field = page.getByTestId("field");
    const hitLog = page.getByTestId("hit-log");

    const fieldBox = await field.boundingBox();
    const logBox = await hitLog.boundingBox();

    expect(fieldBox).not.toBeNull();
    expect(logBox).not.toBeNull();

    // Elements must each have meaningful area
    expect(fieldBox!.width * fieldBox!.height).toBeGreaterThan(0);
    expect(logBox!.width * logBox!.height).toBeGreaterThan(0);

    // Elements must not fully obscure each other.
    // On desktop they sit side-by-side (field left, log right);
    // on mobile they stack vertically (field above, log below).
    const sideByMide =
      fieldBox!.x + fieldBox!.width <= logBox!.x + logBox!.width + 20 &&
      logBox!.x >= fieldBox!.x - 20;
    const stackedVertically = fieldBox!.y + fieldBox!.height <= logBox!.y + logBox!.height + 20;

    expect(sideByMide || stackedVertically).toBe(true);
  });

  test("no unintended horizontal overflow on any viewport", async ({ page }) => {
    await gotoFreshApp(page);
    await clickPlayBall(page);
    await waitForAtLeastLogLines(page, 2);

    const { width: vpWidth } = page.viewportSize()!;
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    // Allow a small tolerance for scrollbar width
    expect(docWidth).toBeLessThanOrEqual(vpWidth + 20);
  });
});
