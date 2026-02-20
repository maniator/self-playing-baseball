# TODOs

Future improvements and known gaps documented here for tracking.

---

## Game Logic

- ~~**Grounder / double-play logic**~~ ✅ Implemented in `hitBall.ts` (`handleGrounder`):
  ~40% of non-HR ball-in-play outs are ground balls. With a runner on 1st and fewer than 2 outs, 65% turn into a double play (runner from 1st out at 2nd, then batter out at 1st); the remaining 35% are fielder's-choice plays (batter safe at 1st, lead runner out). Without a force play the batter is thrown out at first.

- ~~**Extra-inning logic**~~ ✅ Implemented:
  - Automatic tiebreak runner on 2nd placed at the start of every extra-inning half (`nextHalfInning` in `gameOver.ts`).
  - `LineScore` shows an "EXTRA INNINGS" badge when `inning > 9` and game is in progress; extra-inning columns expand automatically.

- ~~**Pitch types**~~ ✅ Implemented (`constants/pitchTypes.ts`, `playerActions.ts`, `reducer.ts`, `usePitchDispatch.ts`):
  - Four pitch types (fastball, curveball, slider, changeup) with count-aware selection and per-type swing/zone modifiers.
  - Play-by-play enriched: "Slider — swing and a miss — strike 2.", "Curveball — ball 2.", etc.

- ~~**Home team wins after top of 9th if leading**~~ ✅ Implemented in `nextHalfInning` (`gameOver.ts`):
  - If the home team is already winning when transitioning to the bottom of the 9th (or later), the game ends immediately — no need to play the bottom half.

---

## Manager Mode

- ~~**IBB follow-through**~~ ✅ Implemented (`suppressNextDecision` in `State`):
  - After an intentional walk, `suppressNextDecision` is set so the very next at-bat skips decision detection, preventing back-to-back intentional walk prompts.

- ~~**Pinch-hitter / substitution**~~ ✅ Implemented:
  - Offered in the 7th inning or later with a runner on 2nd or 3rd, fewer than 2 outs, at the start of an at-bat (0-0 count).
  - Manager selects from all five strategies (Contact, Patient, Power, Aggressive, Balanced); the chosen strategy overrides the default for that entire at-bat.

- ~~**Defensive shifting**~~ ✅ Implemented:
  - Offered once per at-bat when the managed team is fielding (0-0 count). Shift On applies a 0.85× multiplier to the pop-out threshold, increasing ground outs and pop-ups.

---

## Replay & Seeding

- ~~**Manager decisions in replay**~~ ✅ Implemented (`useReplayDecisions.ts`, `decisionLog` in URL `?decisions=`):
  - All manager decisions (steal, bunt, intentional walk, count modifiers, pinch-hitter, defensive shift) are appended to `decisionLog` and serialized into the replay URL.
  - `useReplayDecisions.applyEntry` re-dispatches each decision at the matching pitch key during replay.

---

## UI / Accessibility

- **Mobile swipe** — On small screens, swiping up could trigger a pitch (complement to the spacebar shortcut).

- ~~**Keyboard navigation for DecisionPanel**~~ ✅ Implemented:
  - Decision buttons are standard HTML `<button>` elements — natively Tab + Enter focusable.
  - Visible `focus-visible` outline (white, 3 px) added to `ActionButton` and `SkipButton` via styled-components.

- ~~**Screen-reader live region**~~ ✅ Implemented:
  - `AnnouncementsArea` now has `aria-live="polite"` and `aria-atomic="false"` so screen-reader users hear new play-by-play entries as they arrive.

---

## Testing

- **Auto-play scheduler** — The speech-gated `tick` interval and the inning-transition / game-over side-effect hooks are not yet covered by tests. These require fake timers and more complex async React effect testing.

- **`announce.ts` voice-selection branch** — `pickVoice()` (the voice filter/selection code that runs on `voiceschanged`) is not covered because jsdom's `speechSynthesis.getVoices()` returns an empty array, so the voice-scoring loop never executes.

- **`rng.ts` server-side / no-window path** — The `initSeedFromUrl` early return when `typeof window === "undefined"` is not reachable in a jsdom test environment.

