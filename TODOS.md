# TODOs

Future improvements and known gaps documented here for tracking.

---

## Game Logic

- ~~**Grounder / double-play logic**~~ ✅ Implemented in `hitBall.ts` (`handleGrounder`):  
  ~40% of non-HR ball-in-play outs are now ground balls. With a runner on 1st and fewer than 2 outs, 65% of grounders turn into a double play (2 outs, runner removed). The remaining 35% are fielder's-choice plays (lead runner out, batter safe at 1st). Without a force play the batter is simply thrown out at first.  
  *(See `hitBall.ts` `handleGrounder`, `advanceRunners.ts`)*

- ~~**Extra-inning logic**~~ ✅ Implemented:
  - Automatic **tiebreak runner on 2nd** placed at the start of every extra-inning half (`nextHalfInning` in `gameOver.ts`), logged as "Tiebreak rule: runner placed on 2nd base."
  - **LineScore** shows an "EXTRA INNINGS" badge (blue) whenever `inning > 9` and the game is still in progress. Extra-inning columns are added to the scoreboard automatically.
  *(See `gameOver.ts`, `LineScore/index.tsx`)*

- ~~**Pitch types**~~ ✅ Implemented in `usePitchDispatch.ts` + `playerActions.ts` + `reducer.ts`:
  - New `src/constants/pitchTypes.ts` defines `PitchType` (fastball, curveball, slider, changeup) with count-aware selection (`selectPitchType`), swing-rate modifiers, and strike-zone probability modifiers.
  - Each pitch selects the type based on the current count (0-2 count → more breaking balls; 3-0 → mostly fastballs; full count → balanced mix).
  - Swing rate and strike-zone probability are adjusted per pitch type (slider induces more chases; curveball breaks out of zone more).
  - Play-by-play log messages are enriched with the pitch name ("Slider — swing and a miss! Strike 2.", "Curveball — ball 2.", etc.).
  *(See `constants/pitchTypes.ts`, `playerActions.ts`, `reducer.ts`, `usePitchDispatch.ts`)*

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
