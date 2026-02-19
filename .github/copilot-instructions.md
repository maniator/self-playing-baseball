# Copilot Instructions for self-playing-baseball

## Project Overview

This is a **self-playing baseball game simulator** built as a single-page React/TypeScript web application. A batter auto-plays through innings, tracking strikes, balls, outs, bases, and score. Users can trigger pitches via a "Batter Up!" button or the spacebar.

**Repository size:** Small (~15 source files). **Language:** TypeScript. **Framework:** React (≥16.8, hooks-based). **Styling:** styled-components + SASS. **Bundler:** Parcel v1.x. **Package manager:** Yarn (classic).

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
    ├── index.html              # HTML entry point for Parcel
    ├── index.scss              # Global styles + mobile media queries
    ├── index.tsx               # React entry: calls initSeedFromUrl then renders <Game />
    ├── constants/
    │   └── hitTypes.ts         # Hit enum: Single, Double, Triple, Homerun, Walk
    ├── utilities/
    │   ├── announce.ts         # Web Speech API wrapper (announce, cancelAnnouncements, setMuted, isMuted)
    │   ├── getRandomInt.ts     # Random number helper — delegates to rng.ts random()
    │   └── rng.ts              # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed
    ├── Context/
    │   ├── index.tsx           # GameContext, State interface, GameProviderWrapper
    │   └── reducer.ts          # All game logic: hits, strikes, balls, outs, base running
    ├── Announcements/          # Audio play-by-play display component
    ├── Ball/                   # Ball animation component
    ├── BatterButton/
    │   └── index.tsx           # "Batter Up!" + "Share replay" buttons; auto-play toggle; speed/mute controls
    ├── Diamond/                # Baseball diamond visualization
    ├── Game/
    │   ├── index.tsx           # Wraps children in GameProviderWrapper + GitHub ribbon
    │   └── GameInner.tsx       # Layout: Diamond, ScoreBoard, BatterButton, Announcements
    └── ScoreBoard/             # Score/inning/strikes/balls/outs display
```

**Key architectural notes:**
- All game state lives in `Context/index.tsx` (`State` interface) and is mutated by `Context/reducer.ts`.
- `BatterButton/index.tsx` is the only place that dispatches game actions (`strike`, `wait`, `hit`).
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `wait`.
- `Hit` enum values correspond directly to base advancement in `reducer.ts` (`moveBase`).

---

## Seeded Randomness & Replay Sharing

All randomness is routed through `src/utilities/rng.ts` (mulberry32 PRNG):

- **`initSeedFromUrl({ writeToUrl? })`** — reads `?seed=` from the URL (base10 or base36); if absent, generates a new seed from `Date.now()` and optionally writes it to the URL via `history.replaceState`. Called once in `src/index.tsx` before the React tree mounts.
- **`random()`** — returns a deterministic float in `[0, 1)` from the seeded PRNG. Used by `getRandomInt` everywhere in the app.
- **`buildReplayUrl()`** — returns the current URL with `?seed=<base36>` set. Used by the "Share replay" button.
- **`getSeed()`** — returns the current seed value.

The same seed produces identical play-by-play sequences. Sharing the URL with `?seed=` lets anyone replay the exact same game.

---

## Auto-play Mode

`BatterButton/index.tsx` includes an auto-play system:

- **Auto-play checkbox** — starts/stops a `setInterval` that calls the same `handleClickButton` handler used by manual play.
- **Speed selector** — Slow (1200 ms), Normal (700 ms), Fast (350 ms). Changing speed clears and restarts the interval.
- **Mute toggle** — suppresses Web Speech API announcements via `setMuted()` in `announce.ts`. Auto-enabled when auto-play is turned on.
- All three settings are persisted in `localStorage` and restored on page load.
- A ref pattern (`handleClickRef`) ensures the interval always calls the latest handler without stale closures.

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
- **Parcel v1 (not v2):** Use `parcel-bundler` APIs and behaviour, not Parcel v2 conventions.
- **React import style:** Files use `import * as React from "react"` (not the default import). Follow this pattern.
- **Styled-components v5:** Use the v5 API; avoid v6+ features.
- **No test infrastructure:** Do not add tests unless the issue explicitly requests it.
- **Node version:** The project targets Node 24.x (see `.nvmrc`). Use `nvm use` to switch if needed.
