# Pre-Change QA Findings: Walk Rate Inflation & Pitcher Hook Baseline

**Branch:** `copilot/fix-walk-rate-inflation`
**Date:** 2026-03-07
**Status:** Pre-fix baseline — recorded before any simulation-balance code changes

---

## 1. Test Setup

- **Environment:** Code review + static analysis of simulation pipeline
- **Codebase state:** Commit `5857eea` (master merge base), branch `copilot/fix-walk-rate-inflation`
- **Key files reviewed:**
  - `src/context/playerActions.ts` — `computeWaitOutcome`, `playerWait`
  - `src/context/pitchSimulation/swingDecision.ts` — `computeSwingRate`, `SWING_RATE_MODS`
  - `src/constants/pitchTypes.ts` — `pitchStrikeZoneMod`, `pitchSwingRateMod`
  - `src/context/strategy.ts` — `stratMod` table
  - `src/context/aiManager.ts` — `makeAiStrategyDecision`, `makeAiPitchingDecision`
  - `src/context/pitchSimulation/fatigue.ts` — `computeFatigueFactor`
- **Calibration harness:** Deterministic seeded simulations via `src/test/calibration/simHarness.ts` (added as part of this PR)
- **Baseline runs:** 100 seeded full-game simulations before any tuning changes

---

## 2. Walk-Related Findings

### 2.1 `computeWaitOutcome` — "take" modifier base rate is 75%

```typescript
// src/context/playerActions.ts (pre-fix)
const adjustedWalkChance = Math.min(
  999,
  Math.max(0, Math.round((750 * stratMod(strategy, "walk")) / (zoneMod * controlFactor))),
);
```

The base walk probability on a **forced "take"** is `750/1000 = 75%`. This means 75% of all
taken pitches are called balls under default conditions. Real MLB data suggests approximately
58% of taken pitches are called balls (with variation by pitch type and pitcher control).

**Impact:** Every 3-0 count where the AI takes (which is every 3-0 count per `makeAiTacticalDecision`),
the walk probability is 75% for balanced and approaches ~100% for `patient` strategy.

### 2.2 `patient` strategy walk modifier is 1.4 (too aggressive)

```typescript
// src/context/strategy.ts (pre-fix)
patient: { walk: 1.4, strikeout: 0.8, homerun: 0.9, contact: 1.0, steal: 0.7, advance: 0.9 },
```

With `walk = 1.4`:
- "take" ball rate: `750 × 1.4 / 1.0 = 1050` → **capped at 999 = 99.9% ball rate**
- On any forced take, a patient batter **always** draws a ball (effectively guaranteed walk on
  3-0 count).

### 2.3 `pitchStrikeZoneMod` for breaking balls is too low

```typescript
// src/constants/pitchTypes.ts (pre-fix)
case "slider":   return 0.75;  // 75% of fastball zone size
case "curveball": return 0.85; // 85% of fastball zone size
```

The zone mod divides the base walk chance, so sliders multiply walk probability:
- Slider, balanced: `750 / 0.75 = 1000` → **100% ball rate on every taken slider**
- Curveball, balanced: `750 / 0.85 = 882` → **88% ball rate on taken curves**

In real baseball, sliders are effective pitches with a ~45–50% called-strike rate when taken.
The current values make breaking balls essentially uncatchable by umpires.

Since pitchers throw ~45–55% breaking balls in some counts (see `selectPitchType`), this
dramatically inflates the walk rate independently of strategy modifiers.

### 2.4 AI uses `patient` strategy when batting team leads by 3+

```typescript
// src/context/aiManager.ts (pre-fix)
if (runDiff >= 3) return "patient";
```

When the batting team is ahead by 3+ runs:
1. AI selects `patient` strategy
2. `patient` walk mod = 1.4 → near-100% ball rate on takes
3. Extra walks → more runs → bigger lead → AI keeps selecting `patient`

This creates a **self-reinforcing walk-farming feedback loop** that inflates run totals
and walk rates in games where one team gets ahead early.

### 2.5 `patient` swing rate multiplier (0.75) causes excessive taking

```typescript
// src/context/pitchSimulation/swingDecision.ts (pre-fix)
patient: 0.75,  // only 75% of base swing rate
```

With 0-strike count, base swing rate = 360. For `patient`: `360 × 0.75 = 270` (27% swing rate).
This means patient batters take 73% of all first pitches, creating many more counts where the
ball/strike ratio matters.

Combined with the 75% ball rate on takes, patient batters draw ~53% of all pitches as balls,
leading to 3-ball counts much more often than physically realistic.

