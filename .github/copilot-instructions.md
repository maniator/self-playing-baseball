# Copilot Instructions for Ballgame (self-playing-baseball)

## Project Overview

**Ballgame** is a **self-playing baseball simulator** built as a React/TypeScript PWA with a **React Router data-router** route-first architecture. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users navigate to `/exhibition/new` to start a game, share a deterministic replay link, enable auto-play mode, or turn on **Manager Mode** to make strategic decisions that influence the simulation. The app is installable on Android and desktop via a Web App Manifest.

**Repository size:** ~96 source files. **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Vite v7. **Package manager:** Yarn Berry v4. **Persistence:** RxDB v17 (IndexedDB, local-only — no sync).

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
├── eslint.config.mjs               # ESLint flat config (TS + React + import-sort + Prettier + e2e overrides)
├── tsconfig.json                   # TypeScript config with path aliases (jsx: react-jsx)
├── vite.config.ts                  # Vite + Vitest config: React plugin, path aliases, vite-plugin-pwa, test section
├── playwright.config.ts            # Playwright E2E config: 7 projects (determinism + desktop/tablet/iphone-15-pro-max/iphone-15/pixel-7/pixel-5)
├── package.json                    # Scripts, dependencies, Husky/Commitizen config
├── yarn.lock
├── vercel.json                     # Vercel SPA routing + outputDirectory + SW headers (version 2)
├── public/                         # Static assets copied verbatim to dist/ by Vite (no hashing)
│   ├── manifest.webmanifest        # PWA manifest: name "Ballgame", icons, theme_color #000000
│   ├── og-image.png                # OG / Twitter card image (stable URL: /og-image.png)
│   └── images/
│       ├── baseball.svg            # SVG icon (baseball with red stitches on black bg) — favicon + source
│       ├── baseball-192.png        # PWA icon 192×192 (generated from baseball.svg)
│       ├── baseball-512.png        # PWA icon 512×512 / maskable (generated from baseball.svg)
│       ├── baseball-180.png        # Apple touch icon 180×180
│       └── favicon-32.png          # Fallback favicon 32×32
├── dist/                           # Build output (gitignored)
├── e2e/                            # Playwright E2E tests
│   ├── fixtures/
│   │   ├── sample-save.json        # FNV-1a signed save fixture for import tests
│   │   ├── pending-decision.json   # Inning 4 bottom, defensive_shift pending, managerMode on
│   │   ├── pending-decision-pinch-hitter.json  # Inning 7 top, pinch_hitter pending
│   │   └── mid-game-with-rbi.json  # Inning 5 top, 3-2 score, playLog has RBI entries
│   ├── tests/
│   │   ├── smoke.spec.ts           # App loads, Play Ball starts game, autoplay progresses
│   │   ├── determinism.spec.ts     # Same seed → same play-by-play (desktop-only project, two fresh IndexedDB contexts)
│   │   ├── save-load.spec.ts       # Save game, load game, autoplay resumes
│   │   ├── import.spec.ts          # Import fixture, save visible in list
│   │   ├── routing.spec.ts         # Route transitions: Home→/exhibition/new, /saves, /help, /teams/:id/edit (desktop-only)
│   │   ├── home.spec.ts            # Home screen buttons + resume-current-game flow
│   │   ├── modals.spec.ts          # In-game Saves modal + InstructionsModal smoke
│   │   ├── responsive-smoke.spec.ts # Scoreboard/field/log visible & non-zero on all viewports
│   │   ├── layout.spec.ts          # Layout pixel-diff snapshots
│   │   ├── manage-teams-and-custom-game-flow.spec.ts  # Full Create/Edit/Delete team + start custom game
│   │   ├── custom-team-editor.spec.ts  # Team editor form interactions (desktop)
│   │   ├── custom-team-editor-mobile-and-regressions.spec.ts  # Mobile team editor regressions
│   │   ├── stats.spec.ts           # Live batting stats + hit log correctness
│   │   ├── batting-stats.spec.ts   # Stat-budget regression
│   │   ├── stat-budget.spec.ts     # Stat-budget smoke
│   │   ├── starting-pitcher-selection.spec.ts  # Custom-game starting pitcher selector
│   │   ├── manager-mode.spec.ts    # Manager Mode toggle + strategy selector
│   │   ├── notifications.spec.ts   # Browser notification permission + service worker message
│   │   ├── substitution.spec.ts    # Pinch hitter substitution flow
│   │   ├── qa-regression.spec.ts   # Miscellaneous QA regression tests
│   │   └── visual/                 # Pixel-diff snapshots per page (baselines per project)
│   └── utils/
│       └── helpers.ts              # resetAppState, startGameViaPlayBall, waitForLogLines(page, count, timeout?),
│                                   # captureGameSignature(page, minLines?, logTimeout?), openSavesModal,
│                                   # saveCurrentGame, loadFirstSave, importSaveFromFixture,
│                                   # assertFieldAndLogVisible, disableAnimations, loadFixture,
│                                   # configureNewGame(page, options?)
└── src/
    ├── index.html                  # HTML entry point for Vite (script has type="module", image hrefs are absolute /…)
    ├── index.scss                  # Global styles + mobile media queries
    ├── index.tsx                   # React entry: initSeedFromUrl, registers /sw.js, createRoot
    ├── router.tsx                  # createBrowserRouter + RouterProvider; defines full route tree (/, /exhibition/new, /game, /teams, /teams/:id/edit, /saves, /help)
    ├── sw.ts                       # Service worker: uses self.__WB_MANIFEST (injected by vite-plugin-pwa), caches bundles, handles notificationclick
    ├── constants/
    │   ├── hitTypes.ts             # Hit enum: Single, Double, Triple, Homerun, Walk
    │   └── pitchTypes.ts           # PitchType enum + selectPitchType, pitchName helpers
    ├── utils/                      # Pure utilities (no React)
    │   ├── announce.ts             # Barrel re-export: re-exports everything from tts.ts and audio.ts
    │   ├── audio.ts                # Web Audio API: playDecisionChime, playVictoryFanfare, play7thInningStretch
    │   ├── tts.ts                  # Web Speech API: announce, cancelAnnouncements, setSpeechRate, isSpeechPending
    │   ├── getRandomInt.ts         # Random number helper — delegates to rng.ts random()
    │   ├── logger.ts               # Shared colored console logger; exports createLogger(tag) + appLog singleton
    │   ├── mediaQueries.ts         # Breakpoints + mq helpers: mq.mobile, mq.desktop, mq.tablet, mq.notMobile
    │   ├── mlbTeams.ts             # Fetches MLB teams from MLB Stats API; caches per-team in RxDB `teams` collection
    │   ├── rng.ts                  # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed, getRngState, restoreRng
    │   └── saves.ts                # currentSeedStr() — returns current seed as base-36 string
    ├── storage/                    # RxDB local-only persistence (IndexedDB, no sync)
    │   ├── db.ts                   # Lazy-singleton BallgameDb; collections: saves, events, teams; exports getDb(), savesCollection(), eventsCollection(), _createTestDb()
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
    │   ├── useAutoPlayScheduler.ts # Speech-gated setTimeout scheduler; pauses when isRouteActive=false (off /game route)
    │   ├── useKeyboardPitch.ts     # Spacebar → pitch (skipped when autoPlay active)
    │   ├── usePlayerControls.ts    # All UI event handlers (autoplay, volume, mute, manager mode)
    │   ├── useReplayDecisions.ts   # Reads ?decisions= from URL and replays manager choices
    │   ├── useRxdbGameSync.ts      # Drains actionBufferRef → appendEvents on pitchKey advance;
    │   │                           #   calls updateProgress (with full stateSnapshot) on half-inning / game-over
    │   ├── useSaveStore.ts         # useLiveRxQuery wrapper for reactive saves list + stable write callbacks
    │   ├── useCustomTeams.ts       # useLiveRxQuery wrapper for the customTeams RxDB collection
    │   └── useShareReplay.ts       # Clipboard copy of replay URL
    ├── components/                 # All UI components
    │   ├── AppShell/
    │   │   └── index.tsx           # Persistent layout (display:none trick keeps Game mounted); provides AppShellOutletContext
    │   │                           #   AppShellOutletContext: { onStartGame, onLoadSave }
    │   │                           #   pathnameToScreen() maps URL → Screen type; "other" is the intentional catch-all for outlet-rendered routes (/exhibition/new, etc.)
    │   ├── HomeScreen/
    │   │   ├── index.tsx           # Home screen: New Game / Load Saved Game / Manage Teams / Help buttons
    │   │   └── styles.ts           # Styled components for home screen
    │   ├── ManageTeamsScreen/
    │   │   ├── index.tsx           # Route-aware screen: list view at /teams, editor at /teams/:id/edit and /teams/new
    │   │   ├── TeamListItem.tsx    # Single team row (edit/delete buttons)
    │   │   └── styles.ts           # Styled components for manage teams screen
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
    │   │   ├── index.tsx           # Owns actionBufferRef; wraps tree with RxDatabaseProvider + GameProviderWrapper
    │   │   ├── ErrorBoundary.tsx   # React error boundary — catches render errors, clears stale localStorage keys
    │   │   ├── GameInner.tsx       # Top-level layout: NewGameDialog, LineScore, GameControls, two-column body
    │   │   │                       #   Calls useSaveStore().createSave() on handleStart; hosts useRxdbGameSync
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
    │   │   └── styles.ts           # Styled components for modal
    │   ├── LineScore/
    │   │   ├── index.tsx           # Score/inning/strikes/balls/outs + FINAL banner when gameOver
    │   │   └── styles.ts           # Styled components for line score
    │   ├── NewGameDialog/
    │   │   ├── constants.ts        # DEFAULT_HOME_TEAM ("Yankees"), DEFAULT_AWAY_TEAM ("Mets")
    │   │   ├── index.tsx           # Modal dialog for starting a new game: team name inputs + managed-team radio selection
    │   │   └── styles.ts           # Styled components for the new game dialog
    │   ├── PlayerStatsPanel/index.tsx  # Live batting stats table
    │   └── SavesModal/
    │       ├── index.tsx           # Save management overlay: list, create, load, delete, export, import
    │       ├── styles.ts           # Styled components for saves modal
    │       └── useSavesModal.ts    # Hook: calls useSaveStore for all save CRUD operations
    ├── features/
    │   └── customTeams/
    │       └── adapters/
    │           └── customTeamAdapter.ts  # customTeamToDisplayName, customTeamToGameId,
    │                                     #   customTeamToPlayerOverrides, customTeamToLineupOrder,
    │                                     #   customTeamToPitcherRoster, customTeamToBenchRoster,
    │                                     #   resolveTeamLabel (resolves `custom:<id>` or raw team name)
    └── pages/
        ├── ExhibitionSetupPage/
        │   ├── index.tsx           # Full-page Exhibition Setup — primary New Game entry point (/exhibition/new)
        │   │                       #   Defaults to Custom Teams tab; uses useExhibitionSetup hook
        │   │                       #   No IIFEs in JSX: computed variables derive managedSpPitchers/managedStarterIdx before return
        │   │                       #   Starter pitcher selector extracted to StarterPitcherSelector.tsx
        │   ├── MlbTeamsSection.tsx # MLB-specific form fields (matchup radios, team selects, player customization)
        │   ├── StarterPitcherSelector.tsx  # Dropdown for managed-team starting pitcher — independently testable
        │   ├── styles.ts           # Styled components for the exhibition setup page
        │   └── useExhibitionSetup.ts  # Hook: orchestrates team selection, custom team logic, starter pitcher, form submit
        ├── HelpPage/
        │   ├── index.tsx           # Standalone How to Play page at /help; browser back returns to previous page
        │   └── styles.ts           # Styled components for help page
        └── SavesPage/
            ├── index.tsx           # Exhibition Saves page at /saves; loads from SaveStore directly (no RxDatabaseProvider needed)
            │                       #   Load action routes through AppShellOutletContext → AppShell mounts Game and navigates to /game
            └── styles.ts           # Styled components for saves page
