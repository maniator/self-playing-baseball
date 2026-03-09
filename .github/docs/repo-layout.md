# Repository Layout & Path Aliases

> Part of the Ballgame Copilot reference docs. See [copilot-instructions.md](../copilot-instructions.md) for the index.

## Repository Layout

```
/
├── .github/                        # GitHub config (copilot-instructions.md, workflows/)
├── .yarn/                          # Yarn releases
├── .yarnrc.yml                     # Yarn Berry config (nodeLinker: node-modules)
├── .gitignore
├── .nvmrc                          # Node version: 24
├── .prettierrc                     # Prettier config (double quotes, trailing commas, printWidth 100)
├── eslint.config.mjs               # ESLint flat config (TS + React + import-sort + Prettier + e2e overrides)
├── tsconfig.json                   # TypeScript config with path aliases (jsx: react-jsx)
├── vite.config.ts                  # Vite + Vitest config: React plugin, path aliases, vite-plugin-pwa, test section
├── playwright.config.ts            # Playwright E2E config: 7 projects (determinism + desktop/tablet/iphone-15-pro-max/iphone-15/pixel-7/pixel-5)
├── package.json                    # Scripts, dependencies, Husky/Commitizen config
├── yarn.lock
├── vercel.json                     # Vercel SPA routing + outputDirectory + SW headers (version 2)
├── public/                         # Static assets copied verbatim to dist/ by Vite (no hashing)
│   ├── manifest.webmanifest        # PWA manifest: name "Ballgame", icons, theme_color #000000
│   ├── og-image.png                # OG / Twitter card image (stable URL: /og-image.png)
│   └── images/
│       ├── baseball.svg            # SVG icon (baseball with red stitches on black bg) — favicon + source
│       ├── baseball-192.png        # PWA icon 192×192 (generated from baseball.svg)
│       ├── baseball-512.png        # PWA icon 512×512 / maskable (generated from baseball.svg)
│       ├── baseball-180.png        # Apple touch icon 180×180
│       └── favicon-32.png          # Fallback favicon 32×32
├── dist/                           # Build output (gitignored)
├── e2e/                            # Playwright E2E tests
│   ├── fixtures/
│   │   ├── sample-save.json        # FNV-1a signed save fixture for import tests
│   │   ├── pending-decision.json   # Inning 4 bottom, defensive_shift pending, managerMode on
│   │   ├── pending-decision-pinch-hitter.json  # Inning 7 top, pinch_hitter pending
│   │   ├── pending-decision-pinch-hitter-teams.json  # Same as above but with custom teams + player sigs
│   │   ├── mid-game-with-rbi.json  # Inning 5 top, 3-2 score, playLog has RBI entries
│   │   ├── finished-game.json      # Completed game with FINAL banner
│   │   └── legacy-teams-no-fingerprints.json  # Pre-v2 teams export bundle (no player fingerprints)
│   ├── tests/
│   │   ├── smoke.spec.ts           # App loads, Play Ball starts game, autoplay progresses
│   │   ├── determinism.spec.ts     # Same seed → same play-by-play (desktop-only project, two fresh IndexedDB contexts)
│   │   ├── save-load.spec.ts       # Save game, load game, autoplay resumes
│   │   ├── import.spec.ts          # Import fixture, save visible in list
│   │   ├── routing.spec.ts         # Route transitions: Home→/exhibition/new, /saves, /help, /teams/:id/edit (desktop-only)
│   │   ├── home.spec.ts            # Home screen buttons + resume-current-game flow
│   │   ├── modals.spec.ts          # In-game Saves modal + InstructionsModal smoke
│   │   ├── responsive-smoke.spec.ts # Scoreboard/field/log visible & non-zero on all viewports
│   │   ├── layout.spec.ts          # Layout pixel-diff snapshots
│   │   ├── manage-teams-and-custom-game-flow.spec.ts  # Full Create/Edit/Delete team + start custom game
│   │   ├── custom-team-editor.spec.ts  # Team editor form interactions (desktop), DnD drag handles
│   │   ├── custom-team-editor-mobile-and-regressions.spec.ts  # Mobile team editor regressions
│   │   ├── import-export-teams.spec.ts  # Custom teams export/import round-trips, legacy file import, tamper detection
│   │   ├── import-save-missing-teams.spec.ts  # Save import with missing team data
│   │   ├── stats.spec.ts           # Live batting stats + hit log correctness
│   │   ├── batting-stats.spec.ts   # Stat-budget regression
│   │   ├── stat-budget.spec.ts     # Stat-budget smoke
│   │   ├── starting-pitcher-selection.spec.ts  # Custom-game starting pitcher selector
│   │   ├── manager-mode.spec.ts    # Manager Mode toggle + strategy selector
│   │   ├── notifications.spec.ts   # Browser notification permission + service worker message
│   │   ├── substitution.spec.ts    # Pinch hitter substitution flow
│   │   ├── qa-regression.spec.ts   # Miscellaneous QA regression tests
│   │   └── visual/                 # Pixel-diff snapshots per page (baselines per project)
│   └── utils/
│       └── helpers.ts              # resetAppState, startGameViaPlayBall, waitForLogLines(page, count, timeout?),
│                                   # captureGameSignature(page, minLines?, logTimeout?), openSavesModal,
│                                   # saveCurrentGame, loadFirstSave, importSaveFromFixture,
│                                   # assertFieldAndLogVisible, disableAnimations, loadFixture,
│                                   # configureNewGame(page, options?), computeTeamsSignature(page, payload),
│                                   # importTeamsFixture(page, fixtureName), expectNoRawIdsVisible(page)
└── src/
    ├── index.html                  # HTML entry point for Vite (script has type="module", image hrefs are absolute /…)
    ├── index.scss                  # Global styles + mobile media queries
    ├── index.tsx                   # React entry: initSeed, registers /sw.js, createRoot
    ├── router.tsx                  # createBrowserRouter + RouterProvider; defines full route tree (/, /exhibition/new, /game, /teams, /teams/:id/edit, /saves, /help)
    ├── sw.ts                       # Service worker: uses self.__WB_MANIFEST (injected by vite-plugin-pwa), caches bundles, handles notificationclick
    ├── storage/                    # Shared persistence infra (DB wiring + thin re-exports; no feature logic)
    │   ├── db.ts                   # Lazy-singleton BallgameDb; adds all collections via schemas imported from features/;
    │   │                           #   exports getDb(), _createTestDb()
    │   ├── hash.ts                 # fnv1a(str): string — FNV-1a 32-bit hash, 8 hex chars
    │   ├── generateId.ts           # nanoid-based ID generators: generateTeamId(), generatePlayerId(), generateSaveId(), generateSeed()
    │   ├── saveIO.ts               # formatSaveDate, downloadJson, readFileAsText, saveFilename,
    │   │                           #   teamsFilename, playerFilename, slugify (internal)
    │   └── types.ts                # Central re-export hub — feature-owned types live in their feature's
    │                               #   storage/types.ts; all @storage/types imports remain valid through re-exports
    ├── features/                   # Feature-first domain code (preferred destination for new code)
    │   ├── exhibition/             # /exhibition/new route — New Game setup
    │   │   ├── pages/ExhibitionSetupPage/
    │   │   │   ├── index.tsx           # Full-page Exhibition Setup — primary New Game entry point (/exhibition/new)
    │   │   │   │                       #   Defaults to Custom Teams tab; uses useExhibitionSetup hook
    │   │   │   ├── styles.ts           # Styled components for the exhibition setup page
    │   │   │   └── useExhibitionSetup.ts  # Hook: team selection, custom team logic, starter pitcher, form submit
    │   │   ├── components/StarterPitcherSelector/
    │   │   │   └── index.tsx       # Dropdown for managed-team starting pitcher — independently testable
    │   │   ├── components/CustomTeamMatchup/
    │   │   │   └── index.tsx       # Custom team matchup selector (home/away + managed-team tabs)
    │   │   └── styles.ts           # Shared styled components for exhibition (CustomTeamMatchup tab styles)
    │   ├── help/                   # /help route + in-game modal
    │   │   ├── pages/HelpPage/
    │   │   │   ├── index.tsx           # Standalone How to Play page at /help
    │   │   │   └── styles.ts           # Styled components for help page
    │   │   ├── components/HelpContent/
    │   │   │   ├── index.tsx           # All help sections JSX (reused by HelpPage + InstructionsModal)
    │   │   │   └── styles.ts           # Section + list styled components for help content
    │   │   └── components/InstructionsModal/
    │   │       ├── index.tsx           # Full-screen scrollable <dialog>; collapsible <details> sections; ✕ close button
    │   │       └── styles.ts           # Styled components for modal; HelpButton re-exported from GameControls/styles
    │   ├── saves/                  # /saves route + save persistence
    │   │   ├── pages/SavesPage/
    │   │   │   ├── index.tsx           # Exhibition Saves page at /saves
    │   │   │   └── styles.ts           # Styled components for saves page
    │   │   ├── components/SavesModal/
    │   │   │   ├── index.tsx           # Save management overlay: list, create, load, delete, export, import
    │   │   │   ├── styles.ts           # Styled components for saves modal
    │   │   │   └── useSavesModal.ts    # Hook: calls useSaveStore for all save CRUD operations
    │   │   ├── components/SaveSlotList/
    │   │   │   ├── index.tsx           # Save row list UI + Load/Export/Delete buttons
    │   │   │   └── styles.ts           # Styled components for save slot list
    │   │   ├── hooks/
    │   │   │   ├── useImportSave.ts    # Save import from file or paste (used by SavesModal + SavesPage)
    │   │   │   ├── useRxdbGameSync.ts  # Drains actionBufferRef → appendEvents on pitchKey advance
    │   │   │   ├── useSaveSlotActions.ts  # Stable callbacks: handleLoad, handleExport, handleDelete
    │   │   │   └── useSaveStore.ts     # useLiveRxQuery wrapper for reactive saves list + stable write callbacks
    │   │   └── storage/
    │   │       ├── saveStore.ts        # SaveStore singleton + makeSaveStore() factory
    │   │       ├── schema.ts           # savesSchema (v1) + eventsSchema (v0)
    │   │       └── types.ts            # SaveDoc, EventDoc, GameSaveSetup, RxdbExportedSave, GameLocationState, …
    │   ├── careerStats/            # /stats + /players/:key routes
    │   │   ├── pages/CareerStatsPage/
    │   │   │   └── index.tsx           # Career batting/pitching leaderboards
    │   │   ├── pages/PlayerCareerPage/
    │   │   │   └── index.tsx           # Per-player career stats (batting + pitching tabs)
    │   │   ├── hooks/
    │   │   │   └── useGameHistorySync.ts  # Writes completed game stats to RxDB on game-over
    │   │   ├── storage/
    │   │   │   ├── gameHistoryStore.ts    # GameHistoryStore singleton — career batting/pitching aggregates
    │   │   │   ├── schema.ts             # players, games, playerGameStats, pitcherGameStats schemas (v0)
    │   │   │   └── types.ts              # GameDoc, PlayerGameStatDoc, TeamCareerSummary, …
    │   │   ├── utils/
    │   │   │   ├── computePitcherGameStats.ts  # Per-pitcher stats (IP, ERA, WHIP, SV/HLD/BS)
    │   │   │   └── computeSaveHoldBS.ts        # SV/HLD/BS determination logic
    │   │   └── styles.ts               # Shared styled components for career stats pages
    │   ├── customTeams/            # /teams + /teams/:id/edit routes — team builder
    │   │   ├── pages/ManageTeamsScreen/
    │   │   │   ├── index.tsx           # Route-aware screen: list view at /teams, editor at /teams/:id/edit and /teams/new
    │   │   │   ├── TeamListItem.tsx    # Single team row (edit/delete/export buttons)
    │   │   │   └── styles.ts           # Styled components for manage teams screen
    │   │   ├── components/CustomTeamEditor/
    │   │   │   ├── index.tsx           # Full team editor: all sections use drag-and-drop (SortablePlayerRow)
    │   │   │   │                       #   Lineup + bench share one DndContext; pitchers have their own DndContext
    │   │   │   ├── SortablePlayerRow.tsx   # Drag-and-drop player row using useSortable
    │   │   │   ├── PlayerStatFields.tsx    # Shared stat sliders (contact/power/speed + pitcher stats)
    │   │   │   ├── editorState.ts      # EditorState, EditorAction, editorReducer, validateEditorState
    │   │   │   │                       #   TRANSFER_PLAYER: { fromSection, toSection, playerId, toIndex }
    │   │   │   ├── playerConstants.ts  # DEFAULT_LINEUP_POSITIONS, BATTER_POSITION_OPTIONS, PITCHER_POSITION_OPTIONS
    │   │   │   ├── statBudget.ts       # HITTER_STAT_CAP (150), PITCHER_STAT_CAP (160), hitterStatTotal, pitcherStatTotal
    │   │   │   └── styles.ts           # Styled components; includes ImportPlayerBtn, PlayerDuplicateBanner
    │   │   ├── adapters/
    │   │   │   └── customTeamAdapter.ts  # customTeamToDisplayName, customTeamToGameId,
    │   │   │                             #   customTeamToPlayerOverrides, resolveTeamLabel, etc.
    │   │   ├── generation/
    │   │   │   └── generateDefaultTeam.ts  # generateDefaultCustomTeamDraft(seed) — deterministic random team
    │   │   ├── hooks/
    │   │   │   └── useImportCustomTeams.ts  # Shared import logic: file upload, paste JSON, clipboard paste,
    │   │   │                                #   duplicate-player confirmation flow
    │   │   └── storage/
    │   │       ├── customTeamStore.ts      # CustomTeamStore singleton + makeCustomTeamStore() factory
    │   │       ├── customTeamExportImport.ts  # buildTeamFingerprint, buildPlayerSig, exportCustomTeams, importCustomTeams
    │   │       ├── schema.ts               # customTeamsSchema v3 (v0→v1→v2→v3 migrations)
    │   │       └── types.ts                # CustomTeamDoc, TeamPlayer, CreateCustomTeamInput, …
    │   └── gameplay/               # Gameplay simulation engine, shell components, hooks, and pages
    │       ├── components/
    │       │   ├── AppShell/
    │       │   │   └── index.tsx       # Pure layout component: renders <Outlet context={outletContext} />; provides AppShellOutletContext
    │       │   │                       #   AppShellOutletContext: { onStartGame, onLoadSave, onGameSessionStarted, onNewGame, onLoadSaves, onManageTeams, onResumeCurrent, onHelp, onBackToHome, hasActiveSession }
    │       │   ├── HomeScreen/
    │       │   │   ├── index.tsx       # Home screen: New Game / Load Saved Game / Manage Teams / Help buttons
    │       │   │   └── styles.ts       # Styled components for home screen
    │       │   ├── Announcements/index.tsx  # Play-by-play log with heading + empty-state placeholder
    │       │   ├── Ball/
    │       │   │   ├── constants.ts    # hitDistances: pixel travel distance per Hit type
    │       │   │   └── index.tsx       # Ball animation component; key={pitchKey} restarts CSS animation
    │       │   ├── DecisionPanel/
    │       │   │   ├── constants.ts    # DECISION_TIMEOUT_SEC (10), NOTIF_TAG ("manager-decision")
    │       │   │   ├── DecisionButtonStyles.ts  # Styled-component button variants
    │       │   │   ├── DecisionButtons.tsx      # Decision action button groups per decision kind
    │       │   │   ├── notificationHelpers.ts   # showManagerNotification, closeManagerNotification
    │       │   │   ├── styles.ts       # Styled components for DecisionPanel layout
    │       │   │   └── index.tsx       # Manager decision UI: prompt, buttons, 10s countdown bar
    │       │   ├── Diamond/
    │       │   │   ├── index.tsx       # Baseball diamond — self-contained with FieldWrapper container
    │       │   │   └── styles.ts       # Styled components for diamond layout
    │       │   ├── Game/
    │       │   │   ├── index.tsx       # Owns actionBufferRef; wraps tree with RxDatabaseProvider + GameProviderWrapper
    │       │   │   ├── ErrorBoundary.tsx  # React error boundary — catches render errors, clears stale localStorage keys
    │       │   │   ├── GameInner.tsx   # Top-level layout: ExhibitionSetupPage (dialog), LineScore, GameControls, two-column body
    │       │   │   └── styles.ts       # Styled components for game layout
    │       │   ├── GameControls/
    │       │   │   ├── index.tsx       # GameControls component — renders controls using useGameControls hook
    │       │   │   ├── constants.ts    # SPEED_SLOW (1200ms), SPEED_NORMAL (700ms), SPEED_FAST (350ms), SPEED_INSTANT (0)
    │       │   │   ├── styles.ts       # Styled components for controls layout; exports HelpButton, Button
    │       │   │   ├── useGameControls.ts  # Hook: wires all game-controls hooks + localStorage state
    │       │   │   ├── ManagerModeControls.tsx  # Manager Mode checkbox, team/strategy selectors, notif badge
    │       │   │   ├── ManagerModeStyles.ts     # Styled components for manager mode controls
    │       │   │   └── VolumeControls.tsx  # Announcement + alert volume sliders with mute toggles
    │       │   ├── HitLog/index.tsx    # Hit log component
    │       │   ├── LineScore/
    │       │   │   ├── index.tsx       # Score/inning/strikes/balls/outs + FINAL banner when gameOver
    │       │   │   └── styles.ts       # Styled components for line score
    │       │   ├── PlayerStatsPanel/index.tsx  # Live batting stats table
    │       │   ├── RootLayout/index.tsx  # Top-level layout wrapper with ErrorBoundary
    │       │   ├── SubstitutionPanel/index.tsx  # Pinch hitter substitution UI
    │       │   └── TeamTabBar/index.tsx  # Tab bar for switching between home/away team stats
    │       ├── constants/
    │       │   └── pitchTypes.ts       # PitchType enum + selectPitchType, pitchName helpers
    │       ├── context/                # Simulation engine — strict cycle-free dependency order
    │       │   ├── index.tsx           # GameContext, useGameContext(), State, ContextValue, GameProviderWrapper
    │       │   │                       #   Exports: LogAction, GameAction, Strategy, DecisionType, OnePitchModifier
    │       │   ├── strategy.ts         # stratMod(strategy, stat) — probability multipliers per strategy
    │       │   ├── advanceRunners.ts   # advanceRunners(type, baseLayout) — pure base-advancement logic
    │       │   ├── gameOver.ts         # checkGameOver, checkWalkoff, nextHalfInning
    │       │   ├── playerOut.ts        # playerOut — handles out count, 3-out half-inning transitions
    │       │   ├── hitBall.ts          # hitBall — pop-out check, callout log, run scoring
    │       │   ├── buntAttempt.ts      # buntAttempt — fielder's choice, sacrifice bunt, bunt single, pop-out
    │       │   ├── playerActions.ts    # playerStrike, playerBall, playerWait, stealAttempt
    │       │   ├── reducer.ts          # Reducer factory; exports detectDecision(), re-exports stratMod
    │       │   ├── handlers/           # Action-specific reducer handlers (decisions, lifecycle, setup, sim)
    │       │   └── pitchSimulation/    # Pitch simulation modules (battedBall, fatigue, swingDecision, swingOutcome)
    │       ├── hooks/
    │       │   ├── useAutoPlayScheduler.ts  # Speech-gated setTimeout scheduler; pauses on manager decisions
    │       │   ├── useGameAudio.ts     # Victory fanfare + 7th-inning stretch audio playback
    │       │   ├── useGameRefs.ts      # Tracks skipDecision state to prevent re-offering same decision
    │       │   ├── useHomeScreenMusic.ts  # Background music playback on the Home screen
    │       │   ├── usePitchDispatch.ts # Pitch handler — returns handlePitch callback
    │       │   ├── usePlayerControls.ts  # All UI event handlers (volume, mute, manager mode)
    │       │   └── useVolumeControls.ts  # Volume/mute state for music (consumed by AppShell + HomeScreen)
    │       ├── pages/
    │       │   └── GamePage/index.tsx  # /game route — renders <Game /> component
    │       └── utils/
    │           ├── announce.ts         # Barrel re-export: audio + homeMusic + tts
    │           ├── audio.ts            # Web Audio API: playDecisionChime, playVictoryFanfare, play7thInningStretch
    │           ├── getRandomInt.ts     # Random number helper — delegates to rng.ts random()
    │           ├── homeMusic.ts        # Home screen looping background music
    │           ├── homeMusicNotes.ts   # Musical note sequences for home screen
    │           └── tts.ts              # Web Speech API: announce, cancelAnnouncements, setSpeechRate, isSpeechPending
    ├── shared/                     # Genuinely cross-feature utilities (2+ unrelated features)
    │   ├── components/PageLayout/
    │   │   └── styles.ts           # PageContainer, PageHeader, BackBtn — shared page chrome
    │   ├── constants/
    │   │   └── hitTypes.ts         # Hit enum: Single, Double, Triple, Homerun, Walk
    │   ├── hooks/
    │   │   └── useCustomTeams.ts   # useLiveRxQuery wrapper for the customTeams RxDB collection
    │   └── utils/
    │       ├── logger.ts           # Shared colored console logger; exports createLogger(tag) + appLog singleton
    │       ├── mediaQueries.ts     # Breakpoints + mq helpers: mq.mobile, mq.desktop, mq.tablet, mq.notMobile
    │       ├── rng.ts              # Seeded PRNG (mulberry32): initSeed, reinitSeed, random, getSeed, getRngState, restoreRng, restoreSeed, generateFreshSeed
    │       ├── roster.ts           # Roster helpers used by gameplay, customTeams, and careerStats
    │       ├── saves.ts            # currentSeedStr() — returns current seed as base-36 string
    │       └── stats/
    │           └── computeBattingStatsFromLogs.ts  # Batting stat aggregation (used by gameplay + careerStats)
```

Tests are **co-located** next to their source files (e.g. `src/features/gameplay/context/strategy.test.ts`, `src/features/gameplay/hooks/useGameAudio.test.ts`, `src/features/gameplay/components/Ball/Ball.test.tsx`). The only test files that do NOT live next to a source file are the shared helpers in `src/test/`.

---

## Path Aliases

All cross-directory imports use aliases (configured in `tsconfig.json` and `vite.config.ts`):

| Alias | Resolves to | Notes |
|---|---|---|
| `@feat/*` | `src/features/*` | **Preferred** for all feature code |
| `@shared/*` | `src/shared/*` | Genuinely cross-feature utilities |
| `@storage/*` | `src/storage/*` | Shared persistence infra (DB wiring, thin type re-exports) |
| `@test/*` | `src/test/*` | Test helpers |

Same-directory imports remain relative (e.g. `"./styles"`, `"./constants"`).
