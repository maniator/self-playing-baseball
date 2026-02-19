# TODOs

Future improvements and known gaps documented here for tracking.

---

## Game Logic

- ~~**Grounder / double-play logic**~~ ✅ Implemented in `hitBall.ts` (`handleGrounder`):
  ~40% of non-HR ball-in-play outs are ground balls. With a runner on 1st and fewer than 2 outs, 65% turn into a double play; the remaining 35% are fielder's-choice plays. Without a force play the batter is thrown out at first.

- ~~**Extra-inning logic**~~ ✅ Implemented:
  - Automatic tiebreak runner on 2nd placed at the start of every extra-inning half (`nextHalfInning` in `gameOver.ts`).
  - `LineScore` shows an "EXTRA INNINGS" badge when `inning > 9` and game is in progress; extra-inning columns expand automatically.

- ~~**Pitch types**~~ ✅ Implemented (`constants/pitchTypes.ts`, `playerActions.ts`, `reducer.ts`, `usePitchDispatch.ts`):
  - Four pitch types (fastball, curveball, slider, changeup) with count-aware selection and per-type swing/zone modifiers.
  - Play-by-play enriched: "Slider — swing and a miss — strike 2.", "Curveball — ball 2.", etc.

---

## Manager Mode

- **IBB follow-through** — After an intentional walk the next batter always gets a fresh decision check. A future enhancement could automatically suppress decisions for the immediately following at-bat to avoid unrealistic consecutive IBB prompts.

- **Pinch-hitter / substitution** — A future manager action: bring in a pinch hitter with different strategy attributes.

- **Defensive shifting** — Offer a "shift on" / "shift off" decision that adjusts the pop-out and hit distribution for the current at-bat.

---

## Replay & Seeding

- **Manager decisions in replay** — Currently the `?seed=` URL reproduces identical pitches but Manager Mode decisions are not stored. A future enhancement could serialize the decision log into the URL so a full managed game is replayable.

---

## UI / Accessibility

- **Mobile swipe** — On small screens, swiping up could trigger a pitch (complement to the spacebar shortcut).

- **Keyboard navigation for DecisionPanel** — Decision buttons should be reachable via keyboard (Tab + Enter) with visible focus styles.

- **Screen-reader live region** — The play-by-play log should use `aria-live="polite"` so screen-reader users hear new entries without navigating to the log.

---

## Testing

- **BatterButton autoplay scheduler** — The speech-gated `tick` interval and the inning-transition / game-over side-effect hooks are not yet covered by tests. These require fake timers and more complex async React effect testing.

- **`announce.ts` voice-selection branch** — `pickVoice()` (the voice filter/selection code that runs on `voiceschanged`) is not covered because jsdom's `speechSynthesis.getVoices()` returns an empty array, so the voice-scoring loop never executes.

- **`rng.ts` server-side / no-window path** — The `initSeedFromUrl` early return when `typeof window === "undefined"` is not reachable in a jsdom test environment.
