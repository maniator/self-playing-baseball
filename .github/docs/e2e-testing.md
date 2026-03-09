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
- **Seeded games** — seeds are set via the seed input field in the New Game form, which calls `reinitSeed(seedStr)` on submit. The seed is not written to the URL. E2E tests use `configureNewGame(page, { seed: "..." })` to fill the input field.
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
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function makeSig(header, events) {
  const inner = JSON.stringify({ header, events });
  return fnv1a(RXDB_EXPORT_KEY + inner);
}

const events = []; // empty for most fixtures; populate if your fixture needs recorded events
const payload = { version: 1, header, events, sig: makeSig(header, events) };
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
3. Compute `sig = makeSig(header, events)` using the Node.js snippet above (run via `node` in a scratch script)
4. Place file in `e2e/fixtures/<name>.json`
5. Use `await loadFixture(page, "<name>.json")` in the test

### State restoration mechanics

When `loadFixture` imports a save, `useSavesModal.ts` calls `handleLoad` which:
1. `dispatch({ type: "restore_game", payload: snap.state })` — applies `stateSnapshot.state` via `backfillRestoredState` (safe-defaults for any missing fields)
2. `onSetupRestore({ strategy, managedTeam, managerMode })` — writes to localStorage
3. `onLoadActivate(slot.id)` — sets `gameActive = true` so the DecisionPanel renders
4. Closes the modal

Because `pendingDecision` is part of `State` and `backfillRestoredState` merges `restored` over `fresh` defaults, a fixture that carries `pendingDecision: { kind: "defensive_shift" }` will render the manager decision panel instantly on load — no pitch needs to be thrown.

---

## Simulation Metrics Baseline (`e2e/tests/metrics-baseline.spec.ts`)

The metrics-baseline spec runs 100 full games via Instant mode (`SPEED_INSTANT=0`) and prints aggregate stats (BB%, K%, H/PA, runs/game) for before/after tuning comparisons. It is **excluded from the normal CI suite** and must be run manually.

### How to run

```bash
# Build first, then run only the metrics spec on desktop Chromium
yarn build
yarn test:e2e --project=desktop --grep "metrics-baseline"
```

### Canonical team fixture

All 100 games use the **5 teams committed to `e2e/fixtures/metrics-teams.json`**:
- Charlotte Bears (CHB)
- Denver Raiders (DRD)
- San Antonio Giants (SAG)
- Portland Foxes (PTF)
- Nashville Comets (NSC)

**This fixture is the single source of truth for all future passes.** Never recreate teams by clicking "Generate Random" across sessions — each run produces different random rosters, making cross-pass comparisons meaningless. Instead:
1. Import from the fixture file at the start of the spec (done automatically via `importTeamsFixture(page, "metrics-teams.json")`)
2. If teams must be regenerated: create 5 new teams, **Export All Teams** from the app, save the JSON over `e2e/fixtures/metrics-teams.json`, and commit **before** running any pass

> ⚠️ **Pass 1–3 used different teams (lost across sessions).** Pass 4 is the first pass using the committed `metrics-teams.json` fixture. All passes from pass 4 onward use the same rosters and are directly comparable.

### Starting the preview server for MCP browser automation

The MCP browser (Chrome controlled by the `mcp-server-playwright` process) can **only** reach `localhost:5173` when the vite preview server is started by the **Playwright CLI's `webServer` config**, not when started manually from bash.

**What works — let Playwright own the server:**

```bash
# Build first (required — preview serves dist/)
yarn build

# Start the Playwright metrics test in the background.
# Its webServer config starts `npx vite preview --port 5173` as a child process,
# which is the only method that makes localhost:5173 reachable in the MCP browser.
cd /home/runner/work/self-playing-baseball/self-playing-baseball
npx playwright test --config=playwright-metrics.config.ts --project=desktop > /tmp/pltest.txt 2>&1 &

# Wait ~12 seconds for vite preview to boot, then verify
sleep 12 && ss -tlnp | grep 5173
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5173/
```

Once the server is up, navigate the MCP browser with:

```
// ✅ Works — Playwright-managed server on localhost:5173
page.goto("http://localhost:5173/exhibition/new")
```

**What does NOT work (manually started servers are unreachable from MCP Chrome):**

