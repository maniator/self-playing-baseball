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

After an intentional UI change that alters the baseline screenshots, trigger the
**Update Visual Snapshots** workflow from GitHub Actions (Actions → "Update Visual
Snapshots" → Run workflow → select branch).  The workflow runs inside the same
Playwright container as CI, regenerates all PNGs, and commits them back to the branch.

**Never run `yarn test:e2e:update-snapshots` locally and commit the result** — local OS
fonts and rendering differ from the CI container and cause false-diff failures.

The workflow targets the `e2e/tests/visual/` directory and `e2e/tests/layout.spec.ts`.

## CI: sharding and combined report

The `playwright-e2e` workflow runs **4 parallel jobs** (2 browser groups × 2 shards each):

| Job | Browser | Projects | Shard |
|---|---|---|---|
| chromium-shard-1 | Chromium | determinism, desktop, pixel-7, pixel-5 | 1/2 |
| chromium-shard-2 | Chromium | determinism, desktop, pixel-7, pixel-5 | 2/2 |
| webkit-shard-1 | WebKit | tablet, iphone-15-pro-max, iphone-15 | 1/2 |
| webkit-shard-2 | WebKit | tablet, iphone-15-pro-max, iphone-15 | 2/2 |

Each shard uploads a **blob report** artifact. After all shards complete, a
`merge-reports` job merges them into a single HTML report (`playwright-report-merged`
artifact, 14-day retention).

To download the merged report after a CI run: Actions run summary → Artifacts →
`playwright-report-merged`.

## Spec size guardrails

A lightweight CI check (`scripts/check-spec-sizes.mjs`) scans all `*.spec.ts` files
under `e2e/tests/` on every push:

- **Warn** (≥ 500 lines): printed to the log but does not fail CI.
- **Fail** (≥ 900 lines): fails the lint job.

If a spec approaches the warning threshold, split it into smaller feature-focused files
inside `e2e/tests/visual/` or a new subdirectory.

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
| `custom-team-editor.spec.ts` | Team editor form interactions, drag-and-drop handles (desktop) |
| `custom-team-editor-mobile-and-regressions.spec.ts` | Mobile team editor regressions |
| `manage-teams-and-custom-game-flow.spec.ts` | Full Create/Edit/Delete team + start custom game |
| `import-export-teams.spec.ts` | Export all teams / per-team, import round-trip, legacy-file import, tamper detection, duplicate skip |
| `import-save-missing-teams.spec.ts` | Save import where the referenced custom teams are absent |
| `stats.spec.ts` | Live batting stats + hit log correctness |
| `batting-stats.spec.ts` | Stat-budget regression |
| `stat-budget.spec.ts` | Stat-budget smoke |
| `starting-pitcher-selection.spec.ts` | Custom-game starting pitcher selector |
| `substitution.spec.ts` | Pinch hitter substitution flow |
| `qa-regression.spec.ts` | Miscellaneous QA regression tests |
| `visual/home-and-dialogs.visual.spec.ts` | Home screen, New Game dialog, How to Play modal |
| `visual/game-ui.visual.spec.ts` | Scoreboard, team tab bar, player stats panel, saves modal |
| `visual/team-editor.visual.spec.ts` | Manage Teams, Create/Edit Team editors, pitcher selector |
| `visual/manager-decision.visual.spec.ts` | Manager decision panel, pinch hitter dropdown |
| `visual/teams-import-export.visual.spec.ts` | Teams import/export UI snapshots |

### Fixtures (`e2e/fixtures/`)

Pre-crafted save files for tests that need a specific game state immediately:

| Fixture | State |
|---|---|
| `sample-save.json` | Inning 2, no pending decision |
| `pending-decision.json` | Inning 4, defensive_shift pending |
| `pending-decision-pinch-hitter.json` | Inning 7, pinch_hitter pending with candidates (default teams) |
| `pending-decision-pinch-hitter-teams.json` | Inning 7, pinch_hitter pending with custom teams + player sigs |
| `mid-game-with-rbi.json` | Inning 5, 3–2 score with RBI entries |
| `finished-game.json` | Completed game, FINAL banner |
| `legacy-teams-no-fingerprints.json` | Pre-v2 teams export bundle (no player fingerprints) — used for migration regression |

Use `loadFixture(page, "filename.json")` to load a fixture in a test.  The helper
navigates to `/`, opens the Saves modal, imports the file, and waits for the game state
to restore — all in one call, typically under 15 s.

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
| `startGameViaPlayBall(page, opts?)` | Configure seed/teams/managedTeam + click Play Ball |
| `waitForLogLines(page, count)` | Poll until ≥ N play-by-play entries are visible |
| `captureGameSignature(page)` | Read first 5 log entries as a deterministic fingerprint |
| `openSavesModal(page)` | Click Saves button and wait for modal |
| `saveCurrentGame(page)` | Open modal and click Save |
| `loadFirstSave(page)` | Open modal and click first Load button |
| `importSaveFromFixture(page, name)` | Set fixture file on the file input |
| `assertFieldAndLogVisible(page)` | Assert field-view and scoreboard are visible with non-zero bounding boxes |
| `disableAnimations(page)` | Inject CSS to zero all animation/transition durations |
| `computeTeamsSignature(page, payload)` | Evaluate `fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload))` in-browser |
| `importTeamsFixture(page, fixtureName)` | Navigate to `/teams`, import file, wait for `import-teams-success` |

### `data-testid` reference

All stable test selectors used across the suite:

**Home screen:** `home-screen`, `home-new-game-button`, `home-resume-current-game-button`, `home-load-saves-button`, `home-manage-teams-button`, `home-help-button`

**Exhibition Setup page (`/exhibition/new`):** `exhibition-setup-page`, `new-game-back-home-button`, `new-game-mlb-teams-tab`, `new-game-custom-teams-tab`, `matchup-mode-select`, `home-team-select`, `away-team-select`, `seed-input`, `play-ball-button`, `team-validation-error`, `starting-pitcher-select`

**Saves page (`/saves`):** `saves-page`, `saves-page-back-button`, `saves-list`, `saves-list-item`, `saves-page-empty`, `load-save-button`, `export-save-button`, `delete-save-button`, `import-save-file-input`, `import-error`, `slot-date`

**Help page (`/help`):** `help-page`, `help-page-back-button`

**Manage Teams (`/teams`, `/teams/new`, `/teams/:id/edit`):** `manage-teams-screen`, `manage-teams-back-button`, `manage-teams-create-button`, `custom-team-list`, `custom-team-list-item`, `custom-team-edit-button`, `custom-team-delete-button`, `manage-teams-editor-shell`, `manage-teams-editor-back-button`, `export-all-teams-button`, `export-team-button`, `import-teams-file-input`, `import-teams-success`, `import-teams-error`, `teams-duplicate-banner`, `teams-duplicate-confirm-button`, `teams-duplicate-cancel-button`

**Custom Team Editor:** `custom-team-lineup-section`, `custom-team-bench-section`, `custom-team-pitchers-section`, `custom-team-name-input`, `custom-team-abbreviation-input`, `custom-team-city-input`, `custom-team-regenerate-defaults-button`, `custom-team-save-button`, `custom-team-cancel-button`, `custom-team-add-lineup-player-button`, `custom-team-add-bench-player-button`, `custom-team-add-pitcher-button`, `custom-team-player-position-select`, `custom-team-player-handedness-select`, `custom-team-editor-error-summary`, `custom-team-save-error-hint`, `export-player-button`, `import-lineup-player-input`, `import-bench-player-input`, `import-pitchers-player-input`, `player-import-duplicate-banner`, `player-import-confirm-button`, `lineup-bench-dnd-container`

**In-game controls:** `saves-button`, `saves-modal`, `saves-modal-close-button`, `save-game-button`, `import-save-textarea`, `import-save-button`, `back-to-home-button`

**Game view:** `new-game-dialog`, `scoreboard`, `field-view`, `play-by-play-log`, `log-panel`, `hit-log`, `manager-mode-toggle`, `manager-decision-panel`, `db-reset-notice`

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

**Previously skipped test now enabled:**

- **`manager decision panel appears and action can be taken`** (was in `manager-mode.spec.ts`) —
  unskipped by selecting a managed team (`managedTeam: "0"`) in the New Game dialog config.
  `handleStart` in `GameInner` calls `setManagerMode(true)` when a team is managed, so manager
  mode is active from the very first pitch.  The previous approach (pre-setting `managerMode` in
  localStorage) was unreliable because `handleStart` explicitly overrides manager mode based on
  the dialog selection.  `test.setTimeout(150_000)` was added to accommodate the 120 s decision
  panel wait without hitting the 90 s global limit.
