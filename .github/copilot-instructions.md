# Copilot Instructions for BlipIt Legends

## Project Overview

**Ballgame** is a **self-playing baseball simulator** built as a React/TypeScript PWA with a **React Router data-router** route-first architecture. The game auto-plays continuously through innings, tracking strikes, balls, outs, bases, and score. Users navigate to `/exhibition/new` to start a game, adjust autoplay speed (slow/normal/fast), or turn on **Manager Mode** to make strategic decisions that influence the simulation. The app is installable on Android and desktop via a Web App Manifest.

**Repository size:** ~130 source files. **Language:** TypeScript. **Framework:** React 19 (hooks-based). **Styling:** styled-components v6 + SASS. **Bundler:** Vite v7. **Package manager:** Yarn Berry v4. **Persistence:** RxDB v17 (IndexedDB, local-only — no sync).

---

## Detailed Reference Documentation

This file is the quick-reference index. For deeper detail, see:

| Doc                                                     | Contents                                                                                                                                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/repo-layout.md](../docs/repo-layout.md)           | Full directory tree, file descriptions, path aliases                                                                                                                                                                         |
| [docs/rxdb-persistence.md](../docs/rxdb-persistence.md) | RxDB setup, schema versioning, collections, SaveStore/CustomTeamStore APIs, fingerprints, export/import bundles, game-loop integration                                                                                       |
| [docs/architecture.md](../docs/architecture.md)         | Route architecture, auto-play scheduler, Manager Mode, notification system, shared logger                                                                                                                                    |
| [docs/e2e-testing.md](../docs/e2e-testing.md)           | Playwright projects, E2E helpers, `data-testid` reference, visual snapshots, CI workflows, save fixtures                                                                                                                     |
| [docs/style-guide.md](../docs/style-guide.md)           | **UI Style Guide** — color palette, typography, breakpoints, all button variants, form elements, modals, cards, tables, game UI, and status patterns. **Consult before introducing any new color, font size, or component.** |
| [agents/README.md](agents/README.md)                    | Agent routing guide — which specialized agent to use for each task type, common gotchas for multi-session PRs                                                                                                                |
| [agents/prompt-examples.md](agents/prompt-examples.md)  | Copy-paste prompt templates for each agent type                                                                                                                                                                              |

---

## Path Aliases

All cross-directory imports use aliases (configured in `tsconfig.json` and `vite.config.ts`):

| Alias        | Resolves to      | Notes                                                  |
| ------------ | ---------------- | ------------------------------------------------------ |
| `@feat/*`    | `src/features/*` | **Preferred** for all feature code                     |
| `@shared/*`  | `src/shared/*`   | Genuinely cross-feature utilities                      |
| `@storage/*` | `src/storage/*`  | Persistence infra (DB wiring, shared types, utilities) |
| `@test/*`    | `src/test/*`     | Test helpers                                           |

Same-directory imports remain relative (e.g. `"./styles"`, `"./constants"`).

---

## Feature-First Directory Structure

The app uses a **feature-first** layout under `src/features/`. New code for a specific domain belongs in its feature directory.

```
src/
  features/
    exhibition/          ← /exhibition/new route + setup UI
      pages/ExhibitionSetupPage/
      components/StarterPitcherSelector/
    help/                ← /help route + in-game modal
      pages/HelpPage/
      components/HelpContent/
      components/InstructionsModal/
    saves/               ← /saves route + save persistence
      pages/SavesPage/
      storage/saveStore.ts
      storage/schema.ts
    careerStats/         ← /stats + /players/:key routes
      pages/CareerStatsPage/
      pages/PlayerCareerPage/
      storage/gameHistoryStore.ts
      storage/schema.ts
      utils/             ← careerStats-only stat helpers
    customTeams/         ← team builder, adapters, generation
      adapters/customTeamAdapter.ts
      generation/generateDefaultTeam.ts
      storage/schema.ts    ← customTeams RxDB schema + migrations
      statBudget.ts
    gameplay/            ← simulation engine, shell UI, gameplay hooks + pages
      components/        ← AppShell, Game, GameControls, HomeScreen, RootLayout, all gameplay UI
      constants/         ← pitchTypes (gameplay-only enum)
      context/           ← simulation engine (State, reducer, strategy, handlers…)
      hooks/             ← useAutoPlayScheduler, usePitchDispatch, useHomeScreenMusic, etc.
      pages/GamePage/    ← /game route
      utils/             ← announce, audio, tts, homeMusic, getRandomInt (gameplay-only)
  shared/                ← only code used by 2+ unrelated features
    constants/hitTypes.ts
    utils/logger.ts, mediaQueries.ts, rng.ts, roster.ts, saves.ts
    utils/stats/computeBattingStatsFromLogs.ts
  storage/               ← DB wiring + shared infra (never feature logic)
    db.ts                ← thin wiring: imports schemas from features
    types.ts             ← shared domain types
    hash.ts, generateId.ts, saveIO.ts
```

