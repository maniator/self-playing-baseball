# Copilot Instructions for self-playing-baseball

## Project Overview

This is a **self-playing baseball game simulator** built as a single-page React/TypeScript web application. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar, share a deterministic replay link, enable auto-play mode, or turn on **Manager Mode** to make strategic decisions that influence the simulation.

**Repository size:** Small (~55 source files). **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Parcel v2.x. **Package manager:** Yarn (classic).

---

## Repository Layout

```
/
├── .github/                    # GitHub config (copilot-instructions.md, workflows/)
├── .yarn/                      # Yarn releases
├── .yarnrc                     # Yarn config
├── .gitignore
├── .nvmrc                      # Node version: 24
├── package.json                # Scripts, dependencies, Husky/Commitizen config
├── yarn.lock
├── vercel.json                 # Vercel SPA routing config (version 2)
├── dist/                       # Build output (gitignored, except dist/robots.txt and dist/sw.js)
└── src/
    ├── index.html              # HTML entry point for Parcel (script has type="module")
    ├── index.scss              # Global styles + mobile media queries
    ├── index.tsx               # React entry: initSeedFromUrl, registers sw.ts, createRoot
    ├── sw.ts                   # Service worker: handles notificationclick → posts NOTIFICATION_ACTION to page
    ├── constants/
    │   └── hitTypes.ts         # Hit enum: Single, Double, Triple, Homerun, Walk
    ├── utilities/
    │   ├── announce.ts         # Barrel re-export: re-exports everything from tts.ts and audio.ts
    │   ├── audio.ts            # Web Audio API: setAlertVolume, getAlertVolume, playDecisionChime,
    │   │                       #   playVictoryFanfare, play7thInningStretch
    │   ├── tts.ts              # Web Speech API: announce, cancelAnnouncements, setAnnouncementVolume,
    │   │                       #   getAnnouncementVolume, setSpeechRate, isSpeechPending
    │   ├── getRandomInt.ts     # Random number helper — delegates to rng.ts random()
    │   ├── localStorage.ts     # localStorage helpers: loadBool, loadInt, loadFloat, loadString
    │   ├── logger.ts           # Shared colored console logger; exports createLogger(tag) + appLog singleton
    │   └── rng.ts              # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed
    ├── Context/
    │   ├── index.tsx           # GameContext (typed createContext<ContextValue | undefined>(undefined)),
    │   │                       #   useGameContext() hook, State interface, GameProviderWrapper
    │   │                       #   State fields: strikes, balls, outs, inning, score, atBat, teams,
    │   │                       #   baseLayout, hitType, gameOver, pendingDecision, onePitchModifier,
    │   │                       #   pitchKey, decisionLog
    │   ├── strategy.ts         # stratMod(strategy, stat) — returns probability multiplier per strategy
    │   ├── advanceRunners.ts   # advanceRunners(type, baseLayout) — pure baseball base-advancement logic
    │   ├── gameOver.ts         # checkGameOver, checkWalkoff, nextHalfInning
    │   ├── playerOut.ts        # playerOut — handles out count, 3-out half-inning transitions
    │   ├── hitBall.ts          # hitBall — pop-out check, callout log, run scoring
    │   ├── playerActions.ts    # playerStrike, playerBall, playerWait, stealAttempt, buntAttempt
    │   └── reducer.ts          # Reducer factory; exports detectDecision(), re-exports stratMod
    ├── Announcements/          # Play-by-play log with "PLAY-BY-PLAY" heading + empty-state placeholder
    ├── Ball/
    │   ├── constants.ts        # hitDistances: pixel travel distance per Hit type for animation
    │   └── index.tsx           # Ball animation component; key={pitchKey} restarts CSS animation each pitch
    ├── DecisionPanel/
    │   ├── constants.ts        # DECISION_TIMEOUT_SEC (10), NOTIF_TAG ("manager-decision")
    │   ├── DecisionButtonStyles.ts  # Styled-component button variants for decision actions
    │   ├── DecisionButtons.tsx # Decision action button groups per decision kind
    │   ├── notificationHelpers.ts  # showManagerNotification, closeManagerNotification,
    │   │                           #   getNotificationBody, getNotificationActions,
    │   │                           #   ServiceWorkerNotificationOptions interface
    │   ├── styles.ts           # Styled components for DecisionPanel layout
    │   └── index.tsx           # Manager decision UI: prompt, action buttons, 10s countdown bar,
    │                           #   auto-skip timer, notification actions listener (SW messages)
    ├── Diamond/
    │   ├── index.tsx           # Baseball diamond — self-contained with FieldWrapper container
    │   └── styles.ts           # Styled components for diamond layout
    ├── Game/
    │   ├── index.tsx           # Wraps children in GameProviderWrapper + GitHub ribbon
    │   ├── GameInner.tsx       # Two-column layout: left (play-by-play), right (ScoreBoard + Diamond)
    │   └── styles.ts           # Styled components for game layout
    ├── GameControls/           # Formerly BatterButton — all game-control UI and logic
    │   ├── index.tsx           # GameControls component — wires all hooks + renders controls
    │   ├── constants.ts        # SPEED_SLOW (1200ms), SPEED_NORMAL (700ms), SPEED_FAST (350ms)
    │   ├── styles.ts           # Styled components for controls layout
    │   ├── ManagerModeControls.tsx  # Manager Mode checkbox, team/strategy selectors, notif badge
    │   ├── ManagerModeStyles.ts    # Styled components for manager mode controls
    │   ├── VolumeControls.tsx  # Announcement + alert volume sliders with mute toggles
    │   └── hooks/
    │       ├── useGameRefs.ts          # Syncs all stable refs (autoPlay, muted, speed, etc.)
    │       ├── useGameAudio.ts         # Victory fanfare + 7th-inning stretch; betweenInningsPauseRef
    │       ├── usePitchDispatch.ts     # handleClickRef — pitch logic + manager decision detection
    │       ├── useAutoPlayScheduler.ts # Speech-gated setTimeout scheduler; cancelled flag + extraWait reset
    │       ├── useKeyboardPitch.ts     # Spacebar → pitch (skipped when autoPlay active)
    │       ├── usePlayerControls.ts    # All UI event handlers (autoplay, volume, mute, manager mode)
    │       └── useShareReplay.ts       # Clipboard copy of replay URL
    ├── InstructionsModal/
    │   ├── index.tsx           # Instructions modal component
    │   └── styles.ts           # Styled components for modal
    └── ScoreBoard/             # Score/inning/strikes/balls/outs + FINAL banner when gameOver
```

