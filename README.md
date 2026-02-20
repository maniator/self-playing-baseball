# ⚾ Ballgame

A self-playing, talking baseball simulator that runs entirely in your browser. Watch a full 9-inning game unfold pitch by pitch — or jump in as the Manager and call the shots yourself.

**[▶ Play it live](https://blipit.net/)**

> **Install as an app** — open [blipit.net](https://blipit.net/) on Android or desktop Chrome, tap the browser menu, and choose **"Add to Home Screen"** (or "Install app") to get a native-feeling PWA with its own ⚾ icon.

---

## Screenshots

### Game start

![Game start](https://github.com/user-attachments/assets/b1a99e5c-8553-4c00-9789-063ddad6ec38)

### Mid-game with play-by-play

![Mid-game with play-by-play](https://github.com/user-attachments/assets/6bd4fe10-d6db-4df8-94ba-343408647b0d)

### How to play

![How to play modal](https://github.com/user-attachments/assets/727c6358-641c-4e5b-b49f-634753670bc4)

### Manager Mode decision panel

![Manager Mode decision panel](https://github.com/user-attachments/assets/f92d8ad3-3446-47d0-a847-b2d9384206b8)

---

## Features

- **Installable PWA** — add to your Android or desktop home screen for a native app experience with its own ⚾ icon.
- **Step-by-step or auto-play** — press *Batter Up!* (or Spacebar) for one pitch at a time, or enable Auto-play and choose Slow / Normal / Fast speed.
- **Play-by-play announcements** — the Web Speech API narrates every pitch, hit, and out.
- **Live scoreboard** — line score with per-inning runs, hits, balls/strikes/outs indicator, and an EXTRA INNINGS banner when the game goes deep.
- **Realistic game logic** — four pitch types (fastball, curveball, slider, changeup), ground-ball double plays, walk-off wins, extra-inning tiebreak runners, and a home-team "no need to bat" rule.
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
- **Custom team names** — rename both teams via inline text inputs before or during the game.
- **Volume controls** — independent sliders and mute buttons for voice announcements and alert chimes.

---

## Getting started

**Requirements:** Node 24.x, Yarn Berry v4.

```bash
# Install dependencies
yarn

# Start the dev server (http://localhost:1234)
yarn dev

# Run tests
yarn test

# Production build → dist/
yarn build
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 (hooks) |
| Language | TypeScript 5 |
| Styling | styled-components v6 + SASS |
| Bundler | Parcel v2 |
| Testing | Vitest + Testing Library |
| Speech | Web Speech API |
| Audio | Web Audio API |
| Randomness | Seeded PRNG (mulberry32) |
| PWA | Web App Manifest + Service Worker |
| Deployment | Vercel |

---

## License

MIT © [Naftali Lubin](https://github.com/maniator)