### Feature ownership rules

| Code type                                            | Where it lives                                 |
| ---------------------------------------------------- | ---------------------------------------------- |
| Page component + hook + styles for one route         | `src/features/<domain>/pages/<PageName>/`      |
| UI component owned by one feature                    | `src/features/<domain>/components/<Name>/`     |
| Domain adapter / resolver                            | `src/features/<domain>/adapters/`              |
| RxDB schema + migration strategies for a collection  | `src/features/<domain>/storage/schema.ts`      |
| Store API (query/mutation functions) for one feature | `src/features/<domain>/storage/<name>Store.ts` |
| Utility used only by one feature                     | `src/features/<domain>/utils/`                 |
| Code used by 2+ unrelated features                   | `src/shared/`                                  |
| DB wiring, shared types, file I/O utilities          | `src/storage/`                                 |
| Game simulation engine                               | `src/features/gameplay/context/`               |

---

## Key Architectural Notes

- All game state lives in `src/features/gameplay/context/index.tsx` (`State` interface) and is mutated by `src/features/gameplay/context/reducer.ts`.
- `src/features/gameplay/components/GameControls/useGameControls.ts` is the single hook that wires all game-controls hooks and `localStorage` state together. `GameControls/index.tsx` consumes this hook and renders the controls UI. All underlying pitch/audio/replay logic lives in focused hooks under `src/features/gameplay/hooks/`.
- `GameContext` is typed `createContext<ContextValue | undefined>(undefined)`. Always consume it via the `useGameContext()` hook exported from `@feat/gameplay/context/index` — **never** call `React.useContext(GameContext)` directly in components.
- **`ContextValue` extends `State`** and adds `dispatch: React.Dispatch<GameAction>`, `dispatchLog: React.Dispatch<LogAction>`, and `log: string[]` (play-by-play, most recent first). All three are provided by `GameProviderWrapper`.
- **`LogAction`** = `{ type: "log"; payload: string }`. **`GameAction`** = `{ type: string; payload?: unknown }`. Both are exported from `@feat/gameplay/context/index`.
- **`GameProviderWrapper`** accepts an optional `onDispatch?: (action: GameAction) => void` prop. `src/features/gameplay/components/Game/index.tsx` uses this to buffer every dispatched action into `actionBufferRef` for RxDB sync.
- Reducer action types: `nextInning`, `hit`, `setTeams`, `strike`, `foul`, `wait`, `steal_attempt`, `bunt_attempt`, `intentional_walk`, `set_one_pitch_modifier`, `set_pending_decision`, `skip_decision`, `reset`, `clear_suppress_decision`, `set_pinch_hitter_strategy`, `set_defensive_shift`, `restore_game`.
- `detectDecision(state, strategy, managerMode)` is exported from `src/features/gameplay/context/reducer.ts` and called in `usePitchDispatch` to detect decision points before each pitch.
- **Context module dependency order (no cycles):** `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`

---

## Seeded Randomness

All randomness is routed through `src/shared/utils/rng.ts` (mulberry32 PRNG):

- **`initSeed()`** — generates a fresh random seed and initializes the PRNG. Called once in `src/index.tsx` before the React tree mounts. Idempotent — subsequent calls are no-ops.
- **`random()`** — returns a deterministic float in `[0, 1)` from the seeded PRNG.
- **`getSeed()`** — returns the current seed value (or null if not yet initialized).
- **`reinitSeed(seedStr)`** — re-initializes the PRNG from a caller-supplied seed string (base-36 or decimal). Called when the user submits the New Game form. Does **not** write to the URL.

---

## Linting & Formatting

The project uses **ESLint v9** (flat config) + **Prettier v3**.

