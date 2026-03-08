// Central re-export hub — feature-owned types live in their feature's storage/types.ts.
// All public @storage/types imports remain valid through these re-exports.

export type {
  BattingLeader,
  ExportedGameHistory,
  GameDoc,
  ImportGameHistoryResult,
  PitcherGameStatDoc,
  PitchingLeader,
  PlayerGameStatDoc,
  TeamCareerSummary,
} from "@feat/careerStats/storage/types";
export type {
  CreateCustomTeamInput,
  CustomTeamDoc,
  CustomTeamMetadata,
  ExportedCustomPlayer,
  ExportedCustomTeams,
  PlayerDoc,
  TeamPlayer,
  TeamPlayerBatting,
  TeamPlayerPitching,
  TeamRoster,
  UpdateCustomTeamInput,
} from "@feat/customTeams/storage/types";
export type {
  EventDoc,
  GameEvent,
  GameSaveSetup,
  GameSetup,
  InningSnapshot,
  ProgressSummary,
  RxdbExportedSave,
  SaveDoc,
  ScoreSnapshot,
  StateSnapshot,
} from "@feat/saves/storage/types";

// Cross-feature / app-shell types (genuinely shared)
import type { SaveDoc } from "@feat/saves/storage/types";

import type { TeamCustomPlayerOverrides } from "@context/index";

export type PlayerOverrides = {
  away: TeamCustomPlayerOverrides;
  home: TeamCustomPlayerOverrides;
  awayOrder: string[];
  homeOrder: string[];
  awayBench?: string[];
  homeBench?: string[];
  awayPitchers?: string[];
  homePitchers?: string[];
  /**
   * Starting pitcher index into awayPitchers/homePitchers for each team.
   * null = use index 0 (default). Only meaningful for managed custom-team games.
   */
  startingPitcherIdx?: [number | null, number | null];
};

// --- App Shell / Route types ---

/** Shape for a game setup originating from the /exhibition/new page. */
export type ExhibitionGameSetup = {
  homeTeam: string;
  awayTeam: string;
  /** Human-readable display name for the home team. */
  homeTeamLabel: string;
  /** Human-readable display name for the away team. */
  awayTeamLabel: string;
  managedTeam: 0 | 1 | null;
  playerOverrides: PlayerOverrides;
};

/** Context shape provided by AppShell through the React Router Outlet. */
export type AppShellOutletContext = {
  onStartGame: (setup: ExhibitionGameSetup) => void;
  /** Called from the saves page when the user picks a save to load. */
  onLoadSave: (slot: SaveDoc) => void;
  /** Called by GamePage when a game session starts, to update hasActiveSession. */
  onGameSessionStarted: () => void;
  // Navigation callbacks consumed by route-level page components
  onNewGame: () => void;
  onLoadSaves: () => void;
  onManageTeams: () => void;
  onResumeCurrent: () => void;
  onHelp: () => void;
  onCareerStats: () => void;
  onBackToHome: () => void;
  hasActiveSession: boolean;
};

/** Shape of the React Router location state used when navigating to /game. */
export type GameLocationState = {
  pendingGameSetup: ExhibitionGameSetup | null;
  pendingLoadSave: SaveDoc | null;
} | null;
