# E2E Testing

> Part of the Ballgame Copilot reference docs. See [copilot-instructions.md](../copilot-instructions.md) for the index.

## E2E Tests (`e2e/`)

Playwright E2E tests live in `e2e/` and are separate from the Vitest unit tests in `src/`.

### Projects

`playwright.config.ts` defines **7 projects**:

| Project | Browser | Viewport | Runs |
|---|---|---|---|
| `determinism` | Desktop Chrome | 1280×800 | `determinism.spec.ts` only |
| `desktop` | Desktop Chrome | 1280×800 | all except `determinism.spec.ts` |
| `tablet` | WebKit (iPad gen 7) | 820×1180 | all except `determinism.spec.ts` |
| `iphone-15-pro-max` | WebKit (iPhone 15 Pro Max) | 430×739 | all except `determinism.spec.ts` |
| `iphone-15` | WebKit (iPhone 15) | 393×659 | all except `determinism.spec.ts` |
| `pixel-7` | Chromium (Pixel 7) | 412×839 | all except `determinism.spec.ts` |
| `pixel-5` | Chromium (Pixel 5) | 393×727 | all except `determinism.spec.ts` |

The `determinism` project is intentionally isolated to desktop because it spawns two sequential fresh browser contexts per test — running it on all 6 device projects would multiply CI time by 6× for no additional coverage value (PRNG determinism is not viewport-dependent).

### Key design decisions

- **`vite preview` webServer** — E2E tests run against the production build (`dist/`), not `yarn dev`. This avoids the RxDB `RxDBDevModePlugin` dynamic import hanging the DB initialisation in headless Chromium.
- **Seed in URL before mount** — `initSeedFromUrl` is a one-shot init called before the React tree mounts. Seeds can also be set at runtime via the seed input field in the New Game dialog, which calls `reinitSeed(seedStr)` on submit and updates `?seed=` in the URL. E2E tests use `configureNewGame(page, { seed: "..." })` to fill the input field — no `/?seed=` URL navigation needed.
- **`data-log-index` on log entries** — each play-by-play `<Log>` element has `data-log-index={log.length - 1 - arrayIndex}` (0 = oldest event). `captureGameSignature` reads indices 0–4 to get a stable deterministic signature regardless of how many new entries autoplay has prepended.
- **Fresh context per determinism run** — `browser.newContext()` gives each game run its own IndexedDB, preventing the auto-save from the first run from restoring mid-game state in the second run and breaking seed reproducibility.

### Helper functions (`e2e/utils/helpers.ts`)

| Helper | Purpose |
|---|---|
| `resetAppState(page)` | Navigate to `/` and wait for DB loading to finish |
| `startGameViaPlayBall(page, options?)` | Navigate to `/exhibition/new`, fill seed-input field (if provided), configure teams, click Play Ball |
| `configureNewGame(page, options?)` | Fill seed/team fields on `/exhibition/new` without submitting |
| `loadFixture(page, fixtureName)` | Navigate to `/` → Load Saved Game → import file fixture → auto-load restores state — self-contained, no prior `resetAppState` needed |
| `waitForLogLines(page, count, timeout?)` | Expand log if collapsed, poll until ≥ count entries (default 60 s timeout) |
| `captureGameSignature(page, minLines?, logTimeout?)` | Wait for entries, read `data-log-index` 0–4, return joined string |
| `openSavesModal(page)` | Click saves button, wait for modal |
| `saveCurrentGame(page)` | Open modal + click Save current game |
| `loadFirstSave(page)` | Open modal + click first Load button, wait for modal to close |
| `importSaveFromFixture(page, fixtureName)` | Open modal + set file input to fixture path (requires active game) |
| `assertFieldAndLogVisible(page)` | Assert field-view + scoreboard visible with non-zero bounding boxes |
| `disableAnimations(page)` | Inject CSS to zero all animation/transition durations (use before visual snapshots) |
| `computeTeamsSignature(page, payload)` | Evaluate `fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload))` in the browser page context |
| `importTeamsFixture(page, fixtureName)` | Navigate to `/teams`, set `import-teams-file-input` to fixture path, wait for `import-teams-success` |

