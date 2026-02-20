# Copilot Instructions for Ballgame (self-playing-baseball)

## Project Overview

**Ballgame** is a **self-playing baseball simulator** built as a single-page React/TypeScript PWA. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar, share a deterministic replay link, enable auto-play mode, or turn on **Manager Mode** to make strategic decisions that influence the simulation. The app is installable on Android and desktop via a Web App Manifest.

**Repository size:** Small (~80 source files). **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Parcel v2.x. **Package manager:** Yarn Berry v4.

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
    │   └── rng.ts                  # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed
    ├── context/                    # All game state, reducer, and types
    │   ├── index.tsx               # GameContext, useGameContext(), State, ContextValue, GameProviderWrapper
    │   │                           #   Exports: LogAction, GameAction, Strategy, DecisionType, OnePitchModifier
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
    │   ├── useKeyboardPitch.ts     # Spacebar → pitch (skipped when autoPlay active)
    │   ├── usePlayerControls.ts    # All UI event handlers (autoplay, volume, mute, manager mode)
    │   ├── useReplayDecisions.ts   # Reads ?decisions= from URL and replays manager choices
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
    │   │   ├── index.tsx           # Wraps children in GameProviderWrapper
    │   │   ├── GameInner.tsx       # Two-column layout: left (play-by-play), right (ScoreBoard + Diamond)
    │   │   └── styles.ts           # Styled components for game layout
    │   ├── GameControls/
    │   │   ├── index.tsx           # GameControls component — wires all hooks + renders controls
    │   │   ├── constants.ts        # SPEED_SLOW (1200ms), SPEED_NORMAL (700ms), SPEED_FAST (350ms)
    │   │   ├── styles.ts           # Styled components for controls layout
    │   │   ├── ManagerModeControls.tsx  # Manager Mode checkbox, team/strategy selectors, notif badge
    │   │   ├── ManagerModeStyles.ts     # Styled components for manager mode controls
    │   │   └── VolumeControls.tsx  # Announcement + alert volume sliders with mute toggles
    │   ├── HitLog/index.tsx        # Hit log component
    │   ├── InstructionsModal/
    │   │   ├── index.tsx           # Instructions modal component
    │   │   └── styles.ts           # Styled components for modal
    │   └── LineScore/
    │       ├── index.tsx           # Score/inning/strikes/balls/outs + FINAL banner when gameOver
    │       └── styles.ts           # Styled components for line score
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
| `@test/*` | `src/test/*` |

Same-directory imports remain relative (e.g. `"./styles"`, `"./constants"`).

---

## Key Architectural Notes

- All game state lives in `context/index.tsx` (`State` interface) and is mutated by `context/reducer.ts`.
- `components/GameControls/index.tsx` dispatches all pitch actions and owns auto-play, speed, mute, manager mode, team selection, strategy, and share-replay controls. All stateful logic is split into focused hooks under `src/hooks/`.
- `GameContext` is typed `createContext<ContextValue | undefined>(undefined)`. Always consume it via the `useGameContext()` hook exported from `@context/index` — **never** call `React.useContext(GameContext)` directly in components.
- **`ContextValue` extends `State`** and adds `dispatch: React.Dispatch<GameAction>`, `dispatchLog: React.Dispatch<LogAction>`, and `log: string[]` (play-by-play, most recent first). All three are provided by `GameProviderWrapper`.
- **`LogAction`** = `{ type: "log"; payload: string }`. **`GameAction`** = `{ type: string; payload?: unknown }`. Both are exported from `@context/index`.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `foul`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`, `reset`, `clear_suppress_decision`, `set_pinch_hitter_strategy`, `set_defensive_shift`.
- `detectDecision(state, strategy, managerMode)` is exported from `context/reducer.ts` and called in `usePitchDispatch` to detect decision points before each pitch.
- **Context module dependency order (no cycles):** `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`

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
4. Internal aliases (`@components`, `@context`, `@hooks`, `@utils`, `@constants`, `@test`)
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

Validate changes by:
1. `yarn lint` — zero errors/warnings required.
2. `yarn build` — confirms TypeScript compiles and the bundle is valid.
3. `yarn test` — all 470 tests must pass. Run `yarn test:coverage` to verify coverage thresholds.

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