- **`eslint.config.mjs`** — flat config with TypeScript, React, React Hooks, `simple-import-sort`, and Prettier rules.
- **`.prettierrc`** — double quotes, trailing commas, `printWidth: 100`, LF line endings.
- `no-console` is turned **off** only for `src/shared/utils/logger.ts` (it IS the logging abstraction).
- `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` are turned off for test files (`**/*.test.{ts,tsx}` and `src/test/**`).

**Import ordering** is enforced by `eslint-plugin-simple-import-sort` with these groups:

1. Side-effect imports (e.g. CSS)
2. React packages (`react`, `react-dom`, `react/*`)
3. Other external packages
4. Internal aliases (`@feat`, `@shared`, `@storage`, `@test`)
5. Relative imports (`./`)

**Scripts:**

```bash
yarn lint          # ESLint check
yarn lint:fix      # ESLint auto-fix
yarn format        # Prettier write (TS/TSX + E2E TS + Playwright config + all Markdown)
yarn format:check  # Prettier check (TS/TSX + E2E TS + Playwright config + all Markdown)
```

Pre-commit formatting is enforced locally via a Husky + lint-staged hook (`.husky/pre-commit`) that runs Prettier on staged `*.md`, `*.ts`, `*.tsx`, and `playwright.config.ts` files.

The **CI lint workflow** (`.github/workflows/lint.yml`) runs `yarn lint` and `yarn format:check` on every push and PR.

---

## Build & Development

**Always run `yarn` (install) before building if `node_modules` is missing.**

```bash
yarn                  # install dependencies
yarn dev              # vite dev server (hot reload on http://localhost:5173)
yarn build            # vite build → dist/
yarn test             # vitest run (one-shot)
yarn test:coverage    # vitest run --coverage (thresholds: lines/functions/statements 90%, branches 80%)
yarn test:e2e         # build app then run all Playwright E2E tests headlessly
yarn test:e2e:ui      # open Playwright UI mode for interactive debugging
yarn test:e2e:update-snapshots  # regenerate visual regression baseline PNGs — do NOT run locally and commit; use the e2e-test-runner agent (docker run inside the container) or the update-visual-snapshots workflow instead
yarn lint             # ESLint check
yarn lint:fix         # ESLint auto-fix
yarn format:check     # Prettier check
```

**TypeScript** is type-checked by editors / `tsc --noEmit`; Vite uses esbuild to strip types at build time. TypeScript errors surface as build errors only if `tsc` is run explicitly.

---

## Validation

**Always run all validation steps locally and confirm they pass before using `report_progress` to commit and push.** CI failures on the branch are not acceptable.

Validate changes by:

1. `yarn lint` — zero errors/warnings required. Run `yarn lint:fix && yarn format` to auto-fix import order and Prettier issues before checking.
2. `yarn build` — confirms TypeScript compiles and the bundle is valid.
3. `yarn test` — all tests must pass. Run `yarn test:coverage` to verify coverage thresholds (lines/functions/statements ≥ 90%, branches ≥ 80%).
4. `yarn typecheck:e2e` — **always run when adding or changing E2E test files** (`e2e/**/*.ts`). This type-checks the Playwright suite against `e2e/tsconfig.json`. Playwright's `Page` API differs from Testing Library — for example `page.getByDisplayValue` does not exist; use `page.locator('input[value="…"]')` instead.
5. `yarn test:e2e` — all Playwright E2E tests must pass (builds the app, then runs all 7 projects headlessly). If adding/changing UI components that have `data-testid` selectors or affect the play-by-play log, visual baselines may need updating — use the **`e2e-test-runner`** agent to regenerate them inside the Docker container and commit directly, or let the **`update-visual-snapshots`** workflow handle it automatically on push.

**Do not call `report_progress` until all five steps above pass locally.** If CI fails after a push, investigate it immediately using the GitHub MCP `list_workflow_runs` + `get_job_logs` tools, fix the failures, and push a corrective commit.

**PR title and description must reflect the entire PR, not just the current session's changes.** Before writing `prTitle` and `prDescription` in any `report_progress` call, review the full git history for the branch to understand all changes made across all sessions. See [agents/README.md](agents/README.md) for the full cross-session PR guideline.

---

## Code Style & File Size

