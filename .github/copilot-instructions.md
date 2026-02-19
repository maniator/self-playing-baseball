# Copilot Instructions for self-playing-baseball

## Project Overview

This is a **self-playing baseball game simulator** built as a single-page React/TypeScript web application. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar, share a deterministic replay link, enable auto-play mode, or turn on **Manager Mode** to make strategic decisions that influence the simulation.

**Repository size:** Small (~20 source files). **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Parcel v2.x. **Package manager:** Yarn (classic).

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
    │   ├── announce.ts         # Web Speech API + Web Audio API; exports announce, cancelAnnouncements,
    │   │                       #   setAnnouncementVolume, getAnnouncementVolume, setAlertVolume,
    │   │                       #   getAlertVolume, setSpeechRate, isSpeechPending, playDecisionChime
    │   ├── getRandomInt.ts     # Random number helper — delegates to rng.ts random()
    │   └── rng.ts              # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed
    ├── Context/
    │   ├── index.tsx           # GameContext, State interface, GameProviderWrapper
    │   │                       #   State fields: strikes, balls, outs, inning, score, atBat, teams,
    │   │                       #   baseLayout, hitType, log, gameOver, pendingDecision, onePitchModifier,
    │   │                       #   pitchKey, decisionLog
    │   └── reducer.ts          # All game logic; exports detectDecision(); strategy modifiers via stratMod()
    ├── Announcements/          # Play-by-play log with "PLAY-BY-PLAY" heading + empty-state placeholder
    ├── Ball/                   # Ball animation component
    ├── BatterButton/
    │   └── index.tsx           # "Batter Up!" + "Share replay" + auto-play/speed/mute/manager controls
    ├── DecisionPanel/
    │   └── index.tsx           # Manager decision UI: prompt, action buttons, 10s countdown bar,
    │   │                       #   auto-skip timer, notification actions listener (SW messages)
    ├── Diamond/                # Baseball diamond — self-contained with FieldWrapper container
    ├── Game/
    │   ├── index.tsx           # Wraps children in GameProviderWrapper + GitHub ribbon
    │   └── GameInner.tsx       # Two-column layout: left (play-by-play), right (ScoreBoard + Diamond)
    └── ScoreBoard/             # Score/inning/strikes/balls/outs + FINAL banner when gameOver
```

**Key architectural notes:**
- All game state lives in `Context/index.tsx` (`State` interface) and is mutated by `Context/reducer.ts`.
- `BatterButton/index.tsx` dispatches all pitch actions (`strike`, `wait`, `hit`) and all manager/decision actions. It also owns auto-play, speed, mute, manager mode, team selection, strategy, and share-replay controls.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`.
- `Hit` enum values correspond directly to base advancement in `reducer.ts` (`moveBase`).
- `detectDecision(state, strategy, managerMode)` is exported from `reducer.ts` and called in `BatterButton` to detect decision points before each pitch.

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

`BatterButton/index.tsx` includes a fully self-contained auto-play system:

- **Auto-play checkbox** — starts/stops a `setInterval` that calls the same `handleClickButton` used by manual play. Uses a `handleClickRef` so speed changes restart the interval cleanly without stale closures.
- **`strikesRef`** — keeps the latest `strikes` value accessible to the interval without adding it to the `useEffect` dependency array, preventing interval restarts on every pitch.
- **Speed selector** — Slow (1200 ms), Normal (700 ms), Fast (350 ms).
- **Mute toggle** — calls `setMuted()` from `announce.ts` to suppress Web Speech API. Auto-enabled when auto-play is turned on.
- **Manager Mode pausing** — when Manager Mode is ON and a `pendingDecision` is set, the auto-play `useEffect` returns early (no interval created). The interval restarts automatically once the decision is resolved (pendingDecision → null).
- All settings are persisted in `localStorage` (`autoPlay`, `speed`, `muted`, `managerMode`, `strategy`, `managedTeam`) and restored on page load.

---

## Manager Mode & Decision System

`BatterButton/index.tsx` owns the Manager Mode feature:

- **Manager Mode toggle** — when ON, exposes Team and Strategy selectors and activates the decision pipeline.
- **Team selector** — the user picks which team (index `0` or `1`) they manage. Decisions are only detected when `atBat === managedTeam`; the opponent's at-bats auto-play normally.
- **Strategy selector** — Balanced / Aggressive / Patient / Contact / Power. Applied via `stratMod(strategy, key)` in `reducer.ts` to bias probabilities (walk chance, strikeout, HR, contact, steal success, runner advancement).
- **Decision detection** (`detectDecision` from `reducer.ts`) — evaluated before each pitch when the managed team is at bat. Returns one of: `steal`, `bunt`, `count30`, `count02`, `ibb`, or `null`.
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
2. Shows a browser notification with action buttons when the tab is hidden (via service worker — see below).
3. Runs a 10-second countdown bar (green→orange→red). Auto-skips when it reaches zero.
4. Closes the notification when the decision resolves.
5. Listens for `NOTIFICATION_ACTION` messages from the service worker and dispatches the matching reducer action.