```bash
# ❌ All of these fail in the MCP browser with ERR_CONNECTION_REFUSED or ERR_FAILED:
npx vite preview --port 5173                    # binds [::1]:5173
npx vite preview --port 5173 --host 0.0.0.0    # binds 0.0.0.0:5173
npx vite preview --port 5173 --host 127.0.0.1  # binds 127.0.0.1:5173
npx vite preview --port 5173 --host ::1         # binds [::1]:5173
```

**Root cause:** The MCP browser (`mcp-server-playwright`) controls the Chrome process (PID visible via `pgrep -f "chrome.*playwright"`). When `npx playwright test` runs it connects to the same Chrome process and registers `localhost:5173` with Chrome's networking stack via the webServer handshake. A manually-started server never goes through that handshake, so Chrome's network service rejects connections to it regardless of bind address.

**Important:** The background Playwright test will eventually time out (25-minute timeout for 100 games) and kill its vite preview server. If the server goes away mid-session, restart the test with the same command above.

### Running the 100-game metrics spec via MCP browser automation

Rather than waiting for the `playwright test` command to complete, you can use the MCP browser to run games manually and collect aggregate stats. This gives you real-time results you can read game-by-game.

**One-time setup per session:**

1. Start the server (see above — `npx playwright test ... &` approach)
2. Navigate MCP browser to `http://localhost:5173`
3. Set localStorage for Instant mode:
   ```js
   localStorage.setItem("speed", "0");
   localStorage.setItem("announcementVolume", "0");
   localStorage.setItem("alertVolume", "0");
   localStorage.setItem("_e2eNoInningPause", "1");
   localStorage.setItem("managerMode", "false");
   ```
4. Navigate to `/teams` and import `e2e/fixtures/metrics-teams.json` via the **Import from File** button — the teams persist in RxDB across navigations in the same Chrome session so this only needs to be done once per fresh Chrome profile

**Running games and collecting stats:**

The teams persist in RxDB, so after setup you only need ~4 MCP tool calls per game:

```
// 1. Navigate to new game form
page.goto("http://localhost:5173/exhibition/new") + waitFor("Play Ball")

// 2. Set teams + seed in one evaluate (no navigation, so context is preserved)
page.evaluate(() => {
  function setSelectByLabel(testId, label) {
    const el = document.querySelector(`[data-testid="${testId}"]`);
    const opt = [...el.options].find(o => o.text.includes(label));
    const ns = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    ns.call(el, opt.value);
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }
  function setSeed(val) {
    const el = document.querySelector('[data-testid="seed-input"]');
    const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    ns.call(el, val);
    const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (fk) el[fk]?.memoizedProps?.onChange?.({target: el});
    else el.dispatchEvent(new Event('input', {bubbles:true}));
  }
  setSelectByLabel('new-game-custom-away-team-select', 'Charlotte Bears');
  setSelectByLabel('new-game-custom-home-team-select', 'Denver Raiders');
  setSeed('s1g1');
})

// 3. Click play (navigates to /game — context is destroyed here, that's expected)
page.click('[data-testid="play-ball-button"]')

// 4. Wait for FINAL (Instant mode games complete in ~3–10 seconds)
page.waitFor("FINAL")

// 5. Collect stats from both team tabs and store in localStorage
page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function readTable() {
    let ab=0, h=0, bb=0, k=0;
    for (const row of document.querySelectorAll('table tbody tr')) {
      if (row.closest('[data-testid="scoreboard"]')) continue;
      const cells = [...row.querySelectorAll('td')];
      if (cells.length < 6) continue;
      const n = i => { const t = cells[i]?.textContent?.trim(); return (t && t !== '–') ? parseInt(t,10)||0 : 0; };
      ab+=n(2); h+=n(3); bb+=n(4); k+=n(5);
    }
    return {ab, h, bb, k};
  }
  const tabs = document.querySelectorAll('[role="tab"]');
  tabs[0].click(); await sleep(200);
  const away = readTable();
  tabs[1].click(); await sleep(200);
  const home = readTable();
  // read scores from scoreboard R column
  const sb = document.querySelector('[data-testid="scoreboard"]');
  const rIdx = [...(sb?.querySelectorAll('thead tr th,thead tr td')||[])].findIndex(c => c.textContent?.trim() === 'R');
  const scores = [...(sb?.querySelectorAll('tbody tr')||[])]
    .filter(r => r.querySelectorAll('td').length > 3).slice(0,2)
    .map(row => { const cells=[...row.querySelectorAll('td')]; return rIdx>=0 ? parseInt(cells[rIdx]?.textContent?.trim()||'0')||0 : 0; });
  const result = { ab: away.ab+home.ab, h: away.h+home.h, bb: away.bb+home.bb, k: away.k+home.k,
                   awayScore: scores[0]??0, homeScore: scores[1]??0 };
  const results = JSON.parse(localStorage.getItem('metricsResults')||'[]');
  results.push(result);
  localStorage.setItem('metricsResults', JSON.stringify(results));
  return { count: results.length, result };
})
```

