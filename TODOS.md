# TODOs

Future improvements and known gaps documented here for tracking.

---

## Game Logic

- **Grounder / double-play logic** — Currently all hits use simplified base advancement.  
  Adding directional-hit runner-advancement, grounder outs, and caught-at-first-with-trailing-runner scenarios requires tracking ball direction and individual runner speeds, which is a larger state change.  
  *(See `reducer.ts` `advanceRunners`)*

- **Extra-inning logic** — The game correctly continues past 9 innings when tied, but walk-off / tie-break rules could be more explicit in the UI.

- **Pitch types** — All pitches are abstracted into swing/take/hit. Modelling fastballs, curves, sliders etc. would add depth to the count-based strategy decisions.

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