- **American English spelling** — use American English in all user-facing copy, help text, comments, and documentation (e.g. "randomized" not "randomised", "customization" not "customisation"). Help copy must reflect currently implemented behavior only.
- **Target file length: ≤ 200 lines.** Aim for **100 lines or fewer** in ideal cases. Split if larger.
- **Test files are exempt from the 200-line limit.**
- **One test file per source file**, co-located next to the source (e.g. `strategy.ts` → `strategy.test.ts` in the same directory).
- **Shared test helpers live in `src/test/testHelpers.ts`** and export `makeState`, `makeContextValue`, `makeLogs`, and `mockRandom`. Import these instead of redeclaring them.

---

## No Duplication Policy

**Before building anything, check whether the logic or UI already exists elsewhere.** If the same behaviour is needed in two or more places, extract it to a shared home first, then have both consumers import from there.

### Decision tree

| What is duplicated?                                         | Where to put the shared version                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Pure utility function (formatting, file I/O, math)          | `src/shared/utils/` or `src/storage/` (e.g. `saveIO.ts`); if only one feature uses it, `src/features/<domain>/utils/` |
| Domain adapter / resolver (label resolution, ID mapping)    | `src/features/<domain>/adapters/`                                                                                     |
| React hook owned by one feature                             | `src/features/<domain>/hooks/` or alongside the page that uses it                                                     |
| React hook reused across 2+ unrelated features              | `src/shared/hooks/`                                                                                                   |
| Styled-component definitions for one feature                | `src/features/<domain>/components/<Name>/styles.ts`                                                                   |
| Styled-component definitions used by 2+ unrelated features  | `src/shared/components/<SharedName>/styles.ts`                                                                        |
| JSX content block owned by one feature                      | `src/features/<domain>/components/<Name>/index.tsx`                                                                   |
| JSX content block used by 2+ unrelated features             | `src/shared/components/<Name>/index.tsx`                                                                              |
| Page-level layout chrome (`PageContainer`, `BackBtn`, etc.) | `src/shared/components/PageLayout/styles.ts`                                                                          |
| RxDB schema + migrations for a collection                   | `src/features/<domain>/storage/schema.ts`                                                                             |

### Existing shared modules (extend these, do not re-implement)

| Module                                             | What it provides                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `@storage/saveIO`                                  | `formatSaveDate`, `downloadJson`, `readFileAsText`, `saveFilename`, `teamsFilename`, `playerFilename`                                 |
| `@storage/hash`                                    | `fnv1a(str)` — FNV-1a 32-bit hash used everywhere sigs/fingerprints are computed                                                      |
| `@storage/generateId`                              | `generateTeamId()`, `generatePlayerId()`, `generateSaveId()`, `generateSeed()` — nanoid-based                                         |
| `@storage/types`                                   | Shared domain types: `SaveDoc`, `EventDoc`, `CustomTeamDoc`, `TeamPlayer`, `PlayerDoc`, etc.                                          |
| `@shared/utils/logger`                             | `createLogger(tag)` + `appLog` singleton — shared colored console logger                                                              |
| `@shared/utils/rng`                                | `initSeed`, `reinitSeed`, `random`, `getSeed`, `getRngState`, `restoreRng`, `restoreSeed`, `generateFreshSeed`                        |
| `@shared/utils/mediaQueries`                       | `mq.mobile`, `mq.desktop`, `mq.tablet`, `mq.notMobile` breakpoint helpers                                                             |
| `@shared/utils/roster`                             | Roster helpers used by gameplay, customTeams, and careerStats                                                                         |
| `@shared/utils/saves`                              | `currentSeedStr()` — current seed as base-36 string                                                                                   |
| `@shared/utils/stats/computeBattingStatsFromLogs`  | Batting stat aggregation (gameplay + careerStats)                                                                                     |
| `@shared/constants/hitTypes`                       | `HitType` enum: Single, Double, Triple, Homerun, Walk                                                                                 |
| `@feat/gameplay/utils/announce`                    | Barrel re-export: `audio` + `homeMusic` + `tts` audio/speech utilities                                                                |
| `@feat/gameplay/constants/pitchTypes`              | `PitchType` enum + `selectPitchType`, `pitchName` helpers                                                                             |
| `@feat/careerStats/utils/computePitcherGameStats`  | Per-pitcher stats (IP, ERA, WHIP, SV/HLD/BS)                                                                                          |
| `@feat/customTeams/storage/customTeamExportImport` | `buildTeamFingerprint`, `buildPlayerSig`, `exportCustomTeams`, `exportCustomPlayer`, `importCustomTeams`, `parseExportedCustomPlayer` |
| `@feat/customTeams/adapters/customTeamAdapter`     | `resolveTeamLabel`, `resolveCustomIdsInString`, `customTeamToDisplayName`, etc.                                                       |
| `@feat/saves/storage/saveStore`                    | `SaveStore` singleton — `createSave`, `appendEvents`, `updateProgress`, `listSaves`, `deleteSave`, `exportRxdbSave`, `importRxdbSave` |
| `@feat/careerStats/storage/gameHistoryStore`       | `GameHistoryStore` singleton — career batting/pitching aggregates                                                                     |
| `@feat/help/components/HelpContent`                | All help/how-to-play section JSX (used by InstructionsModal + HelpPage)                                                               |
| `@shared/components/PageLayout/styles`             | `PageContainer`, `PageHeader`, `BackBtn` — shared page chrome                                                                         |
| `@feat/saves/components/SaveSlotList`              | Save row list UI + Load/Export/Delete buttons (used by SavesModal + SavesPage)                                                        |
| `@test/testHelpers`                                | `makeState`, `makeContextValue`, `makeLogs`, `mockRandom`                                                                             |