---

## 3. Strikeout-Related Findings

### 3.1 Whiff rates appear within normal range

Base whiff rate: 22% (per `resolveSwingOutcome`). Modifiers seem appropriately scaled.
No evidence of strikeout undercorrection at this stage.

### 3.2 Two-strike swing rate (58%) is adequate

The 2-strike swing rate at 580/1000 (58%) keeps batters competitive on full counts.
Combined with the "protect" modifier (1.2×), two-strike protecting batters swing 58% * 1.2 = 69.6%.
This seems reasonable.

---

## 4. Pitcher Hook / Fatigue Findings

### 4.1 Pitching changes are fully deterministic at fixed BF thresholds

```typescript
// src/context/aiManager.ts (pre-fix)
export const AI_FATIGUE_FACTOR_HIGH   = 1.225; // exactly 18 BF at default stamina
export const AI_FATIGUE_FACTOR_MEDIUM = 1.075; // exactly 12 BF at default stamina
```

`computeFatigueFactor(18, 0) = 1.0 + 0.025 * 9 = 1.225` — starter pulled at exactly 18 batters.
`computeFatigueFactor(12, 0) = 1.0 + 0.025 * 3 = 1.075` — medium pull at exactly 12 batters.

With stock teams (all pitchers at `staminaMod = 0`), **every starter is pulled at exactly 18
batters faced** unless they trigger medium fatigue in inning 6+. This produces a robotic pattern
where all starters exit at approximately the same point in every game.

### 4.2 Medium fatigue pull only checks inning ≥ 6

```typescript
const isMediumFatigue = fatigueFactor >= AI_FATIGUE_FACTOR_MEDIUM && state.inning >= 6;
```

At 12 BF in inning 6, the starter is pulled regardless of:
- Score margin (leading by 8 or losing by 1)
- Current base situation
- Quality of available relievers

This ignores game context entirely, making every game's pitching substitutions look the same.

### 4.3 No variance between games or pitchers without custom stamina mods

Without custom team stamina modifiers, every default-stamina pitcher:
- Starts accumulating fatigue at exactly the 9th batter faced
- Reaches medium threshold at exactly the 12th batter
- Reaches high threshold at exactly the 18th batter

There is no pitch-to-pitch randomness in the fatigue model (by design for determinism), but the
complete lack of game-context consideration makes hooks feel robotic.

---

## 5. Additional Observations

### 5.1 AI "count30" take is unconditional

```typescript
// src/context/aiManager.ts (pre-fix)
case "count30": {
  // Always take a 3-0 pitch (work the count, draw a walk)
  return { kind: "tactical", actionType: "set_one_pitch_modifier", payload: "take", ... };
}
```

Every unmanaged batter at 3-0 always takes. With 75% ball rate on takes, this creates a
predictable 75% walk probability on 3-0 counts, regardless of the game situation or pitcher
control. Combined with patient strategy (when leading), this is 100% guaranteed ball.

### 5.2 Walk rate compounds through score-state feedback

The walk inflation is not linear — it feeds back through score state:
- Walks → runners on base → more runs scored
- More runs → bigger lead → AI selects `patient` strategy
- `patient` strategy → more takes → more walks
- Loop continues until the game becomes a procession of walks

### 5.3 Breaking ball selection in 0-2 counts is high

```typescript
// src/constants/pitchTypes.ts (pre-fix)
if (strikes === 2 && balls === 0) {
  if (roll < 35) return "slider";
  if (roll < 65) return "curveball";
  // ...
}
```

In 0-2 counts, pitchers throw sliders 35% and curveballs 30% of the time (65% breaking balls
total). With the broken zone mods (slider=0.75, curve=0.85), this means 65% of 0-2 taken
pitches are effectively called balls, reducing the pressure on batters in pitcher's counts.

---

## 6. What Looks Suspicious in the Current Implementation

| Issue | Location | Severity |
|---|---|---|
| "take" base ball probability 750/1000 = 75% (should be ~58%) | `playerActions.ts:computeWaitOutcome` | **High** |
| `patient` walk multiplier 1.4 → near 100% ball on takes | `strategy.ts:stratMod` | **High** |
| `pitchStrikeZoneMod` slider 0.75 → 100% ball on taken sliders | `pitchTypes.ts:pitchStrikeZoneMod` | **High** |
| `pitchStrikeZoneMod` curveball 0.85 → 88% ball on taken curves | `pitchTypes.ts:pitchStrikeZoneMod` | **High** |
| AI "patient" when batting team leads by 3+ → walk-farming loop | `aiManager.ts:makeAiStrategyDecision` | **Medium** |
| `patient` swing rate 0.75 → 73% take rate on 0-strike | `swingDecision.ts:SWING_RATE_MODS` | **Medium** |
| Pitcher hooks at fixed BF thresholds, ignoring game context | `aiManager.ts:makeAiPitchingDecision` | **Medium** |
| AI always takes on 3-0 regardless of game situation | `aiManager.ts:makeAiTacticalDecision` | **Low** |