### `data-testid` reference

All stable test selectors added to the app:

**Home screen:** `home-screen`, `home-new-game-button`, `home-resume-current-game-button`, `home-load-saves-button`, `home-manage-teams-button`, `home-help-button`

**Exhibition Setup page (`/exhibition/new`):** `exhibition-setup-page`, `new-game-back-home-button`, `new-game-custom-teams-tab`, `home-team-select`, `away-team-select`, `seed-input`, `play-ball-button`, `team-validation-error`, `starting-pitcher-select`

**Saves page (`/saves`):** `saves-page`, `saves-page-back-button`, `saves-list`, `saves-list-item`, `saves-page-empty`, `load-save-button`, `export-save-button`, `delete-save-button`, `import-save-file-input`, `import-error`

**Help page (`/help`):** `help-page`, `help-page-back-button`

**Manage Teams (`/teams`, `/teams/new`, `/teams/:id/edit`):** `manage-teams-screen`, `manage-teams-back-button`, `manage-teams-create-button`, `custom-team-list`, `custom-team-list-item`, `custom-team-edit-button`, `custom-team-delete-button`, `manage-teams-editor-shell`, `manage-teams-editor-back-button`, `export-all-teams-button`, `export-team-button`, `import-teams-file-input`, `import-teams-success`, `import-teams-error`, `teams-duplicate-banner`, `teams-duplicate-confirm-button`, `teams-duplicate-cancel-button`

**Custom Team Editor (inside `/teams/new` and `/teams/:id/edit`):** `custom-team-lineup-section`, `custom-team-bench-section`, `custom-team-pitchers-section`, `custom-team-name-input`, `custom-team-abbreviation-input`, `custom-team-city-input`, `custom-team-regenerate-defaults-button`, `custom-team-save-button`, `custom-team-cancel-button`, `custom-team-add-lineup-player-button`, `custom-team-add-bench-player-button`, `custom-team-add-pitcher-button`, `custom-team-player-position-select`, `custom-team-player-handedness-select`, `custom-team-editor-error-summary`, `custom-team-save-error-hint`, `export-player-button`, `import-lineup-player-input`, `import-bench-player-input`, `import-pitchers-player-input`, `player-import-lineup-duplicate-banner`, `player-import-lineup-confirm-button`, `player-import-bench-duplicate-banner`, `player-import-bench-confirm-button`, `player-import-pitchers-duplicate-banner`, `player-import-pitchers-confirm-button`, `lineup-bench-dnd-container`

**In-game controls (GameControls / SavesModal):** `saves-button`, `saves-modal`, `saves-modal-close-button`, `save-game-button`, `import-save-textarea`, `import-save-button`, `back-to-home-button`

**Game view:** `new-game-dialog`, `scoreboard`, `field-view`, `play-by-play-log`, `log-panel`, `hit-log`, `manager-mode-toggle`, `manager-decision-panel`, `db-reset-notice`

### Visual snapshots

Committed baseline PNGs live in `e2e/tests/visual.spec.ts-snapshots/` named `<screen>-<project>-linux.png`. These baselines are rendered inside the `mcr.microsoft.com/playwright:v1.58.2-noble` container (the same image used by `playwright-e2e.yml`), so they must **always** be regenerated inside that same container to guarantee pixel-identical rendering.

**Never run `yarn test:e2e:update-snapshots` locally and commit the result.** Local OS fonts and rendering differ from the CI container, causing false visual-diff failures on every subsequent CI run.

When an intentional UI change requires new baselines, you have two options:

**Option 1 — Use the `e2e-test-runner` agent (preferred for Copilot sessions):** The agent runs `--update-snapshots` inside the same Docker container and commits the updated PNGs directly to the branch in the same session. No workflow wait required. See `.github/agents/e2e-test-runner.md` for the exact `docker run` commands.