```

Tests are **co-located** next to their source files (e.g. `src/context/strategy.test.ts`, `src/hooks/useGameAudio.test.ts`, `src/components/Ball/Ball.test.tsx`). The only test files that do NOT live next to a source file are the shared helpers in `src/test/`.

---

## Path Aliases

All cross-directory imports use aliases (configured in `tsconfig.json` and `vite.config.ts`):

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
- **`GameProviderWrapper`** accepts an optional `onDispatch?: (action: GameAction) => void` prop. `components/Game/index.tsx` uses this to buffer every dispatched action into `actionBufferRef` for RxDB sync.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `foul`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`, `reset`, `clear_suppress_decision`, `set_pinch_hitter_strategy`, `set_defensive_shift`, `restore_game`.
- `detectDecision(state, strategy, managerMode)` is exported from `context/reducer.ts` and called in `usePitchDispatch` to detect decision points before each pitch.
- **Context module dependency order (no cycles):** `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`

---

## RxDB Persistence Layer (`src/storage/`)

Local-only IndexedDB persistence via **RxDB v17** (`rxdb@17.0.0-beta.7`). No replication, no sync, no leader election.

### React integration — `rxdb/plugins/react`

**Provider setup** (`src/components/Game/index.tsx`):  
`Game` initializes the database via `getDb()`, then wraps the entire tree with `<RxDatabaseProvider database={db}>`. Until the DB promise resolves the tree renders `null`.