---

## Notification System (Service Worker)

`src/sw.ts` is a classic-script service worker (no `export`/`import`, bundled by Parcel as `dist/sw.js`):

- Registered in `src/index.tsx` via `navigator.serviceWorker.register(new URL('./sw.ts', import.meta.url))`.
- Listens for `notificationclick` events (both notification-body click and action-button click).
- Posts `{ type: 'NOTIFICATION_ACTION', action: string, payload: DecisionType }` to the first available `WindowClient`.
- Always calls `client.focus()` to bring the tab to the foreground.
- **Logging**: every lifecycle event (`install`, `activate`, `notificationclick`) emits `[SW vX.Y.Z]` prefixed `console.log` / `console.error` messages. These appear in DevTools → Application → Service Workers → **Inspect** console. Increment `SW_VERSION` at the top of `sw.ts` whenever the file changes so logs identify which build is active.

**Action strings** match reducer action identifiers: `steal`, `bunt`, `take`, `swing`, `protect`, `normal`, `ibb`, `skip`, `focus` (focus-only, no game action).

Notifications are only shown when `document.hidden` is true (tab not visible). The `requireInteraction: false` setting allows OS to auto-dismiss them. Tagged `"manager-decision"` so duplicate notifications are replaced and they can be closed programmatically when the decision resolves.

**Graceful degradation:** if the SW or Notifications API is unavailable, the chime and in-page panel still work normally; the notification step is silently skipped.

---

## Layout

`GameInner.tsx` uses a **two-column flex layout** (no absolute positioning for game elements):

- **Top:** `GameInfo` — welcome text, team name inputs, `BatterButton` (controls + decision panel).
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

- **Bottom of 9th (no tie):** `checkGameOver` in `reducer.ts` is called inside `nextHalfInning`. If `inning >= 9` and the home team is leading at the end of their half-inning, `gameOver: true` is set.
- **Walk-off:** `checkWalkoff` is called after every `hit`, `bunt_attempt`, and `intentional_walk`. If the home team takes the lead during the bottom of the 9th+, the game ends immediately.
- When `gameOver` is true, the reducer returns the current state unchanged for all actions except `setTeams` and `nextInning`. `BatterButton` disables the "Batter Up!" button and the auto-play interval stops pitching.

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

**There are no lint or test scripts.** The project has no ESLint, Prettier, Jest, or other testing/linting configuration. Do not attempt to run `yarn lint`, `yarn test`, or similar — they do not exist.

**TypeScript** is compiled by Parcel (no standalone `tsc` build step and no `tsconfig.json`). TypeScript errors will surface as Parcel build errors.

**Commit style:** The repo uses Commitizen with `cz-conventional-changelog` (enforced by a Husky `prepare-commit-msg` hook). When committing interactively, use `git cz` instead of `git commit`.

---

## Validation

Since there are no automated tests or linters, validate changes by:
1. Running `yarn build` — a successful exit with output in `dist/` confirms TypeScript compiles and the bundle is valid.
2. Running `yarn dev` and opening the browser to verify runtime behaviour if a UI change was made.

---

## Common Gotchas

- **No `tsconfig.json`:** TypeScript options are inferred by Parcel. Do not add a `tsconfig.json` unless also configuring Parcel to use it.
- **Parcel v2 (not v1):** The bundler is now `parcel` (not `parcel-bundler`). Use Parcel v2 conventions: the HTML `<script>` tag requires `type="module"`, node_modules CSS must be imported from JS/TS (not SCSS `@import`), and there is no `"main"` field in `package.json`.
- **Service worker must be a classic script:** `src/sw.ts` must NOT use `export` or `import` statements (Parcel will error: "Service workers cannot have imports or exports without the `type: 'module'` option"). Use `/// <reference lib="webworker" />` for types only.
- **React 19:** Entry point uses `createRoot` from `react-dom/client` (not the old `ReactDOM.render`).
- **React import style:** Files use `import * as React from "react"` (not the default import). Follow this pattern.
- **Styled-components v6:** Use the v6 API. Custom props on styled components **must** be typed via generics, e.g. `styled.div<{ teamAtBat: boolean }>`. Use `$propName` (transient props) for non-HTML props to prevent DOM forwarding warnings.
- **Node version:** The project targets Node 24.x (see `.nvmrc`). Use `nvm use` to switch if needed.
- **No test infrastructure:** Do not add tests unless the issue explicitly requests it.
- **`browserslist`** is set in `package.json` (`> 0.5%, last 2 versions, not dead`). This is required for Parcel v2 to bundle all dependencies (including React) into the output JS file for the browser.
- **`webkitAudioContext`** — use `(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` rather than `(window as any)` for the Safari fallback in `announce.ts`.