### Rules

- **Never copy a utility function** — if it exists in the table above, import it.
- **Never redefine styled-components** that are already in a shared styles file — import them.
- **When you notice duplication**, fix it before adding more: extract first, then wire both consumers.
- **Duplication in tests is acceptable** when it aids test readability, but shared test setup belongs in `@test/testHelpers`.

---

## Technical Notes & Gotchas

- **`tsconfig.json`** has `moduleResolution: "node"`, `jsx: "react-jsx"`, and path aliases. Vite reads it automatically via `vite.config.ts`. Do not change `moduleResolution` without testing the build and tests.
- **Single config file:** `vite.config.ts` is the only config for both Vite (build/dev) and Vitest (tests). It imports `defineConfig` from `vitest/config`. There is no separate `vitest.config.ts`.
- **Static assets live in `public/`** (not `src/`): `public/images/`, `public/manifest.webmanifest`, `public/og-image.png`. Vite copies them verbatim to `dist/` at their original paths — no content hashing. HTML references these with absolute paths (`/images/…`, `/manifest.webmanifest`).
- **Service worker is a module worker:** `src/sw.ts` is built by `vite-plugin-pwa` (`injectManifest` strategy, `rollupFormat: "es"`), output as `dist/sw.js`, and registered via `navigator.serviceWorker.register("/sw.js", { type: "module" })`.
- **`self.__WB_MANIFEST`** is the precache list injected into `sw.ts` at build time by `vite-plugin-pwa`. It is declared locally in `sw.ts` — do not import from any external package.
- **Lazy-loaded components:** `InstructionsModal`, `SavesModal`, and `DecisionPanel` are loaded via `React.lazy()` in `src/features/gameplay/components/GameControls/index.tsx` and wrapped in `<React.Suspense fallback={null}>`. Do not convert them back to static imports.
- **React 19:** Entry point uses `createRoot` from `react-dom/client`.
- **React import style:** Files use `import * as React from "react"` (not the default import).
- **Styled-components v6:** Custom props **must** be typed via generics, e.g. `styled.div<{ $active: boolean }>`. Use `$propName` (transient props) for non-HTML props.
- \*\*No `React.FunctionComponent<{}>` — write `React.FunctionComponent` (no type param) for zero-prop components.
- **Node version:** Node 24.x (see `.nvmrc`).
- **`browserslist`** is set in `package.json` (`> 0.5%, last 2 versions, not dead`).
- **`webkitAudioContext`** — use `(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` for the Safari fallback in `audio.ts`.
- **Never import GameContext directly** — always use the `useGameContext()` hook from `@feat/gameplay/context/index`.
- **`announce.ts` is a barrel re-export** — always import from `@feat/gameplay/utils/announce`; never import directly from `tts.ts` or `audio.ts`.
- **Context module cycle-free order** — `strategy` → `advanceRunners` → `gameOver` → `playerOut` → `hitBall` → `buntAttempt` → `playerActions` → `reducer`. No module may import from a module later in this chain.
- **`Function` type is banned** — use explicit function signatures: `(action: GameAction) => void` for dispatch, `(action: LogAction) => void` for dispatchLog.
- **Options-hash convention for new functions** — any new function with more than two non-`state`/`log` parameters must use an options object as its final argument instead of positional params. Define a named `interface` (or `type`) for it, give every field a clear name, and provide defaults via destructuring. This avoids callers passing magic `0` / `false` sentinels to skip optional params. Example:

  ```typescript
  // ✅ Correct: named options, defaults in destructuring
  interface HandleFlyOutOptions { sacFlyPct: number; tagUp2ndPct?: number; }
  const handleFlyOut = (state, log, pitchKey, { sacFlyPct, tagUp2ndPct = 0 }: HandleFlyOutOptions) => …

  // ❌ Wrong: positional params requiring callers to pass 0 to skip
  const handleFlyOut = (state, log, pitchKey, sacFlyPct, tagUp2ndPct) => …
  handleFlyOut(state, log, key, 65, 0)  // what is 0?
  ```

  Exported options interfaces live alongside the function they describe in the same file. Existing functions with positional params are not required to be refactored unless they are being modified as part of the current task.

