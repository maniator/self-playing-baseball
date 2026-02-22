# ⚾ Ballgame

A self-playing, talking baseball simulator that runs entirely in your browser. Watch a full 9-inning game unfold pitch by pitch — or jump in as the Manager and call the shots yourself.

**[▶ Play it live](https://blipit.net/)**

> **Install as an app** — open [blipit.net](https://blipit.net/) on Android or desktop Chrome, tap the browser menu, and choose **"Add to Home Screen"** (or "Install app") to get a native-feeling PWA with its own ⚾ icon.

---

## Screenshots

### Game start

| Desktop | Mobile |
|---|---|
| ![Game start — desktop](https://github.com/user-attachments/assets/d44a3ab9-5017-49da-8c63-ac3080cddd5d) | ![Game start — mobile](https://github.com/user-attachments/assets/874cdfd3-733f-4e14-845d-3767495aae0b) |

### Mid-game with play-by-play

| Desktop | Mobile |
|---|---|
| ![Mid-game — desktop](https://github.com/user-attachments/assets/c73981e7-f3ca-4377-bf1b-fcac24c0ea15) | ![Mid-game — mobile](https://github.com/user-attachments/assets/36df5932-4d87-4758-b506-91936e9c6840) |

### How to play

| Desktop | Mobile |
|---|---|
| ![How to play — desktop](https://github.com/user-attachments/assets/8a6cec1c-a2f0-463f-9133-1e39fb51696c) | ![How to play — mobile](https://github.com/user-attachments/assets/1fb7b753-ca6e-4e12-b585-ee2dfcf4fd6b) |

### Manager Mode decision panel

| Desktop | Mobile |
|---|---|
| ![Manager Mode decision panel — desktop](https://github.com/user-attachments/assets/b05ae75e-7c32-46fc-a4ef-8f85d794ff83) | ![Manager Mode decision panel — mobile](https://github.com/user-attachments/assets/31eda8a1-c1cb-4c5d-b029-dbaf9f09463e) |

---

## Features

- **Installable PWA** — add to your Android or desktop home screen for a native app experience with its own ⚾ icon.
- **Step-by-step or auto-play** — press *Batter Up!* (or Spacebar) for one pitch at a time, or enable Auto-play and choose Slow / Normal / Fast speed.
- **Play-by-play announcements** — the Web Speech API narrates every pitch, hit, and out.
- **Live scoreboard** — line score with per-inning runs, hits, balls/strikes/outs indicator, and an EXTRA INNINGS banner when the game goes deep.
- **Live batting stats panel** — AB, H, HR, RBI, AVG, OBP, and SLG for every batter in both lineups, updated in real time.
- **Realistic game logic** — four pitch types (fastball, curveball, slider, changeup), ground-ball double plays, walk-off wins, extra-inning tiebreak runners, and a home-team "no need to bat" rule.
- **Pre-game player customisation** — before the first pitch:
  - Enter custom team names, or let the game auto-fetch real MLB rosters from the MLB Stats API (cached in IndexedDB).
  - Upload a roster CSV to give each batter a real name.
  - Drag-and-drop batting order reordering.
  - Per-player stat overrides for Contact, Power, and Speed.
- **Seeded randomness** — every game is fully deterministic from its seed, so results are perfectly repeatable.
- **Share replay** — copies a URL containing the seed so anyone can watch the exact same game unfold.
- **Manager Mode** — pick a team and a strategy (Balanced / Aggressive / Patient / Contact / Power) and make real decisions at key moments:
  - Steal attempt
  - Sacrifice bunt
  - Intentional walk (7th inning+, close game, 2 outs)
  - Pinch-hitter (7th inning+, runner on 2nd or 3rd, &lt; 2 outs)
  - Defensive shift
  - Count-based swing/take choices
- **Browser notifications** — optional notifications alert you when a Manager decision is ready, even when the tab is in the background.
- **10-second auto-skip** — decisions auto-skip with a countdown bar if you don't act in time.
- **RxDB persistence** — saves, game events, and MLB team data are all stored locally in IndexedDB via [RxDB](https://rxdb.info). No server required. Auto-save resumes your last game on reload.
- **Save management** — save named game slots, load previous games, export as JSON for backup/sharing, and import from a file.
- **Volume controls** — independent sliders and mute buttons for voice announcements and alert chimes.

---

## Getting started

**Requirements:** Node 24.x, Yarn Berry v4.

```bash
# Install dependencies
yarn

# Start the dev server (http://localhost:5173)
yarn dev

# Run unit tests
yarn test

# Run E2E tests (builds app first, then runs Playwright)
yarn test:e2e

# Update visual regression snapshots
yarn test:e2e:update-snapshots

# Production build → dist/
yarn build
```

---

## Testing

### Unit tests (Vitest)

Co-located next to their source files. Run with:

```bash
yarn test               # one-shot
yarn test:coverage      # with coverage report (90 % lines/functions/statements, 80 % branches)
```

### E2E tests (Playwright)

End-to-end tests live in `e2e/` and cover the highest-risk user flows across
**7 browser / device projects**: a dedicated `determinism` project (desktop
Chromium) plus `desktop`, `tablet`, `iphone-15-pro-max`, `iphone-15-pro`,
`pixel-7`, and `pixel-5`.

```bash
yarn test:e2e                       # build + run all E2E tests headlessly
yarn test:e2e:ui                    # open Playwright UI for interactive debugging
yarn test:e2e:update-snapshots      # regenerate visual regression baselines
```

| Spec | What it covers |
|---|---|
| `smoke.spec.ts` | App loads, New Game dialog visible, Play Ball starts autoplay |
| `determinism.spec.ts` | Same `?seed=` → identical play-by-play (uses isolated IndexedDB contexts) |
| `save-load.spec.ts` | Save game, load game, autoplay resumes after load |
| `import.spec.ts` | Import fixture JSON, save appears in list with Load button |
| `responsive-smoke.spec.ts` | Scoreboard + field + log visible & non-zero sized on all viewports |
| `visual.spec.ts` | Pixel-diff snapshots: New Game dialog, in-game scoreboard, saves modal |
| `manager-mode.spec.ts` | Manager Mode toggle + strategy selector visible after game starts |

**Key implementation notes:**
- `data-testid` attributes on all critical elements enable stable locators.
- Each play-by-play log entry has a hidden `data-log-index` attribute (`0` = oldest event), used by `captureGameSignature` to build a stable determinism signature that does not shift as autoplay prepends new entries.
- The webServer is `vite preview` (production build), not `yarn dev`, to avoid the RxDB dev-mode plugin hanging in headless Chromium.
- Seeds must be passed in the URL (`/?seed=xxx`) *before* the app mounts — `initSeedFromUrl` is a one-shot init.


## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 (hooks) |
| Language | TypeScript 5 |
| Styling | styled-components v6 + SASS |
| Bundler | Vite v7 |
| Unit testing | Vitest + Testing Library |
| E2E testing | Playwright (7 device projects) |
| Speech | Web Speech API |
| Audio | Web Audio API |
| Randomness | Seeded PRNG (mulberry32) |
| Local DB | RxDB v17 (IndexedDB via Dexie) |
| Drag & Drop | @dnd-kit |
| PWA | Web App Manifest + Service Worker |
| Deployment | Vercel |

---

## License

MIT © [Naftali Lubin](https://github.com/maniator)
