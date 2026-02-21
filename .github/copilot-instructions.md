# Copilot Instructions for Ballgame (self-playing-baseball)

## Project Overview

**Ballgame** is a **self-playing baseball simulator** built as a single-page React/TypeScript PWA. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar, share a deterministic replay link, enable auto-play mode, or turn on **Manager Mode** to make strategic decisions that influence the simulation. The app is installable on Android and desktop via a Web App Manifest.

**Repository size:** ~95 source files. **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Parcel v2.x. **Package manager:** Yarn Berry v4. **Persistence:** RxDB v16 (IndexedDB, local-only — no sync).

---

## Repository Layout

```
/
├── .github/                        # GitHub config (copilot-instructions.md, workflows/)
├── .yarn/                          # Yarn releases
├── .yarnrc.yml                     # Yarn Berry config (nodeLinker: node-modules)
├── .gitignore
├── .nvmrc                          # Node version: 24
├── .prettierrc                     # Prettier config (double quotes, trailing commas, printWidth 100)
├── eslint.config.mjs               # ESLint flat config (TS + React + import-sort + Prettier)
├── tsconfig.json                   # TypeScript config with path aliases
├── vitest.config.ts                # Vitest config with matching resolve.alias entries
├── package.json                    # Scripts, dependencies, Husky/Commitizen config
├── yarn.lock
├── vercel.json                     # Vercel SPA routing config (version 2)
├── dist/                           # Build output (gitignored)
└── src/
    ├── index.html                  # HTML entry point for Parcel (script has type="module")
    ├── index.scss                  # Global styles + mobile media queries
    ├── index.tsx                   # React entry: initSeedFromUrl, registers sw.ts, createRoot
    ├── sw.ts                       # Service worker: caches bundles, handles notificationclick
    ├── manifest.webmanifest        # PWA manifest: name "Ballgame", icons, theme_color #000000
    ├── images/
    │   ├── baseball.svg            # SVG icon (baseball with red stitches on black bg) — favicon + source
    │   ├── baseball-192.png        # PWA icon 192×192 (generated from baseball.svg)
    │   ├── baseball-512.png        # PWA icon 512×512 / maskable (generated from baseball.svg)
    │   ├── baseball-180.png        # Apple touch icon 180×180
    │   └── favicon-32.png          # Fallback favicon 32×32
    ├── constants/
    │   ├── hitTypes.ts             # Hit enum: Single, Double, Triple, Homerun, Walk
    │   └── pitchTypes.ts           # PitchType enum + selectPitchType, pitchName helpers
    ├── utils/                      # Pure utilities (no React)
    │   ├── announce.ts             # Barrel re-export: re-exports everything from tts.ts and audio.ts
    │   ├── audio.ts                # Web Audio API: playDecisionChime, playVictoryFanfare, play7thInningStretch
    │   ├── tts.ts                  # Web Speech API: announce, cancelAnnouncements, setSpeechRate, isSpeechPending
    │   ├── getRandomInt.ts         # Random number helper — delegates to rng.ts random()
    │   ├── logger.ts               # Shared colored console logger; exports createLogger(tag) + appLog singleton
    │   ├── mediaQueries.ts         # Responsive breakpoint helpers (CSS-in-JS); exported as mediaQueries object
    │   ├── mlbTeams.ts             # Fetches MLB teams from MLB Stats API; caches per-team in RxDB `teams` collection
    │   ├── rng.ts                  # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed, getRngState, restoreRng
    │   ├── roster.ts               # BaseStats type + default lineup order helpers used by player customisation
    │   ├── saves.ts                # currentSeedStr(), restoreRng() PRNG utilities + re-exports from saves.signing.ts
    │   └── saves.signing.ts        # ExportedSave / SaveSlot / SaveSetup types; exportSave / importSave / SAVE_SIGNING_KEY
    ├── storage/                    # RxDB local-only persistence (IndexedDB, no sync)
    │   ├── db.ts                   # Lazy-singleton BallgameDb; collections: saves, events, teams; exports getDb(), savesCollection(), eventsCollection(), teamsCollection(), _createTestDb()
    │   ├── saveStore.ts            # SaveStore singleton + makeSaveStore() factory:
    │   │                           #   createSave, appendEvents (serialized queue + in-memory idx counter),
    │   │                           #   updateProgress (with stateSnapshot), listSaves, deleteSave,
    │   │                           #   exportRxdbSave, importRxdbSave (FNV-1a integrity bundle)
    │   └── types.ts                # SaveDoc, EventDoc, TeamDoc, GameSaveSetup, ScoreSnapshot,
    │                               #   InningSnapshot, StateSnapshot, GameSetup, GameEvent,
    │                               #   ProgressSummary, RxdbExportedSave
    ├── context/                    # All game state, reducer, and types
    │   ├── index.tsx               # GameContext, useGameContext(), State, ContextValue, GameProviderWrapper
    │   │                           #   Exports: LogAction, GameAction, Strategy, DecisionType, OnePitchModifier
    │   │                           #   GameProviderWrapper accepts optional onDispatch?: (action: GameAction) => void
    │   ├── strategy.ts             # stratMod(strategy, stat) — probability multipliers per strategy
    │   ├── advanceRunners.ts       # advanceRunners(type, baseLayout) — pure base-advancement logic
    │   ├── gameOver.ts             # checkGameOver, checkWalkoff, nextHalfInning
    │   ├── playerOut.ts            # playerOut — handles out count, 3-out half-inning transitions
    │   ├── hitBall.ts              # hitBall — pop-out check, callout log, run scoring
    │   ├── buntAttempt.ts          # buntAttempt — fielder's choice, sacrifice bunt, bunt single, pop-out
    │   ├── playerActions.ts        # playerStrike, playerBall, playerWait, stealAttempt (re-exports buntAttempt)
    │   └── reducer.ts              # Reducer factory; exports detectDecision(), re-exports stratMod
    ├── hooks/                      # All custom React hooks
    │   ├── useGameRefs.ts          # Syncs all stable refs (autoPlay, muted, speed, etc.)
    │   ├── useGameAudio.ts         # Victory fanfare + 7th-inning stretch; betweenInningsPauseRef
    │   ├── usePitchDispatch.ts     # handleClickRef — pitch logic + manager decision detection
    │   ├── useAutoPlayScheduler.ts # Speech-gated setTimeout scheduler
    │   ├── useAutoSave.ts          # Writes auto-save to localStorage after every half-inning / game-over
    │   ├── usePlayerControls.ts    # All UI event handlers (autoplay, volume, mute, manager mode)
    │   ├── useReplayDecisions.ts   # Reads ?decisions= from URL and replays manager choices
    │   ├── useRxdbGameSync.ts      # Drains actionBufferRef → appendEvents on pitchKey advance;
    │   │                           #   calls updateProgress (with full stateSnapshot) on half-inning / game-over
    │   └── useShareReplay.ts       # Clipboard copy of replay URL
    ├── components/                 # All UI components
    │   ├── Announcements/index.tsx # Play-by-play log with heading + empty-state placeholder
    │   ├── Ball/
    │   │   ├── constants.ts        # hitDistances: pixel travel distance per Hit type
    │   │   └── index.tsx           # Ball animation component; key={pitchKey} restarts CSS animation
    │   ├── DecisionPanel/
    │   │   ├── constants.ts        # DECISION_TIMEOUT_SEC (10), NOTIF_TAG ("manager-decision")
    │   │   ├── DecisionButtonStyles.ts  # Styled-component button variants for decision actions
    │   │   ├── DecisionButtons.tsx # Decision action button groups per decision kind
    │   │   ├── notificationHelpers.ts   # showManagerNotification, closeManagerNotification
    │   │   ├── styles.ts           # Styled components for DecisionPanel layout
    │   │   └── index.tsx           # Manager decision UI: prompt, buttons, 10s countdown bar
    │   ├── Diamond/
    │   │   ├── index.tsx           # Baseball diamond — self-contained with FieldWrapper container
    │   │   └── styles.ts           # Styled components for diamond layout
    │   ├── Game/
    │   │   ├── index.tsx           # Owns actionBufferRef; passes onDispatch to GameProviderWrapper + ref to GameInner
    │   │   ├── ErrorBoundary.tsx   # React error boundary — catches render errors, clears stale localStorage keys
    │   │   ├── GameInner.tsx       # Top-level layout: NewGameDialog, LineScore, GameControls, two-column body
    │   │   │                       #   Calls SaveStore.createSave() on handleStart/handleResume; hosts useRxdbGameSync
    │   │   └── styles.ts           # Styled components for game layout
    │   ├── GameControls/
    │   │   ├── index.tsx           # GameControls component — renders controls using useGameControls hook
    │   │   ├── constants.ts        # SPEED_SLOW (1200ms), SPEED_NORMAL (700ms), SPEED_FAST (350ms)
    │   │   ├── styles.ts           # Styled components for controls layout
    │   │   ├── useGameControls.ts  # Hook: wires all game-controls hooks + localStorage state into a single value
    │   │   ├── ManagerModeControls.tsx  # Manager Mode checkbox, team/strategy selectors, notif badge
    │   │   ├── ManagerModeStyles.ts     # Styled components for manager mode controls
    │   │   └── VolumeControls.tsx  # Announcement + alert volume sliders with mute toggles
    │   ├── HitLog/index.tsx        # Hit log component
    │   ├── InstructionsModal/
    │   │   ├── index.tsx           # Full-screen scrollable <dialog>; 7 collapsible <details> sections; ✕ close button
    │   │   └── styles.ts           # Styled components; display:flex lives inside &[open] so native hidden state is respected
    │   ├── LineScore/
    │   │   ├── index.tsx           # Score/inning/strikes/balls/outs + FINAL banner when gameOver
    │   │   └── styles.ts           # Styled components for line score
    │   ├── NewGameDialog/
    │   │   ├── constants.ts        # DEFAULT_HOME_TEAM ("Yankees"), DEFAULT_AWAY_TEAM ("Mets")
    │   │   ├── index.tsx           # New-game dialog: team selectors, matchup mode, managed-team radio, player customisation
    │   │   ├── styles.ts           # Styled components for the new game dialog
    │   │   ├── PlayerCustomizationPanel.tsx    # Collapsible panel for editing per-player stat overrides and lineup order
    │   │   ├── PlayerCustomizationPanel.styles.ts
    │   │   ├── SortableBatterRow.tsx            # @dnd-kit drag handle row for reordering batting lineup
    │   │   ├── usePlayerCustomization.ts        # Hook: manages playerOverrides + lineupOrder state
    │   │   └── useTeamSelection.ts              # Hook: fetches MLB teams, manages home/away selection + league filter
    │   ├── PlayerStatsPanel/index.tsx  # Live batting stats table (AB / H / BB / K per player, per team tab)
    │   └── SavesModal/
    │       ├── index.tsx           # Save management overlay: list, create, load, delete, export, import
    │       ├── styles.ts           # Styled components for saves modal
    │       └── useSavesModal.ts    # Hook: calls SaveStore for all save CRUD operations
    └── test/                       # Shared test infrastructure only
        ├── setup.ts                # @testing-library/jest-dom + global mocks (SpeechSynthesis, AudioContext, Notification)
        └── testHelpers.ts          # makeState, makeContextValue, makeLogs, mockRandom
```

