# Copilot Agent Prompt Examples

Copy-paste prompts for common tasks in `maniator/self-playing-baseball`. Prepend `@safe-refactor`, `@ui-visual-snapshot`, etc. to route to the correct agent.

---

## Safe refactor

### Behavior-preserving reducer refactor

```
@safe-refactor

Stage: extract sim-action handlers from reducer.ts into separate domain handler files
(e.g., src/context/sim.ts, src/context/lifecycle.ts).

Requirements:
- Action dispatch order and post-processing must be identical before and after.
- Preserve walkoff check, decision log, and strikeout log ordering.
- Add handler-level unit tests + root orchestration smoke test.
- Do not fix any bugs or change any UI in this stage.
```

### Extract a helper without behavior change

```
@safe-refactor

Extract the run-scoring loop from hitBall.ts into a pure helper scoreRunners(baseLayout, runsNeeded).
Behavior must be identical. Add a focused unit test for scoreRunners with multiple base configurations.
```

---

## UI / Visual snapshots

### Font or global style change + snapshot regen

```
@ui-visual-snapshot

Change the app font from system-ui to "Inter" (loaded via Google Fonts).
Ensure button/input/select/textarea inherit the font.
After layout validation across all viewport projects, trigger the update-visual-snapshots
workflow on this branch to regenerate baselines inside the CI Playwright container.
Do NOT run yarn test:e2e:update-snapshots locally — local rendering differs from the container.
```

### New Game dialog mobile layout fix

```
@ui-visual-snapshot

The Play Ball button is clipped on iphone-15 (393×659). Fix the NewGameDialog layout so the
CTA is fully visible without scrolling on all mobile viewports. Use dvh for max-height.
Validate responsive-smoke.spec.ts passes on all 7 projects.
```

---

## Simulation correctness

### Impossible batting stats bug audit

```
@simulation-correctness

Seed: abc123 — after inning 4, the away team's batter shows 3 hits in 1 AB.

1. Reproduce with seed abc123 and capture the full state at the point of inconsistency.
2. Identify the root cause (lineup indexing? home/away mapping? stat accumulation?).
3. Fix with a minimal, targeted change.
4. Add a seed-anchored regression test that pins this seed and asserts the batting line is valid.
```

### Walkoff fires at wrong time

```
@simulation-correctness

Seed: xyz789 — walkoff triggers at the end of the top of the 9th, not the bottom.

Reproduce, identify the inning/half check in checkWalkoff (context/gameOver.ts), fix minimally,
and add a regression test that asserts walkoff can only fire in the bottom half when home team leads.
```

---

## CI / Workflow

### Add Playwright test sharding

```
@ci-workflow

Add matrix sharding to playwright-e2e.yml to split Chromium tests across 2 shards.
Requirements:
- Do NOT shard the determinism project.
- Make artifact names shard-aware: playwright-artifacts-{browser}-{shardIndex}.
- Keep fail-fast: false.
- Add a YAML comment explaining why determinism is excluded from sharding.
```

### Update Playwright container image version

```
@ci-workflow

Bump the Playwright container image in playwright-e2e.yml from v1.58.2-noble to v1.60.0-noble.
After the bump, regenerate all visual snapshot baselines using the new image.
Add a comment in the workflow YAML noting the image version and the snapshot-regen requirement.
```

---

## RxDB save integrity

### Export/import audit after event schema change

```
@rxdb-save-integrity

A new field (decisionType) was added to EventDoc. Audit the export/import flow:
1. Verify exportRxdbSave includes the new field.
2. Verify importRxdbSave handles bundles without the field (backward compat).
3. Test malformed JSON and corrupted FNV-1a signature payloads.
4. Update sample-save.json fixture if the format changed.
```

### Add a new field to the saves schema

```
@rxdb-save-integrity

Add a `tags: string[]` field to SaveDoc (src/storage/types.ts) and savesSchema (src/storage/db.ts).

Requirements:
- Bump savesSchema.version by 1 (e.g. 1 → 2).
- Add migrationStrategies entry for the new version: pure function, never throws,
  sets tags to [] for all existing docs (oldDoc.tags ?? []).
- Add an upgrade-path unit test: create a v(N-1) DB, insert a legacy save,
  close, reopen with new code, assert tags is [] and all other fields are intact.
- Export/import FNV-1a signature must still verify correctly after the change.
- save-load.spec.ts and import.spec.ts must still pass.
```

### Batch appendEvents performance improvement

```
@rxdb-save-integrity

The appendEvents call fires too frequently during autoplay. Batch events into groups of 10
before writing to RxDB. Verify:
- No events are lost under rapid autoplay (1000+ pitches).
- idx values remain monotonically increasing.
- progressIdx in the saves doc stays accurate.
- save-load.spec.ts and import.spec.ts still pass.
```
