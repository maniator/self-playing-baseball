# Contributing to Ballgame

Thanks for your interest in contributing! This guide covers everything you need to get started.

> **Note:** `.github/copilot-instructions.md` is a Copilot/AI-agent-specific index. This file (`CONTRIBUTING.md`) is the human contribution guide.

---

## Project overview

**Ballgame** is a self-playing baseball simulator — a React/TypeScript PWA that auto-plays a full 9-inning game pitch by pitch, with optional Manager Mode for strategic decisions. It runs entirely in the browser with no backend.

---

## Prerequisites

- **Node 24.x** (see `.nvmrc`)
- **Yarn Berry v4** (`corepack enable` or install via npm)

---

## Install, run, and build

```bash
# Install dependencies
yarn

# Start the dev server (http://localhost:5173)
yarn dev

# Production build → dist/
yarn build
```

---

## Validation

Run all of the following before opening a PR — CI enforces each step:

```bash
# Lint workflow (lint.yml)
yarn lint                          # ESLint — zero errors/warnings required
yarn format:check                  # Prettier format check
yarn typecheck:e2e                 # Type-check Playwright E2E suite
node scripts/check-spec-sizes.mjs  # Enforce per-spec file size limits

# CI workflow (ci.yml)
yarn test:coverage  # Vitest with coverage (lines/functions/statements ≥ 90%, branches ≥ 80%)
yarn build          # TypeScript compile + Vite bundle

# E2E workflow (playwright-e2e.yml)
yarn test:e2e       # Playwright E2E tests across 7 device projects
```

Run `yarn lint:fix && yarn format` to auto-fix import order and Prettier issues before checking lint.

---

## Code organization

The app uses a **feature-first** layout:

```
src/
  features/          ← domain code (gameplay, saves, careerStats, customTeams, …)
  shared/            ← utilities used by 2+ unrelated features
  storage/           ← DB wiring, shared types, file I/O utilities
```

See [`docs/repo-layout.md`](docs/repo-layout.md) for the full directory tree and path aliases.

---

## Docs map

| Doc | When to read it |
|---|---|
| [`docs/style-guide.md`](docs/style-guide.md) | Before adding or changing any UI element, color, font size, or button variant |
| [`docs/architecture.md`](docs/architecture.md) | Before touching routes, auto-play scheduler, Manager Mode, or the notification system |
| [`docs/rxdb-persistence.md`](docs/rxdb-persistence.md) | Before changing any RxDB schema, collection, or persistence logic |
| [`docs/e2e-testing.md`](docs/e2e-testing.md) | Before writing or changing E2E tests, fixtures, or visual snapshots |
| [`docs/repo-layout.md`](docs/repo-layout.md) | For a full directory tour and path aliases |

---

## Pull request guidelines

- **Small, focused PRs.** One concern per PR — easier to review and revert.
- **No duplication.** Before building anything, check whether the logic or UI already exists. If it does, import it rather than re-implementing it. See the "No Duplication Policy" table in [`docs/repo-layout.md`](docs/repo-layout.md).
- **UI changes** — consult [`docs/style-guide.md`](docs/style-guide.md) before introducing any new color, font size, or component shape.
- **Persistence/schema changes** — read [`docs/rxdb-persistence.md`](docs/rxdb-persistence.md) before touching any RxDB schema. Every schema change must bump `version` and include a migration strategy.
- **E2E changes** — read [`docs/e2e-testing.md`](docs/e2e-testing.md). Visual snapshot baselines must be regenerated inside the CI Docker container — do not commit locally generated snapshots.
- **All validation steps must pass** (see above) before requesting review.
- **American English** in all user-facing copy, comments, and docs.

---

## Code style

- ESLint v9 (flat config) + Prettier v3 enforce style automatically. Run `yarn lint:fix && yarn format` before committing.
- Import order is enforced by `eslint-plugin-simple-import-sort`.
- Target file length: ≤ 200 lines (≤ 100 lines ideal). Split larger files.
- Seeded randomness: all `random()` calls go through `src/shared/utils/rng.ts`. Never call `Math.random()` in simulation code.

---

## Further reading

- [docs/](docs/) — full documentation index
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