**Option 2 — Use the `update-visual-snapshots` GitHub Actions workflow:**
- It fires **automatically** on every push to any non-master branch.
- For manual control: **Actions → "Update Visual Snapshots" → Run workflow → select your branch → Run workflow**.
- The workflow runs inside the same Playwright container as CI, regenerates all snapshot PNGs, and commits them back to your branch (without `[skip ci]`), so `playwright-e2e.yml` runs against the updated baselines on that commit.

Do **not** regenerate snapshots unless you are intentionally changing a visual.

### Workflow sequencing for snapshot changes

When you push a commit that changes the app or its tests, **two things happen**:
1. `update-visual-snapshots` fires (auto-trigger), regenerates PNGs in the CI container, and commits them back to the branch.
2. `playwright-e2e` fires against the *original* commit — this run may fail if the new test has no baseline yet.

Once `update-visual-snapshots` commits the new baselines, a *second* `playwright-e2e` run is triggered against that commit. That run uses the fresh baselines and should pass. The initial failure on the original commit is expected and self-correcting.

### CI

`.github/workflows/playwright-e2e.yml` — pure test runner; does **not** regenerate or commit snapshots:
1. `yarn build` — produces `dist/` for `vite preview`
2. `npx playwright test` — runs all projects headlessly (browser binaries pre-installed in the container)
3. Uploads `playwright-report/` + `test-results/` as artifacts on failure

`.github/workflows/update-visual-snapshots.yml` — snapshot regeneration workflow (auto-triggers on every push to non-master branches):
- Runs inside the **same** `mcr.microsoft.com/playwright:v1.58.2-noble` container as `playwright-e2e.yml`.
- **Auto-trigger:** every push to any non-master branch.
- **Manual trigger:** Actions → "Update Visual Snapshots" → Run workflow → select branch.
- Commits updated PNGs back to the branch; the commit triggers `playwright-e2e` to validate them.
- Concurrency group: cancels stale queued runs when a newer push arrives.

---

## Save Fixtures for E2E Testing

Pre-crafted save files in `e2e/fixtures/` let E2E tests jump straight into a specific game situation without waiting for autoplay to reach it. This slashes test time from 90–150 s (waiting for decisions or scoring plays) to under 15 s.

### When to use a fixture instead of `startGameViaPlayBall`

| Situation | Use fixture? |
|---|---|
| Need a manager decision panel visible immediately | ✅ `pending-decision.json` |
| Need specific pending decision (pinch hitter, shift, etc.) | ✅ craft a new fixture |
| Need RBI / stats already on the board | ✅ `mid-game-with-rbi.json` |
| Testing visual snapshot of a mid-game UI element | ✅ craft a fixture for that state |
| Testing correctness of the simulation (seed regression, determinism) | ❌ must use real `startGameViaPlayBall` |
| Testing the full game-completion flow (FINAL banner) | ❌ must use real autoplay |

### The `loadFixture` helper

```typescript
import { loadFixture } from "../utils/helpers";

await loadFixture(page, "pending-decision.json");
// Game is now active with the fixture's stateSnapshot applied.
// No startGameViaPlayBall, no waitForLogLines, no long timeouts needed.
```

`loadFixture` navigates to **Home → "Load Saved Game" → `/saves` page**, imports the file through the saves page file input, waits for the auto-load to restore state and navigate to `/game`, and confirms the scoreboard is visible — all in one call.

### Available fixtures