Tests are **co-located** next to their source files (e.g. `src/context/strategy.test.ts`, `src/hooks/useGameAudio.test.ts`, `src/components/Ball/Ball.test.tsx`). The only test files that do NOT live next to a source file are the shared helpers in `src/test/`.

---

## Path Aliases

All cross-directory imports use aliases (configured in `tsconfig.json` and `vitest.config.ts`):

| Alias | Resolves to |
|---|---|
| `@components/*` | `src/components/*` |
| `@context/*` | `src/context/*` |
| `@hooks/*` | `src/hooks/*` |
| `@utils/*` | `src/utils/*` |
| `@constants/*` | `src/constants/*` |
| `@storage/*` | `src/storage/*` |
| `@test/*` | `src/test/*` |

Same-directory imports remain relative (e.g. `"./styles"`, `"./constants"`).

---

## Key Architectural Notes

- All game state lives in `context/index.tsx` (`State` interface) and is mutated by `context/reducer.ts`.
- `components/GameControls/useGameControls.ts` is the single hook that wires all game-controls hooks and `localStorage` state together. `components/GameControls/index.tsx` consumes this hook and renders the controls UI. All underlying pitch/audio/replay logic lives in focused hooks under `src/hooks/`.
- `GameContext` is typed `createContext<ContextValue | undefined>(undefined)`. Always consume it via the `useGameContext()` hook exported from `@context/index` — **never** call `React.useContext(GameContext)` directly in components.
- **`ContextValue` extends `State`** and adds `dispatch: React.Dispatch<GameAction>`, `dispatchLog: React.Dispatch<LogAction>`, and `log: string[]` (play-by-play, most recent first). All three are provided by `GameProviderWrapper`.
- **`LogAction`** = `{ type: "log"; payload: string }`. **`GameAction`** = `{ type: string; payload?: unknown }`. Both are exported from `@context/index`.
- **`GameProviderWrapper`** accepts an optional `onDispatch?: (action: GameAction) => void` prop (stored internally in a ref, zero re-render overhead). `components/Game/index.tsx` owns `actionBufferRef` and passes it as `onDispatch` to capture every dispatched action.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `foul`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`, `reset`, `clear_suppress_decision`, `set_pinch_hitter_strategy`, `set_defensive_shift`.
- `detectDecision(state, strategy, managerMode)` is exported from `context/reducer.ts` and called in `usePitchDispatch` to detect decision points before each pitch.
- **Context module dependency order (no cycles):** `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`

---

## RxDB Persistence Layer (`src/storage/`)

Local-only IndexedDB persistence via **RxDB v16**. No replication, no sync, no leader election.

### Collections

| Collection | Purpose |
|---|---|
| `saves` | One header doc per save game (`SaveDoc`). Stores `setup`, `progressIdx`, `stateSnapshot` (full game `State` + `rngState` for deterministic resume), optional score/inning snapshots. |
| `events` | Append-only event log (`EventDoc`). One doc per dispatched action, keyed `${saveId}:${idx}`. Indexed on `saveId` and compound `[saveId, idx]`. |
| `teams` | MLB team cache (`TeamDoc`). Each team is individually upserted/deleted by numeric MLB ID. Replaces the old `localStorage` team cache. |

### SaveStore API (exported singleton from `@storage/saveStore`)

```ts
SaveStore.createSave(setup: GameSaveSetup, meta?: { name?: string }): Promise<string>
SaveStore.appendEvents(saveId: string, events: GameEvent[]): Promise<void>   // serialized per-save queue + in-memory idx counter
SaveStore.updateProgress(saveId: string, progressIdx: number, summary?: ProgressSummary): Promise<void>
SaveStore.listSaves(): Promise<SaveDoc[]>
SaveStore.deleteSave(saveId: string): Promise<void>
SaveStore.exportRxdbSave(saveId: string): Promise<string>   // FNV-1a signed JSON bundle
SaveStore.importRxdbSave(json: string): Promise<string>     // verifies signature, upserts docs, returns saveId
```

Use `makeSaveStore(getDbFn)` to create an isolated instance for tests (pass `_createTestDb`).

### Game Loop Integration

```
dispatch(action)
  ├─→ onDispatchRef.current(action)   ← pushes into actionBufferRef (Game/index.tsx)
  └─→ rawDispatch(action)             ← React state update → pitchKey++

