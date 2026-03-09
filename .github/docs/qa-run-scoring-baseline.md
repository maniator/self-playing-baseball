# QA: Run-Scoring Calibration Baseline

**Issue:** Tune AI-managed run scoring using existing calibration tools and larger browser samples

---

## Section 1 — Environment

| Field | Value |
|---|---|
| Branch | `copilot/tune-ai-managed-run-scoring` |
| Base commit | Post-PR-142 master |
| Harness | `src/test/calibration/simHarness.test.ts` (stock teams, 100 seeds) |
| Custom harness | `src/test/calibration/customTeamMetrics.test.ts` (metrics-teams.json, 100 games) |
| Browser spec | `e2e/tests/metrics-baseline.spec.ts` (metrics-teams.json, 200 games) |
| Commands | `yarn test --run src/test/calibration/simHarness.test.ts` |
| | `yarn test --run src/test/calibration/customTeamMetrics.test.ts` |
| | `npx playwright test --config=playwright-metrics.config.ts --project=desktop` |
| Date | 2026-03-09 |

---

## Section 2 — Pre-Change Baseline (Round 0)

This section captures the current master state **before any gameplay tuning changes**.

### 2a — Stock-Team Harness (100 games, seeds 1–100)

Run: `yarn test --run src/test/calibration/simHarness.test.ts`

| Metric | Value |
|---|---|
| Total PA | 8,102 |
| BB% | 4.9% |
| K% | 26.5% |
| H/PA | 0.305 |
| HR/PA | 0.025 |
| Runs/game | 11.2 |
| Avg starter BF | N/A (pitch-count-first model) |

### 2b — Custom-Team Harness (100 games, metrics-teams.json)

Run: `yarn test --run src/test/calibration/customTeamMetrics.test.ts`

| Metric | Value |
|---|---|
| Total PA | 8,553 |
| BB% | 10.44% |
| K% | 22.32% |
| H/PA | 0.299 |
| BB/game | 8.9 |
| Runs/game (mean) | 12.3 |
| Runs/game (median) | 12 |
| Pitching changes | 2.3/game |

### 2c — Browser Baseline (200 games, metrics-teams.json)

Run: `npx playwright test --config=playwright-metrics.config.ts --project=desktop`

*(Results captured after the baseline browser run completed — see below)*

| Metric | Value |
|---|---|
| Games | 200 (10 matchups × 20 seeds) |
| Total PA | TBD |
| BB% | TBD |
| K% | TBD |
| H/PA | TBD |
| BB/game | TBD |
| Runs/game (mean) | TBD |
| Runs/game (median) | TBD |

---

## Section 3 — Suspicious Metrics and Likely Drivers

### H/PA is the primary suspect

**H/PA = 0.299–0.305** (harness) vs MLB target of **~0.248**. This is a +0.05 gap (roughly +20% above MLB).

Runs/game of 12.3 (custom teams harness) is nearly 45% above the MLB-realistic 8–9 range.

The run-creation feedback loop means a +20% hit rate produces a much larger runs surplus (more baserunners → more multi-run innings → exponential effect).

### Batted-ball environment analysis

The hit-rate pipeline is: swing decision → swing outcome (whiff/foul/contact) → batted-ball type → ball-in-play result.

Examining current ball-in-play outcome rates:

| Type | Out rate | Hit rate | Notes |
|---|---|---|---|
| `pop_up` | 100% | 0% | correct |
| `weak_grounder` | 65% | 35% (infield single) | slightly high |
| `hard_grounder` | 40% | 60% (single) | **too high — should be ~50%** |
| `line_drive` | 15% | 85% | **too high — MLB LD hit rate ~72%** |
| `medium_fly` | 70% | 30% | reasonable |
| `deep_fly` | 35% | 65% | slightly high |

The hard contact rate (`hardBase = 25`) means 25% of contact events are hard. In MLB, hard-contact% (defined similarly) is closer to 20–22%.

### Summary of likely culprits (ordered by impact)