**Efficiency tip — 10 parallel browser tabs:**

Background tabs continue running games in Instant mode because `_e2eNoInningPause` is set and `SPEED_INSTANT` bypasses all `setTimeout`-based throttling. Open 10 tabs, start a game on each tab (covering the 10 matchup blocks for seed g1), then rotate through them collecting stats and immediately starting the next seed. By the time you finish setting up tab 9, tab 0 is already at FINAL.

```
Tab 0: Charlotte Bears @ Denver Raiders  → s1g1
Tab 1: Denver Raiders @ Charlotte Bears  → s2g1
Tab 2: San Antonio Giants @ Portland Foxes → s3g1
...
Tab 9: Nashville Comets @ Denver Raiders → s10g1
```

After collecting from all 10, restart g2 on each tab and repeat for seeds g1–g10.

**Reading aggregate results after N games:**

```js
const results = JSON.parse(localStorage.getItem('metricsResults') || '[]');
const totalAB = results.reduce((s,r) => s+r.ab, 0);
const totalBB = results.reduce((s,r) => s+r.bb, 0);
const totalK  = results.reduce((s,r) => s+r.k,  0);
const totalH  = results.reduce((s,r) => s+r.h,  0);
const totalRuns = results.reduce((s,r) => s+r.awayScore+r.homeScore, 0);
const PA = totalAB + totalBB;
console.log(`Games: ${results.length}  BB%: ${(totalBB/PA*100).toFixed(1)}%  K%: ${(totalK/PA*100).toFixed(1)}%  H/PA: ${(totalH/PA).toFixed(3)}  R/game: ${(totalRuns/results.length).toFixed(1)}`);
```

**Important caveat:** The MCP browser run and the CLI `playwright test` run use the same game logic but produce slightly different per-game outcomes. See the [Vitest in-process harness vs Playwright browser run](#vitest-in-process-harness-vs-playwright-browser-run) section in the QA baseline doc for details on why the numbers differ.

### Vitest in-process harness vs Playwright browser run

The project has two ways to measure simulation metrics at scale:

| | Vitest in-process harness | Playwright browser run |
|---|---|---|
| **File** | `src/test/calibration/customTeamMetrics.test.ts` | `e2e/tests/metrics-baseline.spec.ts` |
| **Run command** | `yarn test --reporter=verbose src/test/calibration/customTeamMetrics.test.ts` | `npx playwright test --config=playwright-metrics.config.ts` |
| **Speed** | ~10–30 seconds for 100 games | ~10–20 minutes for 100 games |
| **Environment** | Node.js, no browser, no RxDB, no React | Full browser, RxDB, React, service worker |
| **RNG sequence** | Pure game logic only — no extra `random()` calls | Extra `random()` calls from React renders, audio setup, TTS, and service worker activity between pitches |
| **PA source** | Game state directly (exact) | DOM batting-stats table (read after tab switching) |
| **Per-game scores** | Deterministic for a given seed | Different from in-process for the same seed (shifted PRNG sequence) |
| **Use for** | Fast directional signal — is the change moving BB% the right way? | Required final validation before merging any sim-balance change |
| **Authoritative?** | ❌ Directional only | ✅ Ground truth for metrics comparisons |

**Key rule:** Never claim a metrics improvement based solely on the in-process harness. The harness provides a fast feedback loop (seconds vs. minutes), but the browser run is the only valid apple-to-apple comparison against the PR-140 browser baseline. If the harness and browser results move in opposite directions, the browser result is correct.

The harness BB% is typically **lower** than the browser BB% by ~1–2 pp because:
- Fewer total `random()` calls per PA means the PRNG sequence hits slightly different outcomes
- The browser's RxDB writes and React reconciliation add random() calls between pitches, slightly altering PA results
- The harness does not simulate navigation/reload overhead that could affect RxDB state