**`useSaveStore` hook** (`src/hooks/useSaveStore.ts`):  
Uses `useLiveRxQuery` from `rxdb/plugins/react` to subscribe to the `saves` collection reactively. Exposes stable `useCallback` wrappers for all write operations. Always import from `@hooks/useSaveStore`; **never** call `SaveStore` methods directly in UI components.

`useSaveStore` **requires `<RxDatabaseProvider>`** in the tree. In component tests mock the entire hook:

```ts
vi.mock("@hooks/useSaveStore", () => ({
  useSaveStore: vi.fn(() => ({ saves: [], createSave: vi.fn(), ... })),
}));
```

**Dev-mode plugin** (`src/storage/db.ts`):  
`RxDBDevModePlugin` is registered via a dynamic `import()` inside `initDb`, guarded by `import.meta.env.MODE === "development"`. Dead-code-eliminated in production; never loaded in tests.

### Schema versioning & migration

**Any change to a collection's JSON schema MUST follow this checklist or it will break production for existing users (RxDB DB6 error).**

1. **Bump `version`** in the collection's `RxJsonSchema` (e.g. `version: 1` → `version: 2`).
2. **Add a migration strategy** for the new version in the `migrationStrategies` object passed to `addCollections`. The strategy must be a pure function that accepts an old document and returns a valid new document — it must **never throw**.
3. **Write defensive strategies** — always handle missing or `undefined` fields with a fallback value (`?? default`). Never assume the old document is complete.
4. **Test the upgrade path** — add a unit test that creates a real DB at the old schema version, inserts a legacy document, closes the DB, reopens it with the new code, and asserts all fields survive migration intact. See `src/storage/db.test.ts` `schema migration: v0 → v1` for the pattern.
5. **Never change a schema's `properties` or `required` at the same version** — doing so changes the schema hash and causes RxDB to throw DB6 for every existing user. If the change is purely descriptive (adding `title`/`description` annotations) and `additionalProperties: true` is set, it is still a hash change.

