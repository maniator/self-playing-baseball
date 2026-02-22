import { expect, test } from "@playwright/test";

import { resetAppState, startGameViaPlayBall, waitForLogLines } from "../utils/helpers";

/**
 * Notification / service-worker smoke tests.
 *
 * These tests verify that the app's manager-mode notification path is wired
 * correctly, without relying on real OS-level notification delivery.
 *
 * Strategy:
 * - Select a managed team in the New Game dialog so that GameInner's
 *   handleStart enables manager mode properly (no localStorage race).
 * - Grant `notifications` permission via the Playwright BrowserContext.
 * - Wait for the DecisionPanel to appear — this confirms the full path:
 *     detectDecision → set_pending_decision → DecisionPanel renders →
 *     showManagerNotification called → notification delivered (or attempted).
 * - Verify the app logged the notification attempt via console output.
 *
 * CI safety: no real OS notification appears; we only assert on in-page state
 * and console messages.  WebKit (Safari) does not reliably support the
 * Notification API in headless mode, so these tests are Chromium-only.
 */

/**
 * Decision panel test — manager mode enabled via the dialog so it is active
 * from the first pitch.  Waiting 120 s means we need a 150 s test timeout.
 */
test.describe("Notifications smoke — decision panel", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["notifications"]);
  });

  test("decision panel appears when notification permission is granted", async ({
    page,
    browserName,
  }) => {
    // Notification API behaviour varies; run on Chromium where it is reliable.
    test.skip(browserName !== "chromium", "Notification smoke runs on Chromium only");
    // The decision panel wait is 120 s; add headroom beyond the 90 s global limit.
    test.setTimeout(150_000);

    // Collect app console output to verify the notification attempt.
    const consoleMsgs: string[] = [];
    page.on("console", (msg) => consoleMsgs.push(msg.text()));

    // managedTeam "0" causes handleStart to call setManagerMode(true) so the
    // manager mode is active from the very first pitch.
    await startGameViaPlayBall(page, { seed: "notif42", managedTeam: "0" });
    await waitForLogLines(page, 3);

    // With manager mode active from the first pitch, autoplay pauses at the
    // first decision point and the DecisionPanel is rendered.
    await expect(page.getByTestId("manager-decision-panel")).toBeVisible({ timeout: 120_000 });

    // The app logs the notification attempt via appLog.log before sending it.
    // This is a reliable in-process signal that the notification code path ran.
    expect(consoleMsgs.some((m) => m.includes("showManagerNotification"))).toBe(true);
  });
});

/**
 * Notification permission UI test — verifies that ManagerModeControls renders
 * a notification state indicator (badge) when manager mode is enabled.
 * The badge shows one of: "🔔 on", "🔔 click to enable", or "🔕 blocked"
 * depending on the current Notification permission level.
 */
test.describe("Notifications smoke — permission badge", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["notifications"]);
    await resetAppState(page);
  });

  test("notification state indicator appears when manager mode is enabled", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Notification badge test runs on Chromium only");

    await page.getByTestId("play-ball-button").click();
    await expect(page.getByTestId("scoreboard")).toBeVisible({ timeout: 10_000 });

    // Enable manager mode via the UI toggle.  handleManagerModeChange fires
    // which explicitly calls setNotifPermission(Notification.permission).
    await page.getByTestId("manager-mode-toggle").check();

    // A notification state badge is rendered regardless of permission level:
    // "🔔 on" (granted), "🔔 click to enable" (default), "🔕 blocked" (denied).
    await expect(page.getByTestId("notif-permission-badge")).toBeVisible({ timeout: 5_000 });
  });
});