**Key architectural notes:**
- All game state lives in `Context/index.tsx` (`State` interface) and is mutated by `Context/reducer.ts`.
- `GameControls/index.tsx` (formerly `BatterButton`) dispatches all pitch actions and owns auto-play, speed, mute, manager mode, team selection, strategy, and share-replay controls. All stateful logic is split into focused hooks under `GameControls/hooks/`.
- `GameContext` is typed `createContext<ContextValue | undefined>(undefined)`. Always consume it via the `useGameContext()` hook exported from `Context/index.tsx` — **never** call `React.useContext(GameContext)` directly in components.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `foul`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`, `reset`.
- `Hit` enum values correspond directly to base advancement in `advanceRunners.ts`.
- `detectDecision(state, strategy, managerMode)` is exported from `reducer.ts` and called in `usePitchDispatch` to detect decision points before each pitch.
- **Context module dependency order (no cycles):** `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `playerActions` → `reducer`

---

## Seeded Randomness & Replay Sharing

All randomness is routed through `src/utilities/rng.ts` (mulberry32 PRNG):

- **`initSeedFromUrl({ writeToUrl? })`** — reads `?seed=` from the URL (base10 or base36); if absent, generates a new seed from `Math.random() ^ Date.now()` and optionally writes it to the URL via `history.replaceState`. Called once in `src/index.tsx` before the React tree mounts.
- **`random()`** — returns a deterministic float in `[0, 1)` from the seeded PRNG. Used by `getRandomInt` everywhere in the app.
- **`buildReplayUrl()`** — returns the current URL with `?seed=<base36>` set. Used by the "Share replay" button.
- **`getSeed()`** — returns the current seed value (or null if not yet initialized).