1. **Line-drive hit rate (85%)** — highest individual contribution to excess H/PA. MLB LD hit rate is ~72%. This is the single biggest lever.
2. **Hard grounder hit rate (60%)** — hard grounders beat the infield at a 60% rate, which is generous. MLB is closer to 45–55%.
3. **Hard contact rate (25%)** — slightly high; shifting some hard to weak contact will cascade through all downstream outcomes.
4. **BB% (10.44%)** — still above 8–9% target. The take-base lever is exhausted from PR #140. BB% reduction will require structural changes (currently out of scope unless harness shows easy gains).

### What is NOT a likely culprit

- **HR/PA** = 0.025 is in the MLB-realistic range (2.5–3.5%). Do not target HRs.
- **K%** = 22.32–26.5% is in the MLB range (22–25%). Do not target strikeouts.
- **Runner advancement** logic appears reasonable; address only if H/PA reduction alone is insufficient.

---

## Section 4 — Tuning Plan

### Round 1: Contact/hit environment (lever: hit outcomes per batted-ball type)

**Hypothesis:** Reducing line-drive and hard-grounder hit rates, plus reducing the hard-contact rate, will bring H/PA from ~0.30 to ~0.25–0.26 and runs/game from ~12.3 to ~10–10.5 (harness), corresponding to ~8.2–8.7 browser runs/game.

**Changes planned:**
1. `hitBall.ts` (`handleBallInPlay`): line_drive out threshold 150 → 200 (15% → 20% out rate)
2. `hitBall.ts` (`handleBallInPlay`): hard_grounder out threshold 400 → 500 (40% → 50% out rate)
3. `battedBall.ts` (`resolveContactQuality`): `hardBase` 25 → 20 (hard contact rate 25% → 20%)

**Risk:** K% could change if contact rate shifts. Monitor K% carefully.

### Round 2 (conditional): Runner advancement

Only if Round 1 leaves runs/game still clearly above 10.5 (harness) / 8.5 (browser).

**Changes planned (if needed):**
- Scoring from 2nd on single: 60% base → 50% base
- Stretch to 3rd on single: 28% base → 20% base

### Round 3+ (conditional): Only if justified by evidence

---

## Section 5 — Round 1 Results (post-change)

*(To be filled in after Round 1 changes are applied and harness is rerun)*

### 5a — Stock-Team Harness (post-Round-1)

| Metric | Baseline | Round 1 | Delta |
|---|---|---|---|
| BB% | 4.9% | TBD | — |
| K% | 26.5% | TBD | — |
| H/PA | 0.305 | TBD | — |
| HR/PA | 0.025 | TBD | — |
| Runs/game | 11.2 | TBD | — |

### 5b — Custom-Team Harness (post-Round-1)

| Metric | Baseline | Round 1 | Delta |
|---|---|---|---|
| BB% | 10.44% | TBD | — |
| K% | 22.32% | TBD | — |
| H/PA | 0.299 | TBD | — |
| BB/game | 8.9 | TBD | — |
| Runs/game (mean) | 12.3 | TBD | — |

### 5c — Browser Run (post-Round-1, 200 games)

| Metric | Baseline | Round 1 | Delta |
|---|---|---|---|
| BB% | TBD | TBD | — |
| K% | TBD | TBD | — |
| H/PA | TBD | TBD | — |
| BB/game | TBD | TBD | — |
| Runs/game (mean) | TBD | TBD | — |

---

## Section 6 — Final Validation

*(To be filled in once tuning is complete)*

Final browser sample size: ___
Before/after comparison and decision: TBD

---

## Notes

- All browser runs use `metrics-teams.json` fixture (same 5 teams, same 10 matchup combos).
- Harness and browser runs both use the same fixture to enable apple-to-apple comparison.
- The harness-to-browser gap is approximately −1.8 runs/game (from PR #142 evidence).
- Use harness for iteration speed; use browser results as the final authority.
- Never use harness-only results to declare success.
