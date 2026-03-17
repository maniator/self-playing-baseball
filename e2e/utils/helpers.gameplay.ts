import { expect, type Page } from "@playwright/test";

/**
 * Expands the play-by-play log (if collapsed) and waits until at least `count`
 * log entries are visible.
 */
export async function waitForLogLines(page: Page, count: number, timeout = 60_000): Promise<void> {
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
 * Returns a deterministic signature from the first five historical log lines.
 */
export async function captureGameSignature(
  page: Page,
  minLines = 5,
  logTimeout = 60_000,
): Promise<string> {
  await waitForLogLines(page, minLines, logTimeout);
  const logEl = page.getByTestId("play-by-play-log");
  const parts = await Promise.all(
    [0, 1, 2, 3, 4].map(async (i) => {
      const entry = logEl.locator(`[data-log-index="${i}"]`);
      return (await entry.textContent()) ?? "";
    }),
  );
  return parts.join("|");
}

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
 * Ensures visible gameplay surfaces do not leak raw custom team IDs.
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

export async function pauseGame(page: Page): Promise<void> {
  const btn = page.getByTestId("pause-play-button");
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  const label = await btn.getAttribute("aria-label");
  if (label !== "Resume game") {
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", "Resume game", { timeout: 5_000 });
  }
}

export async function resumeGame(page: Page): Promise<void> {
  const btn = page.getByTestId("pause-play-button");
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  const label = await btn.getAttribute("aria-label");
  if (label !== "Pause game") {
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", "Pause game", { timeout: 5_000 });
  }
}