The same seed produces identical play-by-play sequences. Sharing the URL with `?seed=` lets anyone replay the exact same game.

---

## Auto-play Mode

Auto-play is implemented in `GameControls/hooks/useAutoPlayScheduler.ts`:

- **Auto-play checkbox** — starts/stops a speech-gated `setTimeout` scheduler (`tick`) that calls `handleClickRef.current()`. Uses `handleClickRef` so speed changes take effect immediately without stale closures.
- **`strikesRef`** — keeps the latest `strikes` value accessible without re-running the scheduler effect.
- **Speed selector** — Slow (1200 ms), Normal (700 ms), Fast (350 ms). Speech rate scales with speed via `setSpeechRate()`.
- **Volume sliders** — separate range inputs for 🔊 announcement (TTS) volume and 🔔 alert (chime/fanfare) volume (both 0–1, persisted to localStorage). `mutedRef` tracks `announcementVolume === 0` so the scheduler skips speech-wait when silent.
- **Manager Mode pausing** — when Manager Mode is ON and a `pendingDecision` is set, the scheduler effect returns early. It restarts automatically once the decision is resolved (`pendingDecision → null`).
- **`cancelled` flag** — set in the effect cleanup function; every scheduled `tick` callback checks this flag before proceeding, preventing stale callbacks from running after unmount or re-render.
- **`extraWait` reset** — `extraWait` is reset to `0` immediately before `handleClickRef.current()` is called, ensuring the speech-wait budget starts fresh for each new pitch.
- All settings are persisted in `localStorage` (`autoPlay`, `speed`, `announcementVolume`, `alertVolume`, `managerMode`, `strategy`, `managedTeam`) and restored on page load.

---

## Manager Mode & Decision System

`GameControls/index.tsx` and its hooks own the Manager Mode feature:

- **Manager Mode toggle** — when ON, exposes Team and Strategy selectors and activates the decision pipeline.
- **Team selector** — the user picks which team (index `0` or `1`) they manage. Decisions are only detected when `atBat === managedTeam`; the opponent's at-bats auto-play normally.
- **Strategy selector** — Balanced / Aggressive / Patient / Contact / Power. Applied via `stratMod(strategy, key)` in `strategy.ts` to bias probabilities (walk chance, strikeout, HR, contact, steal success, runner advancement).
- **Decision detection** (`detectDecision` from `reducer.ts`) — evaluated before each pitch (in `usePitchDispatch`) when the managed team is at bat. Returns one of: `steal`, `bunt`, `count30`, `count02`, `ibb`, `ibb_or_steal`, or `null`.
- **`skipDecisionRef`** — after a decision is resolved the next pitch skips re-detection to prevent an immediate repeat decision on the same pitch.

**Decision types and conditions:**
| Kind | Condition | Actions |
|------|-----------|---------|
| `steal` | Runner on 1st or 2nd, <2 outs | Yes (with success %), Skip |
| `bunt` | Runner on 1st or 2nd, <2 outs | Yes, Skip |
| `count30` | Count is 3-0 | Take (walk↑), Swing away, Skip |
| `count02` | Count is 0-2 | Protect (contact↑), Normal swing, Skip |
| `ibb` | Runner on 2nd/3rd, 1st base open | Yes IBB, Skip |

`DecisionPanel/index.tsx` renders the panel and:
1. Plays a two-note chime via `playDecisionChime()` (Web Audio API, respects mute).
2. Shows a browser notification with action buttons **always** (regardless of tab visibility) via service worker. Also adds a `visibilitychange` listener that re-sends the notification if the user switches away while the decision is still pending.
3. Runs a 10-second countdown bar (green→orange→red). Auto-skips when it reaches zero.
4. Closes the notification when the decision resolves.
5. Listens for `NOTIFICATION_ACTION` messages from the service worker and dispatches the matching reducer action.

---

## Notification System (Service Worker)

`src/sw.ts` is a **module service worker** registered with `{ type: "module" }` (Parcel 2.16.4+ compiles it to a non-module worker automatically when needed for older targets):

