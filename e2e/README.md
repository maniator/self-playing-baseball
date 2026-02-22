# E2E Tests

This directory contains [Playwright](https://playwright.dev/) end-to-end tests for Ballgame.

## Running tests locally

### Prerequisites

Run `yarn build` before running E2E tests — tests serve the **production build** via
`vite preview` (not the dev server). This avoids RxDB dev-mode hanging in headless Chromium.

### Commands

```bash
# Build + run all tests headlessly (all 7 browser/viewport projects)
yarn test:e2e

# Open Playwright UI mode — interactive step-through, traces, time-travel debugger
yarn test:e2e:ui

# Regenerate visual regression baseline snapshots after intentional UI changes
yarn test:e2e:update-snapshots
```

### Running a subset

```bash
# Single spec file
npx playwright test e2e/tests/smoke.spec.ts

# Single Playwright project (e.g. desktop Chromium only)
npx playwright test --project=desktop

# Headed mode (see the browser window)
npx playwright test --headed --project=desktop

# Run determinism tests only (always desktop Chromium)
npx playwright test --project=determinism
```

## Inspecting traces and artifacts

Traces are captured on the first retry of a failed test (CI) and on any failure when
retries are configured locally.  Screenshots are captured on all failures.  Videos are
retained for failed tests.

```bash
# Open the HTML report with inline traces and screenshots
npx playwright show-report
```

Or open `playwright-report/index.html` in your browser after a run.

On CI, `playwright-report/` and `test-results/` are uploaded as workflow artifacts when
any job fails.  Download them from the GitHub Actions summary page.

## Updating visual snapshots

After an intentional UI change that alters the baseline screenshots:

```bash
yarn test:e2e:update-snapshots
```

This regenerates the PNG files in `e2e/tests/visual.spec.ts-snapshots/`.  Commit the
updated images.  Only regenerate when you have made an intentional visual change — do
not regenerate to silence a failure caused by an unintentional regression.

## Architecture

| Spec | What it covers |
|---|---|
| `smoke.spec.ts` | App loads, game starts, autoplay populates log |
| `determinism.spec.ts` | Same seed → identical play-by-play (desktop Chromium only) |
| `save-load.spec.ts` | Save, load, autoplay resumes after load, export roundtrip |
| `import.spec.ts` | Import save from fixture file and load |
| `modals.spec.ts` | New Game dialog, Saves modal open/close, import form, delete |
| `manager-mode.spec.ts` | Manager Mode toggle, strategy selector, decision panel action |
| `notifications.spec.ts` | Notification permission + decision panel trigger (Chromium only) |
| `responsive-smoke.spec.ts` | Layout visible and non-zero on all 6 viewport projects |
| `visual.spec.ts` | Pixel-diff snapshot regression for key screens |

### Browser / viewport matrix

| Project | Browser | Viewport | Runs |
|---|---|---|---|
| `determinism` | Desktop Chrome | 1280×800 | `determinism.spec.ts` only |
| `desktop` | Desktop Chrome | 1280×800 | all except `determinism.spec.ts` |
| `tablet` | WebKit (iPad gen 7) | 820×1180 | all except `determinism.spec.ts` |
| `iphone-15-pro-max` | WebKit (iPhone 15 Pro Max) | 430×739 | all except `determinism.spec.ts` |
| `iphone-15` | WebKit (iPhone 15) | 393×659 | all except `determinism.spec.ts` |
| `pixel-7` | Chromium (Pixel 7) | 412×839 | all except `determinism.spec.ts` |
| `pixel-5` | Chromium (Pixel 5) | 393×727 | all except `determinism.spec.ts` |

## Helpers (`e2e/utils/helpers.ts`)

| Helper | Purpose |
|---|---|
| `resetAppState(page)` | Navigate to `/` and wait for DB to finish loading |
| `startGameViaPlayBall(page, opts?)` | Configure seed/teams + click Play Ball |
| `waitForLogLines(page, count)` | Poll until ≥ N play-by-play entries are visible |
| `captureGameSignature(page)` | Read first 5 log entries as a deterministic fingerprint |
| `enableManagerModeViaStorage(page)` | Register `addInitScript` to pre-set `managerMode=true` in localStorage before the next navigation |
| `openSavesModal(page)` | Click Saves button and wait for modal |
| `saveCurrentGame(page)` | Open modal and click Save |
| `loadFirstSave(page)` | Open modal and click first Load button |
| `importSaveFromFixture(page, name)` | Set fixture file on the file input |
| `disableAnimations(page)` | Inject CSS to zero all animation/transition durations |

### `data-testid` reference

All stable test selectors used across the suite:

`new-game-dialog`, `play-ball-button`, `matchup-mode-select`, `home-team-select`,
`away-team-select`, `seed-input`, `scoreboard`, `field-view`, `play-by-play-log`,
`log-panel`, `hit-log`, `saves-button`, `saves-modal`, `save-game-button`,
`load-save-button`, `export-save-button`, `import-save-file-input`,
`import-save-textarea`, `import-save-button`, `import-error`,
`manager-mode-toggle`, `manager-decision-panel`, `notif-permission-badge`, `slot-date`

## Common causes of flake and how the helpers avoid them

| Source of flake | Mitigation |
|---|---|
| Arbitrary `waitForTimeout` | Use `waitForLogLines`, `.toBeVisible`, `.toPass` with explicit conditions |
| Manager mode race with autoplay | Select `managedTeam: "0"` in `configureNewGame` so `handleStart` enables manager mode directly — avoids localStorage being overridden on submit |
| Dynamic timestamps in screenshots | Visual tests mask `[data-testid="slot-date"]` |
| CSS animation jitter in screenshots | `disableAnimations(page)` zeroes all durations before snapshot |
| IndexedDB state bleed between tests | Each test gets a fresh Playwright `BrowserContext` (and thus a fresh IndexedDB) |
| Seed-dependent non-determinism | All tests use fixed seeds; `captureGameSignature` reads `data-log-index` 0–4 (the oldest stable entries) |

## Skipped test debt

All previously skipped tests have been enabled.

**Intentional browser-conditional skips** (not skip debt — these are permanent by design):

- Tests in `notifications.spec.ts` skip when `browserName !== "chromium"` — the Notification
  API is unreliable in headless WebKit and not supported on iOS.  The tests run successfully on
  Chromium projects (`desktop`, `pixel-7`, `pixel-5`) and are cleanly reported as skipped on
  WebKit projects (`tablet`, `iphone-15-pro-max`, `iphone-15`).

All previously skipped tests have been enabled:

- **`manager decision panel appears and action can be taken`** (was in `manager-mode.spec.ts`) —
  unskipped by selecting a managed team (`managedTeam: "0"`) in the New Game dialog config.
  `handleStart` in `GameInner` calls `setManagerMode(true)` when a team is managed, so manager
  mode is active from the very first pitch.  The previous approach (pre-setting `managerMode` in
  localStorage) was unreliable because `handleStart` explicitly overrides manager mode based on
  the dialog selection.  `test.setTimeout(150_000)` was added to accommodate the 120 s decision
  panel wait without hitting the 90 s global limit.