useRxdbGameSync effect (runs when pitchKey changes, lives in GameInner.tsx)
  ├─→ guard: skip if rxSaveIdRef not yet set
  ├─→ drain actionBufferRef, filter non-game actions (reset, setTeams, restore_game)
  ├─→ wrap scalar payloads as { value } (set_one_pitch_modifier, set_defensive_shift)
  └─→ SaveStore.appendEvents(saveId, events tagged with pre-advance pitchKey)

half-inning / gameOver
  └─→ SaveStore.updateProgress(saveId, pitchKey, { stateSnapshot: { state, rngState } })

handleStart  → SaveStore.createSave(setup) → rxSaveIdRef
handleResume → rxSaveIdRef = existing save id (from listSaves → stateSnapshot)
```

### Non-object payload normalisation

`set_one_pitch_modifier` (string), `set_pinch_hitter_strategy` (string), and `set_defensive_shift` (boolean) dispatch scalar payloads. `useRxdbGameSync` wraps them as `{ value: payload }` before writing so the events schema's `object` requirement is always satisfied.

### Test helpers

`_createTestDb(name?)` in `db.ts` creates an in-memory RxDB database using `fake-indexeddb` (dev dependency). Each call appends a random suffix to the name to avoid cross-test registry collisions. Pass it to `makeSaveStore` in unit tests.

---

## Linting & Formatting

The project uses **ESLint v9** (flat config) + **Prettier v3**.

- **`eslint.config.mjs`** — flat config with TypeScript, React, React Hooks, `simple-import-sort`, and Prettier rules.
- **`.prettierrc`** — double quotes, trailing commas, `printWidth: 100`, LF line endings.
- `no-console` is turned **off** only for `src/utils/logger.ts` (it IS the logging abstraction).
- `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` are turned off for test files (`**/*.test.{ts,tsx}` and `src/test/**`).

**Import ordering** is enforced by `eslint-plugin-simple-import-sort` with these groups:
1. Side-effect imports (e.g. CSS)
2. React packages (`react`, `react-dom`, `react/*`)
3. Other external packages
4. Internal aliases (`@components`, `@context`, `@hooks`, `@utils`, `@constants`, `@storage`, `@test`)
5. Relative imports (`./`)

**Scripts:**

```bash
yarn lint          # ESLint check
yarn lint:fix      # ESLint auto-fix
yarn format        # Prettier write
yarn format:check  # Prettier check
```

The **CI lint workflow** (`.github/workflows/lint.yml`) runs `yarn lint` and `yarn format:check` on every push and PR.

---

## Seeded Randomness & Replay Sharing

All randomness is routed through `src/utils/rng.ts` (mulberry32 PRNG):

- **`initSeedFromUrl({ writeToUrl? })`** — reads `?seed=` from the URL; if absent, generates from `Math.random() ^ Date.now()`. Called once in `src/index.tsx` before the React tree mounts.
- **`random()`** — returns a deterministic float in `[0, 1)` from the seeded PRNG.
- **`buildReplayUrl()`** — returns the current URL with `?seed=<base36>` set.
- **`getSeed()`** — returns the current seed value (or null if not yet initialized).

---

## Auto-play Mode

Auto-play is implemented in `src/hooks/useAutoPlayScheduler.ts`:

- Speech-gated `setTimeout` scheduler (`tick`) that calls `handleClickRef.current()`. Uses refs so speed changes take effect immediately without stale closures.
- Manager Mode pausing — when `pendingDecision` is set, the scheduler returns early and restarts once the decision resolves.
- All settings are persisted in `localStorage` (`autoPlay`, `speed`, `announcementVolume`, `alertVolume`, `managerMode`, `strategy`, `managedTeam`) and restored on page load.

**Persistence split:**

| What | Where |
|---|---|
| Game save state + events | RxDB (`saves` + `events` collections via `useRxdbGameSync`) |
| MLB team roster cache | RxDB (`teams` collection, per-team upsert/delete by numeric ID) |
| UI preferences (speed, volume, managerMode, strategy, managedTeam) | `localStorage` (scalars only — no benefit to RxDB) |

---

## Player Customisation

Added in the New Game dialog (`NewGameDialog/`):

- **`PlayerCustomizationPanel`** — collapsible section to override per-player `BaseStats` (contact, power, speed, control) and reorder the batting lineup via drag-and-drop.
- **`SortableBatterRow`** — @dnd-kit drag handle row; uses `@dnd-kit/core` + `@dnd-kit/sortable`.
- **`usePlayerCustomization`** — manages `playerOverrides: TeamCustomPlayerOverrides` and `lineupOrder: number[]` state; merges API roster with user overrides.
- **`useTeamSelection`** — fetches MLB teams (from RxDB cache → API fallback), manages home/away selection and matchup-mode/league filter.
- Player overrides are passed from `NewGameDialog` → `GameInner` → `createSave`'s `setup.playerOverrides` field and stored in `SaveDoc.setup`.

---

## Manager Mode & Decision System

- **Decision detection** (`detectDecision` from `context/reducer.ts`) — evaluated before each pitch in `usePitchDispatch`. Returns one of: `steal`, `bunt`, `count30`, `count02`, `ibb`, `ibb_or_steal`, `pinch_hitter`, `defensive_shift`, or `null`.
- `DecisionPanel/index.tsx` renders the panel, plays a chime, shows a browser notification via service worker, and runs a 10-second countdown bar.

---

## Notification System (Service Worker)

`src/sw.ts` is a **module service worker** registered with `{ type: "module" }`. It pre-caches bundles, implements network-first + cache fallback, and listens for `notificationclick` events, posting `{ type: 'NOTIFICATION_ACTION', action, payload }` to the page.

**Logging**: imports `createLogger` from `@utils/logger` and creates its own `log` singleton tagged with the Parcel `version` hash.

---

## Shared Logger (`src/utils/logger.ts`)

- **`appLog`** — singleton for the main-app context. Import this directly; do not call `createLogger("app")` again.
- **SW logger** — `sw.ts` creates its own: `const log = createLogger(\`SW ${version.slice(0, 8)}\`)`.

---

## Build & Development

**Always run `yarn` (install) before building if `node_modules` is missing.**

```bash
yarn                  # install dependencies
yarn dev              # parcel serve src/*.html (hot reload on http://localhost:1234)
yarn build            # parcel build src/*.html → dist/
yarn test             # vitest run (one-shot)
yarn test:coverage    # vitest run --coverage (thresholds: lines/functions/statements 90%, branches 80%)
yarn lint             # ESLint check
yarn lint:fix         # ESLint auto-fix
yarn format:check     # Prettier check
```

**TypeScript** is compiled by Parcel (no standalone `tsc` build step). TypeScript errors surface as Parcel build errors.

---

## Validation

**Always run all validation steps locally and confirm they pass before using `report_progress` to commit and push.** CI failures on the branch are not acceptable.

Validate changes by:
1. `yarn lint` — zero errors/warnings required. Run `yarn lint:fix && yarn format` to auto-fix import order and Prettier issues before checking.
2. `yarn build` — confirms TypeScript compiles and the bundle is valid.
3. `yarn test` — all tests must pass. Run `yarn test:coverage` to verify coverage thresholds (lines/functions/statements ≥ 90%, branches ≥ 80%).

**Do not call `report_progress` until all three steps above pass locally.** If CI fails after a push, investigate it immediately using the GitHub MCP `list_workflow_runs` + `get_job_logs` tools, fix the failures, and push a corrective commit.

---

## Code Style & File Size

- **Target file length: ≤ 200 lines.** Aim for **100 lines or fewer** in ideal cases. Split if larger.
- **Test files are exempt from the 200-line limit.**
- **One test file per source file**, co-located next to the source (e.g. `strategy.ts` → `strategy.test.ts` in the same directory).
- **Shared test helpers live in `src/test/testHelpers.ts`** and export `makeState`, `makeContextValue`, `makeLogs`, and `mockRandom`. Import these instead of redeclaring them.

---

## Common Gotchas

- **`tsconfig.json` exists** with `moduleResolution: "node"` and path aliases. Parcel reads it automatically. Do not remove or change `moduleResolution` without testing the Parcel build.
- **Parcel v2 (not v1):** Use Parcel v2 conventions — the HTML `<script>` requires `type="module"`, no `"main"` field in `package.json`.
- **Service worker is a module worker:** `src/sw.ts` uses ES `import`/`export` and is registered with `{ type: "module" }`.
- **React 19:** Entry point uses `createRoot` from `react-dom/client`.
- **React import style:** Files use `import * as React from "react"` (not the default import).
- **Styled-components v6:** Custom props **must** be typed via generics, e.g. `styled.div<{ $active: boolean }>`. Use `$propName` (transient props) for non-HTML props.
- **No `React.FunctionComponent<{}>` — write `React.FunctionComponent` (no type param) for zero-prop components.
- **Node version:** Node 24.x (see `.nvmrc`).
- **`browserslist`** is set in `package.json` (`> 0.5%, last 2 versions, not dead`).
- **`webkitAudioContext`** — use `(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` for the Safari fallback in `audio.ts`.
- **Never import GameContext directly** — always use the `useGameContext()` hook from `@context/index`.
- **`announce.ts` is a barrel re-export** — always import from `@utils/announce`; never import directly from `tts.ts` or `audio.ts`.
- **Context module cycle-free order** — `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`. No module may import from a module later in this chain.
- **`Function` type is banned** — use explicit function signatures: `(action: GameAction) => void` for dispatch, `(action: LogAction) => void` for dispatchLog.
- **ESLint enforces import order** — run `yarn lint:fix` after adding imports to auto-sort them.
- **`@storage/*` alias** — always import from `@storage/saveStore`, `@storage/db`, `@storage/types`; never use relative paths across directories.
- **`SaveStore` is a singleton** backed by `getDb()`. For tests, use `makeSaveStore(_createTestDb)` — each call to `_createTestDb()` appends a random suffix to avoid RxDB registry collisions.
- **`_createTestDb` requires `fake-indexeddb/auto`** — import it at the top of any test file that calls `_createTestDb`. It is a dev-only dependency.
- **Non-object `GameAction` payloads** — `set_one_pitch_modifier`, `set_pinch_hitter_strategy`, and `set_defensive_shift` dispatch string/boolean payloads. `useRxdbGameSync` wraps them as `{ value }` before writing to the events schema. If you add a new action with a scalar payload, add it to the `NON_OBJECT_PAYLOAD_ACTIONS` set in `useRxdbGameSync.ts`.
- **`InstructionsModal` visibility** — `display: flex` lives inside `&[open]` in `styles.ts`. Never move it outside or the native `<dialog>` hidden state will be overridden and the modal will always be visible.
- **`mediaQueries.ts`** — use this for all CSS-in-JS breakpoints; never hardcode `@media (max-width: …)` strings inline.
- **`useAutoSave`** still exists alongside `useRxdbGameSync` — `useAutoSave` writes a `localStorage` snapshot for backwards compatibility; `useRxdbGameSync` writes the canonical RxDB record. Both run in parallel.