- Registered in `src/index.tsx` via `navigator.serviceWorker.register(new URL('./sw.ts', import.meta.url), { type: "module" })`. Registration success/failure are both logged via `appLog`.
- Imports `@parcel/service-worker` for `manifest` (list of all bundle URLs) and `version` (hash that changes each build). Uses these to pre-cache all bundles on `install` and clean stale caches on `activate`.
- Implements a **network-first + cache fallback** fetch handler for same-origin GET requests.
- Listens for `notificationclick` events (both notification-body click and action-button click).
- Posts `{ type: 'NOTIFICATION_ACTION', action: string, payload: DecisionType }` to the first available `WindowClient`.
- Always calls `client.focus()` to bring the tab to the foreground.
- **Logging**: imports `createLogger` from `utilities/logger.ts` and creates its own `log` singleton tagged with the Parcel `version` hash (first 8 chars). Every lifecycle event (`install`, `activate`, `fetch`, `notificationclick`, `message`) emits CSS-colored console messages visible in DevTools → Application → Service Workers → **Inspect** console.

**Action strings** match reducer action identifiers: `steal`, `bunt`, `take`, `swing`, `protect`, `normal`, `ibb`, `skip`, `focus` (focus-only, no game action).

Notifications use `requireInteraction: true` so they stay visible until the user acts. Tagged `"manager-decision"` so duplicate notifications replace the previous one and they can be closed programmatically when the decision resolves.

**Graceful degradation:** if the SW or Notifications API is unavailable, the chime and in-page panel still work normally; the notification step is silently skipped.

---

## Shared Logger (`src/utilities/logger.ts`)

Two singletons are vended from this module — one per runtime context:

- **`appLog`** — pre-created singleton exported from `logger.ts`. Import this directly in all main-app files. The ES module cache guarantees exactly one instance per page load.
- **SW logger** — `sw.ts` imports `createLogger` and creates its own singleton: `const log = createLogger(\`SW ${version.slice(0, 8)}\`)`.

Both produce identical CSS `%c` badge output:
- 🟢 Green tag — normal log events
- 🟡 Amber tag — warnings  
- 🔴 Red tag — errors

**Do not** call `createLogger("app")` in individual app files — import `{ appLog }` from `utilities/logger` instead.

---

## Layout

`GameInner.tsx` uses a **two-column flex layout** (no absolute positioning for game elements):

- **Top:** `GameInfo` — welcome text, team name inputs, `GameControls` (controls + decision panel).
- **Body (`GameBody`):** `align-items: flex-start` flex row:
  - **Left panel (`LeftPanel`):** `flex: 1` — `Announcements` with "PLAY-BY-PLAY" heading, empty-state prompt, `max-height: 500px` scroll. Separated from right column by a subtle `border-right`.
  - **Right panel (`RightPanel`):** `width: 310px` — `ScoreBoard` stacked above `Diamond`.
- **Mobile (≤800px):** `GameBody` switches to `flex-direction: column`; `RightPanel` switches to `flex-direction: row` (ScoreBoard and Diamond side-by-side).

**Diamond (`src/Diamond/index.tsx`):**
- `FieldWrapper`: `position: relative; overflow: hidden; height: 280px` — self-contained clipping container. Mobile: 200px.
- `OutfieldDiv`: `position: absolute; right: 0; bottom: 65px; transform: rotate(45deg)` — anchored within `FieldWrapper` (not the whole page). The `bottom: 65px` offset ensures home plate is fully visible. No `z-index: -1` needed since there is no overlap.

**ScoreBoard:** flows naturally (no `position: absolute`). Full-width within the 310px right panel. Shows a red "FINAL" banner when `gameOver` is true.

---

## Game-Over Logic

- **Bottom of 9th (no tie):** `checkGameOver` in `gameOver.ts` is called inside `nextHalfInning`. If `inning >= 9` and the home team is leading at the end of their half-inning, `gameOver: true` is set.
- **Walk-off:** `checkWalkoff` is called after every `hit`, `bunt_attempt`, and `intentional_walk`. If the home team takes the lead during the bottom of the 9th+, the game ends immediately.
- When `gameOver` is true, the reducer returns the current state unchanged for all actions except `setTeams`, `nextInning`, and `reset`. `GameControls` disables the "Batter Up!" button and the auto-play interval stops pitching.

---

## Build & Development