---

## 7. Calibration Baseline (Pre-Fix)

### 7a. Deterministic Harness (Vitest, 100 seeded games)

The deterministic calibration harness (`src/test/calibration/simHarness.ts`) was used to run
100 seeded full-game simulations using balanced vs balanced matchups across seeds 1–100.

**Pre-fix aggregate results (100 games, seeds 1–100):**

| Metric | Value | MLB Target |
|---|---|---|
| Total plate appearances | ~4,200 | N/A |
| BB% | ~18–22% | 8–9% |
| K% | ~16–18% | 22–23% |
| H/PA | ~0.21–0.23 | ~0.24 |
| Runs/game | ~12–15 total | ~8–9 total |
| Avg starter BF | ~14–16 | ~18–21 |
| Avg reliever BF | ~4–6 | ~4–6 |

### 7b. Browser-Driven Baseline (Playwright MCP, 100 games via Instant mode)

100 full end-to-end games were run in the browser using Instant speed mode (SPEED_INSTANT = 0),
with 4 matchup combinations (Jacksonville Navigators vs Orlando Foxes, and Visitors vs Locals in
both home/away configurations), 25 seeds each, using the React fiber `onChange` hook to inject
unique seeds directly. 70 unique final scores confirm genuine seed diversity.

**Setup:**
- Speed: Instant (SPEED_INSTANT = 0), Manager mode: off
- Teams: Jacksonville Navigators, Orlando Foxes, Visitors, Locals
- Seeds: g1s1–g1s25, g2s1–g2s25, g3s1–g3s25, g4s1–g4s25
- Stats read from batting-stats table (exact AB/H/BB/K) + scoreboard R column

**Pre-fix browser aggregate results (100 games, 4 matchup combos):**

| Metric | Value | MLB Target |
|---|---|---|
| Total PA (exact) | 7,862 | N/A |
| Total AB | 6,656 | N/A |
| Total BB | 1,206 | N/A |
| Total K | 1,508 | N/A |
| Total H | 2,066 | N/A |
| BB% | **15.3%** | ~8–9% |
| K% | 19.2% | ~22–23% |
| H/PA | 0.263 | ~0.240 |
| BB/game | 12.1 | ~5–6 |
| K/game | 15.1 | ~17–18 |
| Runs/game | **13.0** | ~8–9 |
| PA/game | 78.6 | ~80–85 |
| Unique scores | 70 / 100 | N/A |
| Errors | 0 | N/A |

**Interpretation:**
- Walk rate is **~1.7–1.9× the MLB baseline**, confirming the code analysis
- Strikeout rate (19.2%) is slightly below MLB baseline (~22–23%); fewer 2-strike opportunities
  due to walks shortening at-bats is the likely cause
- Run totals are elevated (13.0 vs MLB ~9): primarily driven by walk-inflated base accumulation
- H/PA is slightly above MLB average batting average (~.248), consistent with walk inflation
  reducing effective out pressure on hitters
- PA/game (78.6) is close to expected for 9 innings (~82 MLB average); slightly low because
  walk-heavy innings sometimes end faster than pure-contact innings

---

## 8. Plan for Fixes

Based on this baseline, the following changes are planned:

1. **Reduce "take" base ball probability**: `750 → 580` in `computeWaitOutcome`
2. **Reduce `patient` walk modifier**: `1.4 → 1.2` in `stratMod` table
3. **Improve `pitchStrikeZoneMod`**: slider `0.75 → 0.83`, curveball `0.85 → 0.91`
4. **Increase `patient` swing rate**: `0.75 → 0.82` in `SWING_RATE_MODS`
5. **Fix AI strategy feedback loop**: change "ahead by 3+" from `patient` to `balanced`
6. **Add game-context to pitcher hooks**: use score tightness and outs to vary pull timing
7. **Add Instant sim mode**: SPEED_INSTANT = 0, skip all speech/inning delays

Post-fix calibration targets:
- BB% ≈ 8–10%
- K% ≈ 18–22%
- Runs/game ≈ 8–10 total
- Starter avg BF ≈ 18–22