- **ESLint enforces import order** — run `yarn lint:fix` after adding imports to auto-sort them.
- **`@storage/*` alias** — always import from `@storage/db`, `@storage/types`, `@storage/hash`, `@storage/generateId`, `@storage/saveIO`; never use relative paths across directories. Note: `saveStore` has moved to `@feat/saves/storage/saveStore`; `customTeamStore` to `@feat/customTeams/storage/customTeamStore`; `gameHistoryStore` to `@feat/careerStats/storage/gameHistoryStore`.
- **`SaveStore` is a singleton** backed by `getDb()`. For tests, use `makeSaveStore(_createTestDb(getRxStorageMemory()))` — each call to `_createTestDb()` appends a random suffix to avoid RxDB registry collisions.
- **`_createTestDb` requires `fake-indexeddb/auto`** — import it at the top of any test file that calls `_createTestDb`. It is a dev-only dependency.
- **`useSaveStore` requires `<RxDatabaseProvider>`** in the tree. Mock the hook in component tests with `vi.mock("@feat/saves/hooks/useSaveStore", ...)`.
- **RxDB schema changes MUST bump `version` and add a migration strategy** — any change to a collection's `properties`, `required`, or `indexes` at the same version number causes a DB6 schema hash mismatch for every existing user, blocking app startup. Always: (1) increment `version`, (2) add a `migrationStrategies` entry that never throws, (3) add an upgrade-path unit test. See `### Schema versioning & migration` in [`docs/rxdb-persistence.md`](../docs/rxdb-persistence.md).
- **Service worker must NOT initialize or use RxDB** — RxDB is window-only. The service worker only handles notifications and lightweight message passing.
- **`InstructionsModal` visibility** — `display: flex` lives inside `&[open]` in `src/features/help/components/InstructionsModal/styles.ts`. Never move it outside or the native `<dialog>` hidden state will be overridden. Import `InstructionsModal` via `@feat/help/components/InstructionsModal`.
- **Do NOT use `@vitest/browser` for E2E tests** — `@vitest/browser` (with the Playwright provider) runs component tests _inside_ a real browser, but it cannot do page navigation, multi-step user flows, or visual regression. Use `@playwright/test` (in `e2e/`) for all end-to-end tests. The two test runners serve different purposes and coexist without conflict.
- **No IIFEs in JSX** — never use `(() => { ... })()` inside JSX. IIFEs create a new function reference on every render causing unnecessary re-renders and unpredictable behaviour. Instead, compute values as `const` variables before the `return` statement and reference them directly in JSX. For non-trivial conditional rendering blocks, extract them into a named sub-component (e.g. `StarterPitcherSelector` in `ExhibitionSetupPage/`) to keep them independently testable.
- **`SavesModal` no longer has `autoOpen`/`openSavesRequestCount`/`onRequestClose`/`closeLabel` props** — these were removed when "Load Saved Game" became a dedicated `/saves` route. The modal now always closes with a simple `close()`. Do not re-add these props.
- **`CustomTeamEditor` uses drag-and-drop for all sections** — lineup, bench, and pitchers all use `SortablePlayerRow` with `@dnd-kit/sortable`. There are **no up/down arrow buttons** in the editor. Lineup and bench share one `DndContext` (inside `<div data-testid="lineup-bench-dnd-container">`) so players can be dragged between sections. Pitchers have their own isolated `DndContext`. The `TRANSFER_PLAYER` action (`{ fromSection, toSection, playerId, toIndex }`) in `editorReducer` handles cross-section moves. `PlayerRow` (the old up/down component) is preserved in the file system but is not used in `index.tsx` — do not resurrect it.
- **`useImportCustomTeams` is the shared hook for all custom-team import flows** — always use it rather than calling `importCustomTeams` directly in components. It handles file upload, paste JSON, clipboard paste, in-flight state, errors, and the two-step duplicate-player confirmation flow. The hook exposes `pendingDuplicateImport`, `confirmDuplicateImport()`, and `cancelDuplicateImport()`.
- **FNV-1a hash is in `@storage/hash`** — import `fnv1a` from there. Never reimplement it in components or store modules.
- **`generateId.ts` is the only source of new DB IDs** — always call `generateTeamId()`, `generatePlayerId()`, `generateSaveId()` from `@storage/generateId`. Never use `Date.now()` or `Math.random()` directly for IDs.
- **Seed input is on ExhibitionSetupPage** — the seed is settable via `data-testid="seed-input"` on `/exhibition/new`. The field is pre-populated with a fresh random seed via `generateFreshSeed()`. On form submit, `reinitSeed(seedStr)` in `rng.ts` re-initializes the PRNG. The seed is **not** written to the URL. E2E tests fill this field via `configureNewGame(page, { seed: "..." })` — no URL navigation needed.
- **Always use `mq` helpers in styled-components** — never write raw `@media` strings inline. Import `mq` from `@shared/utils/mediaQueries` and interpolate: `${mq.mobile} { … }`, `${mq.desktop} { … }`, `${mq.tablet} { … }`, `${mq.notMobile} { … }`. This keeps all breakpoints in sync with the SCSS variables in `index.scss`. Breakpoints: mobile ≤ 768 px, desktop ≥ 1024 px.
- **UI style guide** — before adding any new color, font size, button variant, or interactive component, consult [`docs/style-guide.md`](../docs/style-guide.md). It is the single source of truth for every visual token and pattern in the app. Never introduce one-off colors or component shapes that deviate from it.
- **NewGameDialog mobile compaction** — `NewGameDialog/styles.ts` uses `${mq.mobile}` blocks on every styled component (Dialog, Title, FieldGroup, FieldLabel, Input, Select, SectionLabel, RadioLabel, ResumeButton, Divider, PlayBallButton, SeedHint) to reduce padding/margins so the modal fits without scrolling on phone viewports. `PlayerCustomizationPanel.styles.ts` does the same for `PanelSection`. The Dialog's `max-height` uses `min(96dvh, 820px)` on mobile (vs `90dvh` on desktop) to reclaim browser-chrome space. Never revert these to desktop-only values.
- **Viewport-safe modal sizing** — always use `dvh` (dynamic viewport height) units, not bare `vh`, for modal `max-height`. `100vh` on mobile browsers can exceed the visible area because it ignores browser chrome (address bar, navigation bar). `dvh` tracks the actual visible viewport. The `responsive-smoke.spec.ts` E2E test verifies the Play Ball button bottom edge is within `viewport.height` on all projects.
- **`ResumeLabel` span in NewGameDialog** — the "Resume: " prefix inside `ResumeButton` is wrapped in `<ResumeLabel>` (exported from `NewGameDialog/styles.ts`). `ResumeLabel` uses `display: none` inside `${mq.mobile}` so on phone viewports the button shows "▶ {saveName}" (shorter) while desktop still shows "▶ Resume: {saveName}". Do not remove this span or inline the text directly into `ResumeButton`.
- **`responsive-smoke.spec.ts` New Game dialog tests** — three tests guard the no-scroll contract on all viewport projects: (1) Play Ball button bottom edge ≤ viewport height; (2) critical fields (`matchup-mode-select`, `home-team-select`, `away-team-select`, `seed-input`, `play-ball-button`) all have bottom edges within viewport height; (3) `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal overflow). Always keep these passing when touching NewGameDialog layout.