```ts
// ✅ Correct: bump version + safe identity strategy
{ version: 2,
  migrationStrategies: {
    2: (oldDoc) => ({ ...oldDoc, newField: oldDoc.newField ?? "default" }),
  }
}

// ❌ Wrong: schema changed but version unchanged — DB6 for all existing users
{ version: 1, /* properties added/changed */ }
```

**Last-resort fallback** (`getDb()` in `src/storage/db.ts`): if `initDb()` throws with RxError code `DB6` (hash mismatch at same version) or `DM4` (migration strategy execution failed), the entire database is wiped and recreated, and a user-facing reset notice is shown. This fallback exists only as a safety net — it must never be the primary recovery path. Every schema change must have a proper migration strategy so the fallback never fires.

### Collections

| Collection | Purpose |
|---|---|
| `saves` | One header doc per save game (`SaveDoc`). Stores setup, progressIdx, stateSnapshot (full game `State` + `rngState`). **Current schema version: 1.** |
| `events` | Append-only event log (`EventDoc`). One doc per dispatched action, keyed `${saveId}:${idx}`. |
| `teams` | MLB team cache (`TeamDoc`). Each team individually upserted/deleted by numeric MLB ID. |

### SaveStore API

```ts
SaveStore.createSave(setup: GameSaveSetup, meta?: { name?: string }): Promise<string>
SaveStore.appendEvents(saveId: string, events: GameEvent[]): Promise<void>
SaveStore.updateProgress(saveId: string, progressIdx: number, summary?: ProgressSummary): Promise<void>
SaveStore.deleteSave(saveId: string): Promise<void>
SaveStore.exportRxdbSave(saveId: string): Promise<string>   // FNV-1a signed JSON bundle
SaveStore.importRxdbSave(json: string): Promise<string>     // verifies signature, upserts docs
```

Use `makeSaveStore(getDbFn)` to create an isolated instance for tests.

### Game Loop Integration

```
dispatch(action)
  ├─→ onDispatchRef.current(action)   ← pushes into actionBufferRef (Game/index.tsx)
  └─→ rawDispatch(action)             ← React state update → pitchKey++

useRxdbGameSync (runs when pitchKey changes, lives in GameInner.tsx)
  ├─→ drain actionBufferRef, filter non-game actions (reset, setTeams, restore_game)
  └─→ SaveStore.appendEvents(saveId, events)

half-inning / gameOver
  └─→ SaveStore.updateProgress(saveId, pitchKey, { stateSnapshot: { state, rngState } })
```

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

## Route Architecture (Stage 4A)

The app uses React Router's data router (`createBrowserRouter` + `RouterProvider`) defined in `src/router.tsx`. `AppShell` is the persistent layout element; it keeps the `Game` component mounted using a `display:none` trick so game state survives route transitions.

| Route | Component | Notes |
|---|---|---|
| `/` | `HomeScreen` | New Game, Load Saved Game, Manage Teams, Help buttons |
| `/exhibition/new` | `ExhibitionSetupPage` | Primary new-game entry point; defaults to Custom Teams tab |
| `/game` | `Game` (via AppShell) | The game is always mounted; autoplay pauses when not on this route |
| `/teams` | `ManageTeamsScreen` | Custom team list |
| `/teams/new` | `ManageTeamsScreen` (create view) | URL-routed editor; browser-back returns to list |
| `/teams/:id/edit` | `ManageTeamsScreen` (edit view) | Loader redirects to `/teams` if team ID missing; shows loading/not-found states on deep-link |
| `/saves` | `SavesPage` | Standalone saves list; navigates to `/game` only after a save is loaded |
| `/help` | `HelpPage` | How to Play; browser back returns to previous page |

**AppShellOutletContext** — child routes (`/exhibition/new`, `/saves`) call back to AppShell via outlet context:
- `onStartGame(setup: ExhibitionGameSetup)` — mounts game with the provided setup and navigates to `/game`
- `onLoadSave(slot: SaveDoc)` — restores game from a save and navigates to `/game`

---



Auto-play is implemented in `src/hooks/useAutoPlayScheduler.ts`:

- Speech-gated `setTimeout` scheduler (`tick`) that calls `handleClickRef.current()`. Uses refs so speed changes take effect immediately without stale closures.
- **Route-aware pause** — when `isRouteActive` is `false` (i.e., the user is not on `/game`), the scheduler returns early and does not advance the game. It resumes automatically when `isRouteActive` becomes `true` again.
- Manager Mode pausing — when `pendingDecision` is set, the scheduler returns early and restarts once the decision resolves.
- All settings are persisted in `localStorage` (`autoPlay`, `speed`, `announcementVolume`, `alertVolume`, `managerMode`, `strategy`, `managedTeam`) and restored on page load.

**Persistence split:**

