# AGENTS.md — Copilot Coding Agent Instructions

This file provides global instructions and agent-routing guidance for the Copilot coding agent working on `maniator/self-playing-baseball`.

---

## What this repo is

A **deterministic, self-playing baseball simulator** built as a single-page React/TypeScript PWA. Key characteristics:

- Seeded PRNG (`src/utils/rng.ts`, mulberry32) — all randomness flows through `random()`. Same seed → same game, every time.
- Reducer-based game state (`src/context/reducer.ts`) with domain handler modules.
- Playwright E2E + visual snapshot tests across 7 viewport projects.
- RxDB local-only persistence (saves, events, teams collections).
- Strong emphasis on: **behavior-preserving refactors**, **deterministic simulation correctness**, **snapshot stability**, and **small scoped PRs**.

---

## Agent routing

Use the specialized agents in `.github/agents/` for the task type below. Pick the **most specific** match.

| Task type | Agent to use |
|---|---|
| Code reorganization, extraction, rename, module split | `safe-refactor` |
| UI layout, typography, styled-components, responsive design | `ui-visual-snapshot` |
| Simulation bugs, stat inconsistencies, impossible game states | `simulation-correctness` |
| GitHub Actions, CI workflows, Playwright CI, sharding | `ci-workflow` |
| RxDB saves, events, export/import, data integrity | `rxdb-save-integrity` |

For tasks that span multiple areas (e.g., a refactor that also touches UI), apply both relevant agents' checklists.

---

## Global rules (apply to every task)

1. **Minimal, surgical diffs.** Change as few lines as possible to accomplish the goal.
2. **Never call `Math.random()` in simulation code.** All randomness goes through `src/utils/rng.ts`.
3. **Never import `GameContext` directly.** Always use `useGameContext()` from `@context/index`.
4. **Never use the `Function` type.** Use explicit signatures: `(action: GameAction) => void`.
5. **Always use `mq` helpers** (`@utils/mediaQueries`) in styled-components. No raw `@media` strings.
6. **Always use `dvh`** (not `vh`) for modal `max-height`.
7. **Run all four validation steps** before reporting progress:
   - `yarn lint` — zero errors
   - `yarn build` — clean compile
   - `yarn test` — all pass (coverage: lines/functions/statements ≥ 90%, branches ≥ 80%)
   - `yarn test:e2e` — all Playwright projects pass

---

## Critical repo-specific caveats

### Determinism
Any change to the order of `random()` calls — including adding a conditional call — breaks seed replay. Treat the PRNG call sequence as a strict invariant. Always run `yarn test:e2e` with the `determinism` project to verify.

### Visual snapshots
Playwright visual snapshot baselines must be regenerated inside the CI Docker container (`mcr.microsoft.com/playwright:v1.58.2-noble`). **Never run `yarn test:e2e:update-snapshots` locally and commit the result** — local OS fonts and rendering differ from the container and cause false diffs in CI. The **`update-visual-snapshots`** workflow handles this automatically: it fires on any push to a non-master branch that changes `e2e/tests/visual.spec.ts` or `e2e/tests/layout.spec.ts`, and can also be triggered manually via Actions → "Update Visual Snapshots" → Run workflow. It commits the updated PNGs back to the branch and CI runs against them.

### Copilot Setup Steps workflow
`.github/workflows/copilot-setup-steps.yml` must **NOT** use `container:`. Copilot's bootstrap steps can fail inside containers due to `/bin/sh` vs bash shell compatibility (e.g., `pipefail`). This is a known, intentional constraint for this repo.

### Reducer cycle order
Module imports in `src/context/` must follow this order (no circular deps):
`strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`

### Path aliases
All cross-directory imports use aliases (`@components/*`, `@context/*`, `@hooks/*`, `@utils/*`, `@constants/*`, `@storage/*`, `@test/*`). Same-directory imports stay relative. Never use relative paths across directories.

---

## Key files

| File | Purpose |
|---|---|
| `src/utils/rng.ts` | Seeded PRNG — all randomness |
| `src/context/reducer.ts` | Game state reducer + `detectDecision` |
| `src/storage/saveStore.ts` | SaveStore API (createSave, appendEvents, updateProgress, export/import) |
| `src/hooks/useRxdbGameSync.ts` | Drains action buffer → RxDB on each pitch |
| `e2e/utils/helpers.ts` | Playwright test helpers |
| `.github/agents/` | Specialized Copilot agent profiles (one per domain) |
| `.github/agents/README.md` | Agent overview and gotchas reference |
| `.github/agents/prompt-examples.md` | Copy-paste prompt templates |