| File | State summary | Covers |
|---|---|---|
| `sample-save.json` | Inning 2, Mets vs Yankees, no pending decision | Import smoke tests |
| `pending-decision.json` | Inning 4 bottom, defensive_shift pending, managerMode on | Manager decision panel UI, notification smoke |
| `pending-decision-pinch-hitter.json` | Inning 7 top, pinch_hitter pending + 2 candidates, default teams | Pinch-hitter dropdown visual snapshot |
| `pending-decision-pinch-hitter-teams.json` | Same as above but with custom teams + player sigs in the bundle | Signed custom-team fixture with player fingerprints |
| `mid-game-with-rbi.json` | Inning 5 top, 3-2 score, playLog has RBI entries | RBI stats display + save/reload persistence |
| `finished-game.json` | Completed game, FINAL banner shown | Game-over state regression tests |
| `legacy-teams-no-fingerprints.json` | Pre-v2 teams bundle (no player or team fingerprints) | Legacy import migration regression |

### Authoring a new fixture

Fixtures are signed JSON bundles (`RxdbExportedSave` format). The signature is a FNV-1a 32-bit checksum. **Always use Node.js (not Python)** to compute signatures — Python's `json.dumps` escapes non-ASCII characters differently from JS `JSON.stringify` (e.g. `·` → `\u00b7`), which causes sig mismatches at import time.

```js
const RXDB_EXPORT_KEY = "ballgame:rxdb:v1";

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (const c of str) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function makeSig(header, events) {
  const inner = JSON.stringify({ header, events });
  return fnv1a(RXDB_EXPORT_KEY + inner);
}

const payload = { version: 1, header, events, sig: makeSig(header, []) };
```

**Key fields in `header.stateSnapshot.state`:**

| Field | Purpose | Notes |
|---|---|---|
| `pendingDecision` | Decision panel state | `null` = no panel; `{ kind: "defensive_shift" }` = shift panel; `{ kind: "pinch_hitter", candidates: [...], teamIdx: 0, lineupIdx: N }` = dropdown |
| `managerMode` (in `setup`) | Shows the DecisionPanel | Must be `true` for any pending-decision fixture |
| `managedTeam` (in `setup`) | Which team is managed | `0` = away, `1` = home |
| `playLog` | RBI / hit stats | Each entry needs `{ inning, half, batterNum, team, event, runs, rbi }` where `event` is the Hit enum value (Single=0, Double=1, Triple=2, Homerun=3, Walk=4) |
| `inningRuns` | Line-score display | `inningRuns[team][inning-1]` = runs that team scored in that inning |
| `lineupOrder` | Player IDs in batting order | Always populated for custom-team games |
| `playerOverrides` | Custom names/positions/stat mods | Use player IDs as keys |
| `resolvedMods` | Pre-computed stat mods | Needed for `pinch_hitter` candidates' `contactMod`/`powerMod` to be accurate |
| `rosterBench` | Bench player IDs | Required for `pinch_hitter` decisions to show candidates |

**Minimal fixture checklist:**

1. Build `header` object with `id`, `name`, `seed`, `homeTeamId`, `awayTeamId`, `schemaVersion: 1`, `setup`, and `stateSnapshot`
2. Start from `BASE_STATE` (all array/object fields present with safe defaults) and override only what you need
3. Compute `sig = makeSig(header, [])` using the Node.js snippet above (run via `node` in a scratch script)
4. Place file in `e2e/fixtures/<name>.json`
5. Use `await loadFixture(page, "<name>.json")` in the test

### State restoration mechanics

When `loadFixture` imports a save, `useSavesModal.ts` calls `handleLoad` which:
1. `dispatch({ type: "restore_game", payload: snap.state })` — applies `stateSnapshot.state` via `backfillRestoredState` (safe-defaults for any missing fields)
2. `onSetupRestore({ strategy, managedTeam, managerMode })` — writes to localStorage
3. `onLoadActivate(slot.id)` — sets `gameActive = true` so the DecisionPanel renders
4. Closes the modal

Because `pendingDecision` is part of `State` and `backfillRestoredState` merges `restored` over `fresh` defaults, a fixture that carries `pendingDecision: { kind: "defensive_shift" }` will render the manager decision panel instantly on load — no pitch needs to be thrown.