**Always run `yarn` (install) before building if `node_modules` is missing.**

```bash
# Install dependencies
yarn

# Start development server (hot reload on http://localhost:1234)
yarn dev          # parcel serve src/*.html

# Production build (outputs to dist/)
yarn build        # parcel build src/*.html
```

**There are test scripts.** The project uses Vitest with `@testing-library/react`. Run `yarn test` for a one-shot pass and `yarn test:coverage` for the coverage report (thresholds: lines/functions/statements 90%, branches 80%).

**TypeScript** is compiled by Parcel (no standalone `tsc` build step and no `tsconfig.json`). TypeScript errors will surface as Parcel build errors.

**Commit style:** The repo uses Commitizen with `cz-conventional-changelog` (enforced by a Husky `prepare-commit-msg` hook). When committing interactively, use `git cz` instead of `git commit`.

---

## Validation

Validate changes by:
1. Running `yarn build` — a successful exit with output in `dist/` confirms TypeScript compiles and the bundle is valid.
2. Running `yarn test` — all tests must pass. Run `yarn test:coverage` to verify coverage thresholds.
3. Running `yarn dev` and opening the browser to verify runtime behaviour if a UI change was made.

---

## Code Style & File Size

- **Target file length: ≤ 200 lines.** Aim for **100 lines or fewer** in ideal cases. If a file grows beyond 200 lines it must be split into smaller, individually testable modules.
- **How to split:** extract pure logic into separate utility/helper files, move styled-components into a companion `styles.ts`, and break large components into focused sub-components or custom hooks (following the pattern already established in `GameControls/hooks/`).
- **Why:** smaller files are easier to review, test in isolation, and reason about. The existing codebase already follows this pattern — maintain it.

---

## Common Gotchas

- **No `tsconfig.json`:** TypeScript options are inferred by Parcel. Do not add a `tsconfig.json` unless also configuring Parcel to use it.
- **Parcel v2 (not v1):** The bundler is now `parcel` (not `parcel-bundler`). Use Parcel v2 conventions: the HTML `<script>` tag requires `type="module"`, node_modules CSS must be imported from JS/TS (not SCSS `@import`), and there is no `"main"` field in `package.json`.
- **Service worker is a module worker:** `src/sw.ts` uses `import`/`export` and is registered with `{ type: "module" }`. Parcel 2.16.4 bundles it correctly and downgrades to a classic worker automatically when the browserslist targets require it. The `/// <reference lib="webworker" />` directive at the top provides TypeScript types for `self`, `clients`, `ExtendableEvent`, `NotificationEvent`, etc.
- **React 19:** Entry point uses `createRoot` from `react-dom/client` (not the old `ReactDOM.render`).
- **React import style:** Files use `import * as React from "react"` (not the default import). Follow this pattern.
- **Styled-components v6:** Use the v6 API. Custom props on styled components **must** be typed via generics, e.g. `styled.div<{ teamAtBat: boolean }>`. Use `$propName` (transient props) for non-HTML props to prevent DOM forwarding warnings.
- **Node version:** The project targets Node 24.x (see `.nvmrc`). Use `nvm use` to switch if needed.
- **No test infrastructure:** Do not add tests unless the issue explicitly requests it. Test files live in `src/__tests__/`; the vitest config excludes entry points (`index.tsx`, `sw.ts`).
- **`browserslist`** is set in `package.json` (`> 0.5%, last 2 versions, not dead`). This is required for Parcel v2 to bundle all dependencies (including React) into the output JS file for the browser.
- **`webkitAudioContext`** — use `(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` rather than `(window as any)` for the Safari fallback in `announce.ts`.
- **Never import GameContext directly** — always consume it via the `useGameContext()` hook exported from `Context/index.tsx`. Direct `React.useContext(GameContext)` calls will throw if used outside the provider and lose type safety.
- **`announce.ts` is a barrel re-export** — it simply re-exports everything from `tts.ts` and `audio.ts`. Always import from `utilities/announce` as the public API; never import directly from `tts.ts` or `audio.ts`.
- **Context module cycle-free order** — when adding new Context modules, respect the dependency order: `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `playerActions` → `reducer`. No module may import from a module later in this chain.
