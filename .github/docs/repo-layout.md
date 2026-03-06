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
    ├── index.tsx                   # React entry: initSeedFromUrl, registers /sw.js, createRoot
    ├── router.tsx                  # createBrowserRouter + RouterProvider; defines full route tree (/, /exhibition/new, /game, /teams, /teams/:id/edit, /saves, /help)
    ├── sw.ts                       # Service worker: uses self.__WB_MANIFEST (injected by vite-plugin-pwa), caches bundles, handles notificationclick
    ├── constants/
    │   ├── hitTypes.ts             # Hit enum: Single, Double, Triple, Homerun, Walk
    │   └── pitchTypes.ts           # PitchType enum + selectPitchType, pitchName helpers
    ├── utils/                      # Pure utilities (no React)
    │   ├── announce.ts             # Barrel re-export: re-exports everything from tts.ts and audio.ts
    │   ├── audio.ts                # Web Audio API: playDecisionChime, playVictoryFanfare, play7thInningStretch
    │   ├── tts.ts                  # Web Speech API: announce, cancelAnnouncements, setSpeechRate, isSpeechPending
    │   ├── getRandomInt.ts         # Random number helper — delegates to rng.ts random()
    │   ├── logger.ts               # Shared colored console logger; exports createLogger(tag) + appLog singleton
    │   ├── mediaQueries.ts         # Breakpoints + mq helpers: mq.mobile, mq.desktop, mq.tablet, mq.notMobile
    │   ├── rng.ts                  # Seeded PRNG (mulberry32): initSeedFromUrl, random, buildReplayUrl, getSeed, getRngState, restoreRng
    │   └── saves.ts                # currentSeedStr() — returns current seed as base-36 string
    ├── storage/                    # RxDB local-only persistence (IndexedDB, no sync)
    │   ├── db.ts                   # Lazy-singleton BallgameDb; collections: saves, events, customTeams,
    │   │                           #   players, games, playerGameStats, pitcherGameStats;
    │   │                           #   exports getDb(), savesCollection(), eventsCollection(), _createTestDb()
    │   │                           #   customTeams schema: v0→v1 (abbreviation + team fingerprint fields),
    │   │                           #   v1→v2 (player fingerprint backfill migration — strictly additive)
    │   ├── saveStore.ts            # SaveStore singleton + makeSaveStore() factory:
    │   │                           #   createSave, appendEvents (serialized queue + in-memory idx counter),
    │   │                           #   updateProgress (with stateSnapshot), listSaves, deleteSave,
    │   │                           #   exportRxdbSave, importRxdbSave (FNV-1a integrity bundle)
    │   ├── customTeamStore.ts      # CustomTeamStore singleton + makeCustomTeamStore() factory:
    │   │                           #   createCustomTeam (throws on duplicate name), updateCustomTeam,
    │   │                           #   deleteCustomTeam, listCustomTeams, exportPlayer,
    │   │                           #   importCustomTeams (with allowDuplicatePlayers option)
    │   ├── customTeamExportImport.ts  # Pure encode/decode helpers (no DB access):
    │   │                              #   buildTeamFingerprint, buildPlayerSig,
    │   │                              #   exportCustomTeams, exportCustomPlayer,
    │   │                              #   importCustomTeams (parses + validates bundle),
    │   │                              #   parseExportedCustomPlayer (validates sig),
    │   │                              #   TEAMS_EXPORT_KEY, PLAYER_EXPORT_KEY
    │   ├── hash.ts                 # fnv1a(str): string — FNV-1a 32-bit hash, 8 hex chars
    │   ├── generateId.ts           # nanoid-based ID generators: generateTeamId(), generatePlayerId(), generateSaveId(), generateSeed()
    │   ├── saveIO.ts               # formatSaveDate, downloadJson, readFileAsText, saveFilename,
    │   │                           #   teamsFilename, playerFilename, slugify (internal)
    │   ├── saveInspector.ts        # Read-only helpers for inspecting save bundles
    │   └── types.ts                # SaveDoc, EventDoc, GameSaveSetup, ScoreSnapshot,
    │                               #   InningSnapshot, StateSnapshot, GameSetup, GameEvent,
    │                               #   ProgressSummary, RxdbExportedSave,
    │                               #   TeamPlayer (with playerSeed?: string, fingerprint?: string),
    │                               #   TeamPlayerBatting, TeamPlayerPitching,
    │                               #   CustomTeamDoc (with teamSeed?: string, fingerprint?: string),
    │                               #   TeamRoster, CreateCustomTeamInput, UpdateCustomTeamInput,
    │                               #   ExportedCustomTeams, ExportedCustomPlayer
    ├── context/                    # All game state, reducer, and types
    │   ├── index.tsx               # GameContext, useGameContext(), State, ContextValue, GameProviderWrapper
    │   │                           #   Exports: LogAction, GameAction, Strategy, DecisionType, OnePitchModifier
    │   │                           #   GameProviderWrapper accepts optional onDispatch?: (action: GameAction) => void
    │   ├── strategy.ts             # stratMod(strategy, stat) — probability multipliers per strategy
    │   ├── advanceRunners.ts       # advanceRunners(type, baseLayout) — pure base-advancement logic
    │   ├── gameOver.ts             # checkGameOver, checkWalkoff, nextHalfInning
    │   ├── playerOut.ts            # playerOut — handles out count, 3-out half-inning transitions
    │   ├── hitBall.ts              # hitBall — pop-out check, callout log, run scoring
    │   ├── buntAttempt.ts          # buntAttempt — fielder's choice, sacrifice bunt, bunt single, pop-out
    │   ├── playerActions.ts        # playerStrike, playerBall, playerWait, stealAttempt (re-exports buntAttempt)
    │   └── reducer.ts              # Reducer factory; exports detectDecision(), re-exports stratMod
    ├── hooks/                      # All custom React hooks
    │   ├── useGameRefs.ts          # Tracks skipDecision state to prevent re-offering same decision
    │   ├── useGameAudio.ts         # Victory fanfare + 7th-inning stretch audio playback
    │   ├── usePitchDispatch.ts     # Pitch handler — receives currentState object, returns handlePitch callback
    │   ├── useAutoPlayScheduler.ts # Speech-gated setTimeout scheduler; receives inning/atBat as direct values; pauses on manager decisions
    │   ├── usePlayerControls.ts    # All UI event handlers (volume, mute, manager mode, share replay)
    │   ├── useReplayDecisions.ts   # Reads ?decisions= from URL and replays manager choices
    │   ├── useRxdbGameSync.ts      # Drains actionBufferRef → appendEvents on pitchKey advance;
    │   │                           #   calls updateProgress (with full stateSnapshot) on half-inning / game-over
    │   ├── useSaveStore.ts         # useLiveRxQuery wrapper for reactive saves list + stable write callbacks
    │   ├── useSaveSlotActions.ts   # Stable callbacks: handleLoad, handleExport, handleDelete for save slots
    │   ├── useCustomTeams.ts       # useLiveRxQuery wrapper for the customTeams RxDB collection
    │   ├── useImportCustomTeams.ts # Shared import logic: file upload, paste JSON, clipboard paste,
    │   │                           #   in-flight state, errors, duplicate-player confirmation flow
    │   │                           #   Exposes: pendingDuplicateImport, confirmDuplicateImport(), cancelDuplicateImport()
    │   ├── useImportSave.ts        # Save import from file or paste (used by SavesModal + SavesPage)
    │   └── useShareReplay.ts       # Clipboard copy of replay URL
    ├── components/                 # All UI components
    │   ├── AppShell/
    │   │   └── index.tsx           # Pure layout component: renders <Outlet context={outletContext} />; provides AppShellOutletContext
    │   │                           #   AppShellOutletContext: { onStartGame, onLoadSave, onGameSessionStarted, onNewGame, onLoadSaves, onManageTeams, onResumeCurrent, onHelp, onBackToHome, hasActiveSession }
    │   ├── HomeScreen/
    │   │   ├── index.tsx           # Home screen: New Game / Load Saved Game / Manage Teams / Help buttons
    │   │   └── styles.ts           # Styled components for home screen
    │   ├── ManageTeamsScreen/
    │   │   ├── index.tsx           # Route-aware screen: list view at /teams, editor at /teams/:id/edit and /teams/new
    │   │   │                       #   Import/export UI: per-team export button, export-all button, file input for import,
    │   │   │                       #   success/error banners, duplicate-player confirmation banner
    │   │   ├── TeamListItem.tsx    # Single team row (edit/delete/export buttons)
    │   │   └── styles.ts           # Styled components for manage teams screen
    │   ├── Announcements/index.tsx # Play-by-play log with heading + empty-state placeholder
    │   ├── Ball/
    │   │   ├── constants.ts        # hitDistances: pixel travel distance per Hit type
    │   │   └── index.tsx           # Ball animation component; key={pitchKey} restarts CSS animation
    │   ├── DecisionPanel/
    │   │   ├── constants.ts        # DECISION_TIMEOUT_SEC (10), NOTIF_TAG ("manager-decision")
    │   │   ├── DecisionButtonStyles.ts  # Styled-component button variants for decision actions
    │   │   ├── DecisionButtons.tsx # Decision action button groups per decision kind
    │   │   ├── notificationHelpers.ts   # showManagerNotification, closeManagerNotification
    │   │   ├── styles.ts           # Styled components for DecisionPanel layout
    │   │   └── index.tsx           # Manager decision UI: prompt, buttons, 10s countdown bar
    │   ├── Diamond/
    │   │   ├── index.tsx           # Baseball diamond — self-contained with FieldWrapper container
    │   │   └── styles.ts           # Styled components for diamond layout
    │   ├── Game/
    │   │   ├── index.tsx           # Owns actionBufferRef; wraps tree with RxDatabaseProvider + GameProviderWrapper
    │   │   ├── ErrorBoundary.tsx   # React error boundary — catches render errors, clears stale localStorage keys
    │   │   ├── GameInner.tsx       # Top-level layout: NewGameDialog, LineScore, GameControls, two-column body
    │   │   │                       #   Calls useSaveStore().createSave() on handleStart; hosts useRxdbGameSync
    │   │   └── styles.ts           # Styled components for game layout
    │   ├── GameControls/
    │   │   ├── index.tsx           # GameControls component — renders controls using useGameControls hook
    │   │   ├── constants.ts        # SPEED_SLOW (1200ms), SPEED_NORMAL (700ms), SPEED_FAST (350ms)
    │   │   ├── styles.ts           # Styled components for controls layout
    │   │   ├── useGameControls.ts  # Hook: wires all game-controls hooks + localStorage state into a single value
    │   │   ├── ManagerModeControls.tsx  # Manager Mode checkbox, team/strategy selectors, notif badge
    │   │   ├── ManagerModeStyles.ts     # Styled components for manager mode controls
    │   │   └── VolumeControls.tsx  # Announcement + alert volume sliders with mute toggles
    │   ├── HitLog/index.tsx        # Hit log component
    │   ├── InstructionsModal/
    │   │   ├── index.tsx           # Full-screen scrollable <dialog>; 7 collapsible <details> sections; ✕ close button
    │   │   └── styles.ts           # Styled components for modal
    │   ├── LineScore/
    │   │   ├── index.tsx           # Score/inning/strikes/balls/outs + FINAL banner when gameOver
    │   │   └── styles.ts           # Styled components for line score
    │   ├── NewGameDialog/
    │   │   ├── constants.ts        # DEFAULT_HOME_TEAM ("Yankees"), DEFAULT_AWAY_TEAM ("Mets")
    │   │   ├── index.tsx           # Modal dialog for starting a new game: team name inputs + managed-team radio selection
    │   │   └── styles.ts           # Styled components for the new game dialog
    │   ├── PlayerStatsPanel/index.tsx  # Live batting stats table
    │   ├── CustomTeamEditor/
    │   │   ├── index.tsx           # Full team editor: all sections use drag-and-drop (SortablePlayerRow)
    │   │   │                       #   Lineup + bench share one DndContext → cross-section drag transfers players
    │   │   │                       #   Pitchers have their own DndContext (isolated — no cross-section)
    │   │   │                       #   Per-player ↓ Export button; ↑ Import Player/Pitcher button per section
    │   │   │                       #   Inline duplicate-player confirmation banner (PlayerDuplicateBanner)
    │   │   ├── SortablePlayerRow.tsx   # Drag-and-drop player row using useSortable — used by all sections
    │   │   ├── PlayerRow.tsx           # Legacy up/down row component (preserved but no longer used in index.tsx)
    │   │   ├── PlayerStatFields.tsx    # Shared stat sliders (contact/power/speed + pitcher stats)
    │   │   ├── editorState.ts      # EditorState, EditorAction, editorReducer, validateEditorState
    │   │   │                       #   Actions: SET_FIELD, UPDATE_PLAYER, ADD_PLAYER, REMOVE_PLAYER,
    │   │   │                       #   REORDER, TRANSFER_PLAYER (cross-section lineup↔bench), MOVE_UP,
    │   │   │                       #   MOVE_DOWN, APPLY_DRAFT, SET_ERROR
    │   │   │                       #   TRANSFER_PLAYER: { fromSection, toSection, playerId, toIndex }
    │   │   │                       #   Exported: editorPlayerToTeamPlayer (for player export flow)
    │   │   ├── playerConstants.ts  # DEFAULT_LINEUP_POSITIONS, REQUIRED_FIELD_POSITIONS,
    │   │   │                       #   BATTER_POSITION_OPTIONS, PITCHER_POSITION_OPTIONS, HANDEDNESS_OPTIONS
    │   │   ├── statBudget.ts       # HITTER_STAT_CAP (150), PITCHER_STAT_CAP (160),
    │   │   │                       #   hitterStatTotal, pitcherStatTotal, hitterRemaining, pitcherRemaining
    │   │   └── styles.ts           # Styled components; includes ImportPlayerBtn, PlayerDuplicateBanner,
    │   │                           #   PlayerDuplicateActions for the import-player flow
    │   └── SavesModal/
    │       ├── index.tsx           # Save management overlay: list, create, load, delete, export, import
    │       ├── styles.ts           # Styled components for saves modal
    │       └── useSavesModal.ts    # Hook: calls useSaveStore for all save CRUD operations
    ├── features/
    │   └── customTeams/
    │       ├── adapters/
    │       │   └── customTeamAdapter.ts  # customTeamToDisplayName, customTeamToGameId,
    │       │                             #   customTeamToPlayerOverrides, customTeamToLineupOrder,
    │       │                             #   customTeamToPitcherRoster, customTeamToBenchRoster,
    │       │                             #   resolveTeamLabel (resolves `custom:<id>` or raw team name)
    │       └── generation/
    │           └── generateDefaultTeam.ts  # generateDefaultCustomTeamDraft(seed) — deterministic random team
    └── pages/
        ├── ExhibitionSetupPage/
        │   ├── index.tsx           # Full-page Exhibition Setup — primary New Game entry point (/exhibition/new)
        │   │                       #   Defaults to Custom Teams tab; uses useExhibitionSetup hook
        │   │                       #   No IIFEs in JSX: computed variables derive managedSpPitchers/managedStarterIdx before return
        │   │                       #   Starter pitcher selector extracted to StarterPitcherSelector.tsx
        │   ├── StarterPitcherSelector.tsx  # Dropdown for managed-team starting pitcher — independently testable
        │   ├── styles.ts           # Styled components for the exhibition setup page
        │   └── useExhibitionSetup.ts  # Hook: orchestrates team selection, custom team logic, starter pitcher, form submit
        ├── HelpPage/
        │   ├── index.tsx           # Standalone How to Play page at /help; browser back returns to previous page
        │   └── styles.ts           # Styled components for help page
        └── SavesPage/
            ├── index.tsx           # Exhibition Saves page at /saves; loads from SaveStore directly (no RxDatabaseProvider needed)
            │                       #   Load action navigates to /game via React Router location.state (GameLocationState)
            └── styles.ts           # Styled components for saves page
```

Tests are **co-located** next to their source files (e.g. `src/context/strategy.test.ts`, `src/hooks/useGameAudio.test.ts`, `src/components/Ball/Ball.test.tsx`). The only test files that do NOT live next to a source file are the shared helpers in `src/test/`.

---

## Path Aliases

All cross-directory imports use aliases (configured in `tsconfig.json` and `vite.config.ts`):

| Alias | Resolves to |
|---|---|
| `@components/*` | `src/components/*` |
| `@context/*` | `src/context/*` |
| `@hooks/*` | `src/hooks/*` |
| `@utils/*` | `src/utils/*` |
| `@constants/*` | `src/constants/*` |
| `@storage/*` | `src/storage/*` |
| `@test/*` | `src/test/*` |

Same-directory imports remain relative (e.g. `"./styles"`, `"./constants"`).
