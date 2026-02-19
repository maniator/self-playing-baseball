# Copilot Instructions for self-playing-baseball

## Project Overview

This is a **self-playing baseball game simulator** built as a single-page React/TypeScript web application. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar, share a deterministic replay link, or enable auto-play mode.

**Repository size:** Small (~16 source files). **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Parcel v2.x. **Package manager:** Yarn (classic).

---

## Repository Layout

```
/
├── .github/                    # GitHub config (this file lives here)
├── .yarn/                      # Yarn releases
├── .yarnrc                     # Yarn config
├── .gitignore
├── .nvmrc                      # Node version: 24
├── package.json                # Scripts, dependencies, Husky/Commitizen config
├── yarn.lock
├── vercel.json                 # Vercel SPA routing config (version 2)
├── dist/                       # Build output (gitignored, except dist/robots.txt)
└── src/
    ├── index.html              # HTML entry point for Parcel (script has type="module")
    ├── index.scss              # Global styles + mobile media queries (no @import of node_modules)
    ├── index.tsx               # React entry: imports ribbon CSS, calls initSeedFromUrl, createRoot
    ├── constants/
    │   └── hitTypes.ts         # Hit enum: Single, Double, Triple, Homerun, Walk
    ├── utilities/
    │   ├── announce.ts         # Web Speech API wrapper; exports announce, cancelAnnouncements, setMuted, isMuted
    │   ├── getRandomInt.ts     # Random number helper — delegates to rng.ts random()
    │   └── rng.ts              # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed
    ├── Context/
    │   ├── index.tsx           # GameContext, State interface, GameProviderWrapper
    │   └── reducer.ts          # All game logic: hits, strikes, balls, outs, base running
    ├── Announcements/          # Play-by-play log display (overflow-y: auto, max-height on mobile)
    ├── Ball/                   # Ball animation component
    ├── BatterButton/
    │   └── index.tsx           # "Batter Up!" + "Share replay" + auto-play/speed/mute controls
    ├── Diamond/                # Baseball diamond (responsive CSS dimensions on mobile ≤800px)
    ├── Game/
    │   ├── index.tsx           # Wraps children in GameProviderWrapper + GitHub ribbon
    │   └── GameInner.tsx       # Layout: SidePanel (ScoreBoard+Diamond), BatterButton, Announcements
    └── ScoreBoard/             # Score/inning/strikes/balls/outs display (static on mobile)
```

**Key architectural notes:**
- All game state lives in `Context/index.tsx` (`State` interface) and is mutated by `Context/reducer.ts`.
- `BatterButton/index.tsx` is the only place that dispatches game actions (`strike`, `wait`, `hit`). It also owns auto-play, speed, mute, and share-replay controls.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `wait`.
- `Hit` enum values correspond directly to base advancement in `reducer.ts` (`moveBase`).

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
- All three settings are persisted in `localStorage` (`autoPlay`, `speed`, `muted`) and restored on page load.

---

## Mobile Layout (no infinite scroll)

- **`body { overflow: hidden }`** on mobile (≤800px) prevents page-level scrolling.
- **`GameDiv`** uses `height: 100dvh; overflow-y: auto` on mobile so content scrolls within the game container.
- **`SidePanel`** in `GameInner.tsx` switches to `display: flex; flex-direction: row` on mobile, placing ScoreBoard and Diamond side-by-side instead of stacked.
- **`Diamond`** uses actual fixed CSS dimensions (160×160px outfield, 80×80px infield) on mobile instead of `position: absolute`, so it participates in normal flow and doesn't overlap.
- **`ScoreBoard`** switches from `position: absolute` to `position: static; flex: 1` on mobile.
- **`Announcements`** uses `overflow-y: auto` (never `overflow: scroll`) with `max-height: 35vh` on mobile.
- **GitHub ribbon** is hidden on mobile via `.github-fork-ribbon { display: none }`.

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
- **React 19:** Entry point uses `createRoot` from `react-dom/client` (not the old `ReactDOM.render`).
- **React import style:** Files use `import * as React from "react"` (not the default import). Follow this pattern.
- **Styled-components v6:** Use the v6 API. Custom props on styled components **must** be typed via generics, e.g. `styled.div<{ teamAtBat: boolean }>`. Prop filtering is automatic (non-HTML props are not forwarded to the DOM).
- **Node version:** The project targets Node 24.x (see `.nvmrc`). Use `nvm use` to switch if needed.
- **No test infrastructure:** Do not add tests unless the issue explicitly requests it.
- **`browserslist`** is set in `package.json` (`> 0.5%, last 2 versions, not dead`). This is required for Parcel v2 to bundle all dependencies (including React) into the output JS file for the browser.