| What | Where |
|---|---|
| Game save state + events | RxDB (`saves` + `events` collections via `useRxdbGameSync`) |
| MLB team roster cache | RxDB (`teams` collection, per-team upsert/delete by numeric ID) |
| UI preferences (speed, volume, managerMode, strategy, managedTeam) | `localStorage` (scalars only) |

---

## Manager Mode & Decision System

- **Decision detection** (`detectDecision` from `context/reducer.ts`) — evaluated before each pitch in `usePitchDispatch`. Returns one of: `steal`, `bunt`, `count30`, `count02`, `ibb`, `ibb_or_steal`, `pinch_hitter`, `defensive_shift`, or `null`.
- `DecisionPanel/index.tsx` renders the panel, plays a chime, shows a browser notification via service worker, and runs a 10-second countdown bar.

---

## Notification System (Service Worker)

`src/sw.ts` is a **module service worker** registered at `/sw.js` with `{ type: "module" }`. It uses `self.__WB_MANIFEST` (the precache list injected at build time by `vite-plugin-pwa`'s `injectManifest` strategy), implements network-first + cache fallback, and listens for `notificationclick` events, posting `{ type: 'NOTIFICATION_ACTION', action, payload }` to the page.

**Logging**: imports `createLogger` from `@utils/logger` and creates its own `log` singleton tagged with a version derived from the manifest content hashes.

**Service worker must NOT initialize or use RxDB** — RxDB is window-only.

---

## Shared Logger (`src/utils/logger.ts`)

- **`appLog`** — singleton for the main-app context. Import this directly; do not call `createLogger("app")` again.
- **SW logger** — `sw.ts` creates its own: `const log = createLogger(\`SW ${version.slice(0, 8)}\`)` where `version` is derived from `self.__WB_MANIFEST` content hashes.

---

## Build & Development

**Always run `yarn` (install) before building if `node_modules` is missing.**

```bash
yarn                  # install dependencies
yarn dev              # vite dev server (hot reload on http://localhost:5173)
yarn build            # vite build → dist/
yarn test             # vitest run (one-shot)
yarn test:coverage    # vitest run --coverage (thresholds: lines/functions/statements 90%, branches 80%)
yarn test:e2e         # build app then run all Playwright E2E tests headlessly
yarn test:e2e:ui      # open Playwright UI mode for interactive debugging
yarn test:e2e:update-snapshots  # regenerate visual regression baseline PNGs (local only — do NOT commit; use the update-visual-snapshots workflow instead, see Visual snapshots section)
yarn lint             # ESLint check
yarn lint:fix         # ESLint auto-fix
yarn format:check     # Prettier check
```

**TypeScript** is type-checked by editors / `tsc --noEmit`; Vite uses esbuild to strip types at build time. TypeScript errors surface as build errors only if `tsc` is run explicitly.

---

## Validation

**Always run all validation steps locally and confirm they pass before using `report_progress` to commit and push.** CI failures on the branch are not acceptable.

Validate changes by:
1. `yarn lint` — zero errors/warnings required. Run `yarn lint:fix && yarn format` to auto-fix import order and Prettier issues before checking.
2. `yarn build` — confirms TypeScript compiles and the bundle is valid.
3. `yarn test` — all tests must pass. Run `yarn test:coverage` to verify coverage thresholds (lines/functions/statements ≥ 90%, branches ≥ 80%).
4. `yarn test:e2e` — all Playwright E2E tests must pass (builds the app, then runs all 7 projects headlessly). If adding/changing UI components that have `data-testid` selectors or affect the play-by-play log, visual baselines may need updating — the **`update-visual-snapshots`** workflow fires **automatically** on every push to any non-master branch. You can also trigger it manually: Actions → "Update Visual Snapshots" → Run workflow. Never run `yarn test:e2e:update-snapshots` locally and commit the result — local rendering differs from the CI container.

**Do not call `report_progress` until all four steps above pass locally.** If CI fails after a push, investigate it immediately using the GitHub MCP `list_workflow_runs` + `get_job_logs` tools, fix the failures, and push a corrective commit.

---

## Code Style & File Size

- **American English spelling** — use American English in all user-facing copy, help text, comments, and documentation (e.g. "randomized" not "randomised", "customization" not "customisation"). Help copy must reflect currently implemented behavior only.
- **Target file length: ≤ 200 lines.** Aim for **100 lines or fewer** in ideal cases. Split if larger.
- **Test files are exempt from the 200-line limit.**
- **One test file per source file**, co-located next to the source (e.g. `strategy.ts` → `strategy.test.ts` in the same directory).
- **Shared test helpers live in `src/test/testHelpers.ts`** and export `makeState`, `makeContextValue`, `makeLogs`, and `mockRandom`. Import these instead of redeclaring them.

---

## No Duplication Policy

**Before building anything, check whether the logic or UI already exists elsewhere.** If the same behaviour is needed in two or more places, extract it to a shared home first, then have both consumers import from there.

### Decision tree

| What is duplicated? | Where to put the shared version |
|---|---|
| Pure utility function (formatting, file I/O, math) | `src/utils/` or `src/storage/` (e.g. `saveIO.ts`) |
| Domain adapter / resolver (label resolution, ID mapping) | `src/features/<domain>/adapters/` |
| React hook (state management, side effects) | `src/hooks/` |
| Styled-component definitions used by ≥ 2 pages/screens | `src/components/<SharedName>/styles.ts` |
| JSX content block rendered in ≥ 2 surfaces (modal + page) | `src/components/<SharedName>/index.tsx` |
| Page-level layout chrome (`PageContainer`, `BackBtn`, etc.) | `src/components/PageLayout/styles.ts` |

### Existing shared modules (extend these, do not re-implement)

| Module | What it provides |
|---|---|
| `@storage/saveIO` | `formatSaveDate`, `downloadJson`, `readFileAsText`, `saveFilename` |
| `@components/PageLayout/styles` | `PageContainer`, `PageHeader`, `BackBtn` (used by SavesPage, HelpPage, ManageTeamsScreen) |
| `@components/HelpContent` | All help/how-to-play section JSX (used by InstructionsModal + HelpPage) |
| `@components/SaveSlotList` | Save row list UI + Load/Export/Delete buttons (used by SavesModal + SavesPage) |
| `@features/customTeams/adapters/customTeamAdapter` | `resolveTeamLabel`, `resolveCustomIdsInString`, `customTeamToDisplayName`, etc. |
| `@test/testHelpers` | `makeState`, `makeContextValue`, `makeLogs`, `mockRandom` |

### Rules

- **Never copy a utility function** — if it exists in the table above, import it.
- **Never redefine styled-components** that are already in a shared styles file — import them.
- **When you notice duplication**, fix it before adding more: extract first, then wire both consumers.
- **Duplication in tests is acceptable** when it aids test readability, but shared test setup belongs in `@test/testHelpers`.

---

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

### `data-testid` reference

All stable test selectors added to the app:

**Home screen:** `home-screen`, `home-new-game-button`, `home-resume-current-game-button`, `home-load-saves-button`, `home-manage-teams-button`, `home-help-button`

**Exhibition Setup page (`/exhibition/new`):** `exhibition-setup-page`, `new-game-back-home-button`, `new-game-mlb-teams-tab`, `new-game-custom-teams-tab`, `matchup-mode-select`, `home-team-select`, `away-team-select`, `seed-input`, `play-ball-button`, `team-validation-error`, `starting-pitcher-select`

**Saves page (`/saves`):** `saves-page`, `saves-page-back-button`, `saves-list`, `saves-list-item`, `saves-page-empty`, `load-save-button`, `export-save-button`, `delete-save-button`, `import-save-file-input`, `import-error`

**Help page (`/help`):** `help-page`, `help-page-back-button`

**Manage Teams (`/teams`, `/teams/new`, `/teams/:id/edit`):** `manage-teams-screen`, `manage-teams-back-button`, `manage-teams-create-button`, `custom-team-list`, `custom-team-list-item`, `custom-team-edit-button`, `custom-team-delete-button`, `manage-teams-editor-shell`, `manage-teams-editor-back-button`

**In-game controls (GameControls / SavesModal):** `saves-button`, `saves-modal`, `saves-modal-close-button`, `save-game-button`, `import-save-textarea`, `import-save-button`, `back-to-home-button`

**Game view:** `new-game-dialog`, `scoreboard`, `field-view`, `play-by-play-log`, `log-panel`, `hit-log`, `manager-mode-toggle`, `manager-decision-panel`, `db-reset-notice`

### Visual snapshots

Committed baseline PNGs live in `e2e/tests/visual.spec.ts-snapshots/` named `<screen>-<project>-linux.png`. These baselines are rendered inside the `mcr.microsoft.com/playwright:v1.58.2-noble` container (the same image used by `playwright-e2e.yml`), so they must **always** be regenerated inside that same container to guarantee pixel-identical rendering.

**Never run `yarn test:e2e:update-snapshots` locally and commit the result.** Local OS fonts and rendering differ from the CI container, causing false visual-diff failures on every subsequent CI run.

When an intentional UI change requires new baselines, the **`update-visual-snapshots`** workflow handles it automatically:
- It fires **automatically** on every push to any non-master branch.
- For manual control: **Actions → "Update Visual Snapshots" → Run workflow → select your branch → Run workflow**.
- The workflow runs inside the same Playwright container as CI, regenerates all snapshot PNGs, and commits them back to your branch (without `[skip ci]`), so `playwright-e2e.yml` runs against the updated baselines on that commit.
- Do **not** regenerate snapshots unless you are intentionally changing a visual.

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

`.github/workflows/update-visual-snapshots.yml` — sole snapshot regeneration workflow:
- Runs inside the **same** `mcr.microsoft.com/playwright:v1.58.2-noble` container as `playwright-e2e.yml`.
- **Auto-trigger:** every push to any non-master branch.
- **Manual trigger:** Actions → "Update Visual Snapshots" → Run workflow → select branch.
- Commits updated PNGs back to the branch; the commit triggers `playwright-e2e` to validate them.
- Concurrency group: cancels stale queued runs when a newer push arrives.
- Use this workflow — **not** `yarn test:e2e:update-snapshots` locally — whenever baselines need refreshing.

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
| `pending-decision-pinch-hitter.json` | Inning 7 top, pinch_hitter pending + 2 candidates, custom teams | Pinch-hitter dropdown visual snapshot |
| `mid-game-with-rbi.json` | Inning 5 top, 3-2 score, playLog has RBI entries | RBI stats display + save/reload persistence |

### Authoring a new fixture

Fixtures are signed JSON bundles (`RxdbExportedSave` format). The signature is a FNV-1a 32-bit checksum:

```python
RXDB_EXPORT_KEY = "ballgame:rxdb:v1"

def fnv1a(s: str) -> str:
    h = 0x811c9dc5
    for c in s:
        h ^= ord(c)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, '08x')

def make_sig(header, events):
    # JSON.stringify with no extra whitespace (separators=(',', ':'))
    inner = json.dumps({"header": header, "events": events}, separators=(',', ':'))
    return fnv1a(RXDB_EXPORT_KEY + inner)

payload = {"version": 1, "header": header, "events": events, "sig": make_sig(header, events)}
```

**Key fields in `header.stateSnapshot.state`:**

| Field | Purpose | Notes |
|---|---|---|
| `pendingDecision` | Decision panel state | `null` = no panel; `{ kind: "defensive_shift" }` = shift panel; `{ kind: "pinch_hitter", candidates: [...], teamIdx: 0, lineupIdx: N }` = dropdown |
| `managerMode` (in `setup`) | Shows the DecisionPanel | Must be `true` for any pending-decision fixture |
| `managedTeam` (in `setup`) | Which team is managed | `0` = away, `1` = home |
| `playLog` | RBI / hit stats | Each entry needs `{ inning, half, batterNum, team, event, runs, rbi }` where `event` is the Hit enum value (Single=0, Double=1, Triple=2, Homerun=3, Walk=4) |
| `inningRuns` | Line-score display | `inningRuns[team][inning-1]` = runs that team scored in that inning |
| `lineupOrder` | Player IDs in batting order | `[[], []]` for default MLB games; populate for custom-team games |
| `playerOverrides` | Custom names/positions/stat mods | Use player IDs as keys |
| `resolvedMods` | Pre-computed stat mods | Needed for `pinch_hitter` candidates' `contactMod`/`powerMod` to be accurate |
| `rosterBench` | Bench player IDs | Required for `pinch_hitter` decisions to show candidates |

**Minimal fixture checklist:**

1. Build `header` dict with `id`, `name`, `seed`, `matchupMode`, `homeTeamId`, `awayTeamId`, `schemaVersion: 1`, `setup`, and `stateSnapshot`
2. Start from `BASE_STATE` (all array/object fields present with safe defaults) and override only what you need
3. Compute `sig = make_sig(header, events=[])` in Python using the snippet above
4. Place file in `e2e/fixtures/<name>.json`
5. Use `await loadFixture(page, "<name>.json")` in the test

**Using the Python generator script in `/tmp/gen-fixtures.py`** (see existing fixtures) is the recommended approach — it produces all fixtures in one run and prints each signature for verification.

### State restoration mechanics

When `loadFixture` imports a save, `useSavesModal.ts` calls `handleLoad` which:
1. `dispatch({ type: "restore_game", payload: snap.state })` — applies `stateSnapshot.state` via `backfillRestoredState` (safe-defaults for any missing fields)
2. `onSetupRestore({ strategy, managedTeam, managerMode })` — writes to localStorage
3. `onLoadActivate(slot.id)` — sets `gameActive = true` so the DecisionPanel renders
4. Closes the modal

Because `pendingDecision` is part of `State` and `backfillRestoredState` merges `restored` over `fresh` defaults, a fixture that carries `pendingDecision: { kind: "defensive_shift" }` will render the manager decision panel instantly on load — no pitch needs to be thrown.

---



- **`tsconfig.json`** has `moduleResolution: "node"`, `jsx: "react-jsx"`, and path aliases. Vite reads it automatically via `vite.config.ts`. Do not change `moduleResolution` without testing the build and tests.
- **Single config file:** `vite.config.ts` is the only config for both Vite (build/dev) and Vitest (tests). It imports `defineConfig` from `vitest/config`. There is no separate `vitest.config.ts`.
- **Static assets live in `public/`** (not `src/`): `public/images/`, `public/manifest.webmanifest`, `public/og-image.png`. Vite copies them verbatim to `dist/` at their original paths — no content hashing. HTML references these with absolute paths (`/images/…`, `/manifest.webmanifest`).
- **Service worker is a module worker:** `src/sw.ts` is built by `vite-plugin-pwa` (`injectManifest` strategy, `rollupFormat: "es"`), output as `dist/sw.js`, and registered via `navigator.serviceWorker.register("/sw.js", { type: "module" })`.
- **`self.__WB_MANIFEST`** is the precache list injected into `sw.ts` at build time by `vite-plugin-pwa`. It is declared locally in `sw.ts` — do not import from any external package.
- **Lazy-loaded components:** `InstructionsModal`, `SavesModal`, and `DecisionPanel` are loaded via `React.lazy()` in `GameControls/index.tsx` and wrapped in `<React.Suspense fallback={null}>`. Do not convert them back to static imports.
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
- **`SaveStore` is a singleton** backed by `getDb()`. For tests, use `makeSaveStore(_createTestDb(getRxStorageMemory()))` — each call to `_createTestDb()` appends a random suffix to avoid RxDB registry collisions.
- **`_createTestDb` requires `fake-indexeddb/auto`** — import it at the top of any test file that calls `_createTestDb`. It is a dev-only dependency.
- **`useSaveStore` requires `<RxDatabaseProvider>`** in the tree. Mock the hook in component tests with `vi.mock("@hooks/useSaveStore", ...)`.
- **RxDB schema changes MUST bump `version` and add a migration strategy** — any change to a collection's `properties`, `required`, or `indexes` at the same version number causes a DB6 schema hash mismatch for every existing user, blocking app startup. Always: (1) increment `version`, (2) add a `migrationStrategies` entry that never throws, (3) add an upgrade-path unit test. See `### Schema versioning & migration` in the RxDB section above.
- **Service worker must NOT initialize or use RxDB** — RxDB is window-only. The service worker only handles notifications and lightweight message passing.
- **`InstructionsModal` visibility** — `display: flex` lives inside `&[open]` in `styles.ts`. Never move it outside or the native `<dialog>` hidden state will be overridden.
- **Do NOT use `@vitest/browser` for E2E tests** — `@vitest/browser` (with the Playwright provider) runs component tests *inside* a real browser, but it cannot do page navigation, multi-step user flows, or visual regression. Use `@playwright/test` (in `e2e/`) for all end-to-end tests. The two test runners serve different purposes and coexist without conflict.
- **No IIFEs in JSX** — never use `(() => { ... })()` inside JSX. IIFEs create a new function reference on every render causing unnecessary re-renders and unpredictable behaviour. Instead, compute values as `const` variables before the `return` statement and reference them directly in JSX. For non-trivial conditional rendering blocks, extract them into a named sub-component (e.g. `StarterPitcherSelector` in `ExhibitionSetupPage/`) to keep them independently testable.
- **`SavesModal` no longer has `autoOpen`/`openSavesRequestCount`/`onRequestClose`/`closeLabel` props** — these were removed when "Load Saved Game" became a dedicated `/saves` route. The modal now always closes with a simple `close()`. Do not re-add these props.
- **Seed input is on ExhibitionSetupPage** — the seed is settable via `data-testid="seed-input"` on `/exhibition/new`. On form submit, `reinitSeed(seedStr)` in `rng.ts` re-initializes the PRNG and updates `?seed=` in the URL. Seeds can be set either via URL parameter at startup (`initSeedFromUrl` — one-shot) OR via the seed input field at runtime (`reinitSeed` — callable any time). E2E tests fill this field via `configureNewGame(page, { seed: "..." })` — no URL navigation needed.
- **Always use `mq` helpers in styled-components** — never write raw `@media` strings inline. Import `mq` from `@utils/mediaQueries` and interpolate: `${mq.mobile} { … }`, `${mq.desktop} { … }`, `${mq.tablet} { … }`, `${mq.notMobile} { … }`. This keeps all breakpoints in sync with the SCSS variables in `index.scss`. Breakpoints: mobile ≤ 768 px, desktop ≥ 1024 px.
- **NewGameDialog mobile compaction** — `NewGameDialog/styles.ts` uses `${mq.mobile}` blocks on every styled component (Dialog, Title, FieldGroup, FieldLabel, Input, Select, SectionLabel, RadioLabel, ResumeButton, Divider, PlayBallButton, SeedHint) to reduce padding/margins so the modal fits without scrolling on phone viewports. `PlayerCustomizationPanel.styles.ts` does the same for `PanelSection`. The Dialog's `max-height` uses `min(96dvh, 820px)` on mobile (vs `90dvh` on desktop) to reclaim browser-chrome space. Never revert these to desktop-only values.
- **Viewport-safe modal sizing** — always use `dvh` (dynamic viewport height) units, not bare `vh`, for modal `max-height`. `100vh` on mobile browsers can exceed the visible area because it ignores browser chrome (address bar, navigation bar). `dvh` tracks the actual visible viewport. The `responsive-smoke.spec.ts` E2E test verifies the Play Ball button bottom edge is within `viewport.height` on all projects.
- **`ResumeLabel` span in NewGameDialog** — the "Resume: " prefix inside `ResumeButton` is wrapped in `<ResumeLabel>` (exported from `NewGameDialog/styles.ts`). `ResumeLabel` uses `display: none` inside `${mq.mobile}` so on phone viewports the button shows "▶ {saveName}" (shorter) while desktop still shows "▶ Resume: {saveName}". Do not remove this span or inline the text directly into `ResumeButton`.
- **`responsive-smoke.spec.ts` New Game dialog tests** — three tests guard the no-scroll contract on all viewport projects: (1) Play Ball button bottom edge ≤ viewport height; (2) critical fields (`matchup-mode-select`, `home-team-select`, `away-team-select`, `seed-input`, `play-ball-button`) all have bottom edges within viewport height; (3) `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal overflow). Always keep these passing when touching NewGameDialog layout.
