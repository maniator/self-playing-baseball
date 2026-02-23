# Custom Copilot Agents — Overview

This directory contains **GitHub Copilot custom agents** tailored for `maniator/self-playing-baseball`. Each agent is a `.md` file with YAML front-matter and domain-specific instructions that guide Copilot when working on specific task types.

---

## Agents

### `safe-refactor`

**When to use:** Any code reorganization, extraction, rename, or modularization task where observable behavior must not change.

**Key guardrails:**
- Preserves deterministic PRNG call order (no replay drift)
- Preserves reducer routing, invariants, and debug output
- Keeps PRs scoped — no opportunistic rewrites
- Requires layered test coverage (handler-level + root orchestration)

---

### `ui-visual-snapshot`

**When to use:** Any UI, layout, typography, styled-components, or responsive-design change — especially if Playwright visual snapshots may be affected.

**Key guardrails:**
- Assumes snapshots must be regenerated for any visible UI change
- Validates across all 6 device/viewport Playwright projects
- Enforces `dvh` over `vh` for modal sizing; `mq` helpers over raw `@media`

**Critical — Playwright container parity:**
> Visual snapshot baselines must be regenerated in an environment matching the Playwright E2E CI Docker container (`mcr.microsoft.com/playwright:v1.58.2-noble`). Font/system library differences between environments create false visual diffs. Use the Docker container locally or trigger the `update-visual-snapshots` workflow.

---

### `simulation-correctness`

**When to use:** Deterministic simulation bugs, stat inconsistencies (e.g., hits vs AB), impossible game states, lineup/team mapping errors.

**Key guardrails:**
- Requires seed + event index captured before touching any code
- Validates invariants: batting line consistency, lineup wrap, home/away mapping, scoreboard totals
- Adds seed-anchored regression tests for every fixed bug
- All randomness flows through `src/utils/rng.ts` — no `Math.random()` in simulation code

---

### `ci-workflow`

**When to use:** GitHub Actions workflow changes — Playwright CI, lint/test CI, sharding, artifact uploads, or Copilot setup steps.

**Key guardrails:**
- Minimal, safe workflow diffs; artifact uploads preserved
- Does not assume system `apt` packages are cacheable
- For Playwright container jobs: browser binaries are pre-installed — no extra `playwright install` step

**Critical — Copilot Setup Steps workflow:**
> `.github/workflows/copilot-setup-steps.yml` must **NOT** use `container:`. Copilot's internal bootstrap steps can fail inside containers due to `/bin/sh` vs bash shell compatibility issues (e.g., `pipefail`). This is a known, intentional configuration for this repo.

---

### `rxdb-save-integrity`

**When to use:** RxDB persistence changes — save/load, export/import, event-log structure, `SaveStore` API, or `stateSnapshot` format.

**Key guardrails:**
- Treats FNV-1a export signature and monotonic event `idx` as critical invariants
- Tests malformed import payloads, collisions, and partial-write safety
- Verifies correctness under long autoplay sessions (hundreds of events)
- Keeps `save-load.spec.ts` and `import.spec.ts` E2E tests passing

---

## Common gotchas

| Gotcha | Detail |
|---|---|
| Determinism | All `random()` calls flow through `src/utils/rng.ts`. Any conditional call insertion/removal breaks seed replay. |
| Snapshot environment | Regenerate baselines inside `mcr.microsoft.com/playwright:v1.58.2-noble` or via the `update-visual-snapshots` workflow to match CI fonts/libs. |
| Copilot setup workflow | `copilot-setup-steps.yml` must not use `container:` — known bootstrap shell compatibility issue. |
| Reducer cycle order | `strategy → advanceRunners → gameOver → playerOut → hitBall → buntAttempt → playerActions → reducer`. No circular imports. |
| `useSaveStore` in tests | Requires `<RxDatabaseProvider>` in tree. Always mock with `vi.mock("@hooks/useSaveStore", ...)` in component tests. |
| `dvh` vs `vh` | Always use `dvh` for modal `max-height` — `100vh` on mobile can exceed visible viewport. |
