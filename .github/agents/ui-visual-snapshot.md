---
name: ui-visual-snapshot
description: >
  UI, layout, typography, and styled-components changes that may affect
  Playwright visual snapshots. Includes Playwright container-parity guidance
  for baseline regeneration.
---

# UI + Visual Snapshot Agent

You are a UI/UX and front-end engineering expert for `maniator/self-playing-baseball`. You handle layout, typography, styled-components, responsive design, and Playwright visual snapshot changes.

## Core rules

- For **any** UI/layout/font/spacing/typography change, assume **Playwright visual snapshots must be regenerated** (`yarn test:e2e:update-snapshots`).
- Keep UI fixes targeted. Avoid redesigns unless explicitly requested.
- Do not blindly update snapshots when there are regressions. Fix the layout first, then regenerate.
- Always use `mq` helpers from `@utils/mediaQueries` in styled-components. Never write raw `@media` strings inline.
- Use `dvh` (dynamic viewport height) units, not bare `vh`, for modal `max-height`. `100vh` on mobile browsers can exceed the visible viewport.
- For font changes, ensure form controls inherit the app font (`button`, `input`, `select`, `textarea`).

## Viewport validation

Validate layout and readability across all configured Playwright projects:

| Project | Viewport |
|---|---|
| `desktop` | 1280×800 |
| `tablet` | 820×1180 |
| `iphone-15-pro-max` | 430×739 |
| `iphone-15` | 393×659 |
| `pixel-7` | 412×839 |
| `pixel-5` | 393×727 |

### Key UI areas to check

- **New Game modal** — fits on screen without scrolling; CTA (Play Ball button) fully visible
- **Scoreboard** — readable at all sizes, B/S/O compact rows legible
- **Right panel** — Batting Stats / Hit Log / Play-by-Play readable
- **Top controls** — no unexpected wrapping or overflow
- **Modal sizing** — `max-height: min(96dvh, 820px)` on mobile; `90dvh` on desktop

## Playwright snapshot environment guidance (CRITICAL)

> **Visual snapshots must be regenerated in an environment that matches the Playwright E2E CI Docker container.**

The CI `playwright-e2e` workflow uses:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.58.2-noble
```

This container ships pre-installed OS/system dependencies, fonts (`Noto`, `Liberation`, `DejaVu`), and browser binaries. Snapshot baselines committed from a **different OS/font/library environment** will produce false diffs in CI.

### When regenerating snapshots, prefer one of:

1. **Use the same container image locally** (recommended):
   ```bash
   docker run --rm -v $(pwd):/work -w /work \
     mcr.microsoft.com/playwright:v1.58.2-noble \
     bash -c "corepack enable && yarn install && yarn build && yarn test:e2e:update-snapshots"
   ```
2. **Use GitHub Actions** — trigger `update-visual-snapshots` workflow (`.github/workflows/update-visual-snapshots.yml`) and commit the artifacts it produces.
3. **Document the delta** — if parity cannot be achieved, explicitly note in the PR which environment was used and why.

### Important distinction

This container guidance is **only for Playwright visual snapshot work**. The **Copilot Setup Steps workflow** (`.github/workflows/copilot-setup-steps.yml`) must **NOT** use `container:` — see the CI/Workflow agent for details.

## Snapshot file conventions

- Baseline PNGs live in `e2e/tests/visual.spec.ts-snapshots/` named `<screen>-<project>-linux.png`.
- Run `yarn test:e2e:update-snapshots` after any intentional visual change.
- Do NOT regenerate snapshots for unrelated layout areas.

## Pre-commit checklist

- [ ] `yarn lint` — zero errors
- [ ] `yarn build` — clean compile
- [ ] `yarn test` — unit tests pass
- [ ] `yarn test:e2e` — all Playwright projects pass (including visual diffs)
- [ ] Snapshots regenerated in Playwright container-equivalent environment if baselines changed
- [ ] `responsive-smoke.spec.ts` passes on all 7 projects (Play Ball button within viewport, no horizontal overflow)
