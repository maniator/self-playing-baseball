import type { State, Strategy, TeamCustomPlayerOverrides } from "@context/index";

/** Persisted save-header document (one per save game). */
export interface SaveDoc {
  id: string;
  name: string;
  seed: string;
  matchupMode: string;
  homeTeamId: string;
  awayTeamId: string;
  createdAt: number;
  updatedAt: number;
  /** Highest pitchKey (EventDoc.at) that has been stored; acts as a progress cursor. */
  progressIdx: number;
  /** Small immutable setup blob used to reconstruct the game deterministically. */
  setup: GameSaveSetup;
  scoreSnapshot?: ScoreSnapshot;
  inningSnapshot?: InningSnapshot;
  /** Full game State + rngState captured on each half-inning, for restore. */
  stateSnapshot?: StateSnapshot;
  schemaVersion: number;
}

/** Append-only event document (one per game event). */
export interface EventDoc {
  /** Deterministic primary key: `${saveId}:${idx}` */
  id: string;
  saveId: string;
  /** Monotonic index per save, starting at 0. */
  idx: number;
  /** Deterministic position within the game — the pitchKey at the time the event occurred. */
  at: number;
  type: string;
  payload: Record<string, unknown>;
  /** Wall-clock timestamp — metadata only, NOT used for determinism. */
  ts: number;
  schemaVersion: number;
}

/** Typed setup stored on the save header for deterministic game restore. */
export interface GameSaveSetup {
  strategy: Strategy;
  /** null when the user chose "just watch" (no managed team). */
  managedTeam: 0 | 1 | null;
  managerMode: boolean;
  homeTeam: string;
  awayTeam: string;
  /** [away, home] per-player stat overrides for this session. */
  playerOverrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides];
  /** [away, home] batter IDs in batting order. */
  lineupOrder: [string[], string[]];
}

/** Scored snapshot stored on the save header for quick display. */
export interface ScoreSnapshot {
  away: number;
  home: number;
}

/** Inning position snapshot stored on the save header. */
export interface InningSnapshot {
  inning: number;
  atBat: number;
}

/** Full game state snapshot — enough to resume without replaying all events. */
export interface StateSnapshot {
  state: State;
  rngState: number | null;
}

/** Input shape for creating a new save. */
export interface GameSetup {
  matchupMode: string;
  homeTeamId: string;
  awayTeamId: string;
  seed: string;
  setup: GameSaveSetup;
}

/** A single game event to be appended. */
export interface GameEvent {
  type: string;
  at: number;
  payload: Record<string, unknown>;
}

/** Optional progress-update summary fields. */
export interface ProgressSummary {
  scoreSnapshot?: ScoreSnapshot;
  inningSnapshot?: InningSnapshot;
  /** Full game State + rngState for deterministic restore. */
  stateSnapshot?: StateSnapshot;
}

/** Batting statistics for a custom team player. */
export interface TeamPlayerBatting {
  contact: number;
  power: number;
  speed: number;
}

/** Optional pitching statistics for a custom team player. */
export interface TeamPlayerPitching {
  velocity?: number;
  control?: number;
  movement?: number;
}

/** A single player on a custom team roster. */
export interface TeamPlayer {
  /** Stable ID within the team. */
  id: string;
  name: string;
  role: "batter" | "pitcher" | "two-way";
  batting: TeamPlayerBatting;
  pitching?: TeamPlayerPitching;
  position?: string;
  handedness?: "R" | "L" | "S";
  isBenchEligible?: boolean;
  isPitcherEligible?: boolean;
  jerseyNumber?: number | null;
  /**
   * Pitcher role eligibility: SP = starter only, RP = reliever only, SP/RP = both (swingman).
   * Only meaningful for pitchers (role === "pitcher" or "two-way").
   * Absent on older saves — backfill as "SP" for index 0, "RP" for others when needed.
   */
  pitchingRole?: "SP" | "RP" | "SP/RP";
  /**
   * FNV-1a integrity signature covering the player's immutable identity fields:
   * `name`, `role`, `batting`, and `pitching`. Editable fields (`position`,
   * `handedness`, `jerseyNumber`, `pitchingRole`) and local IDs are intentionally
   * excluded so the sig remains valid after position edits, team moves, or ID remapping.
   * Present only in export bundles; stripped before DB storage.
   */
  sig?: string;
}

/** Roster embedded in a custom team document. */
export interface TeamRoster {
  schemaVersion: number;
  lineup: TeamPlayer[];
  bench: TeamPlayer[];
  pitchers: TeamPlayer[];
}

/** Freeform metadata on a custom team document. */
export interface CustomTeamMetadata {
  notes?: string;
  tags?: string[];
  archived?: boolean;
}

/** Persisted custom team document (one per user-created team). */
export interface CustomTeamDoc {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  /** 2–3 char compact label for line score / scoreboard contexts. */
  abbreviation?: string;
  nickname?: string;
  city?: string;
  slug?: string;
  /** "custom" = user-created; "generated" = future auto-generated use. */
  source: "custom" | "generated";
  roster: TeamRoster;
  metadata: CustomTeamMetadata;
  /** Optional future hint for stat generation (e.g. "balanced", "power"). */
  statsProfile?: string;
  /** FNV-1a fingerprint of name+abbreviation (case-insensitive) — used for duplicate detection on import. Roster changes do not affect the fingerprint so re-importing the same team after roster edits still deduplicates correctly. */
  fingerprint?: string;
}

/** Input shape for creating a new custom team. */
export interface CreateCustomTeamInput {
  name: string;
  /** 2–3 char compact label for compact UI contexts. */
  abbreviation?: string;
  nickname?: string;
  city?: string;
  slug?: string;
  source?: "custom" | "generated";
  roster: {
    lineup: TeamPlayer[];
    bench?: TeamPlayer[];
    pitchers?: TeamPlayer[];
  };
  metadata?: {
    notes?: string;
    tags?: string[];
    archived?: boolean;
  };
  statsProfile?: string;
}

/** Input shape for updating an existing custom team (all fields optional). */
export interface UpdateCustomTeamInput {
  name?: string;
  /** 2–3 char compact label for compact UI contexts. */
  abbreviation?: string;
  nickname?: string;
  city?: string;
  slug?: string;
  roster?: {
    lineup?: TeamPlayer[];
    bench?: TeamPlayer[];
    pitchers?: TeamPlayer[];
  };
  metadata?: Partial<CustomTeamMetadata>;
  statsProfile?: string;
}

/** Cached MLB team document (one per team, keyed by `String(mlbNumericId)`). */
export interface TeamDoc {
  /** String PK: `String(mlbNumericId)` e.g. `"147"` for the Yankees. */
  id: string;
  /** The original MLB Stats API numeric team ID. */
  numericId: number;
  name: string;
  abbreviation: string;
  league: "al" | "nl";
  /** Epoch ms when this record was last refreshed from the API. */
  cachedAt: number;
  schemaVersion: number;
}

/** Portable export format: save header + full event log, signed for integrity. */
export interface RxdbExportedSave {
  version: 1;
  header: SaveDoc;
  events: EventDoc[];
  /** FNV-1a 32-bit signature of RXDB_EXPORT_KEY + JSON.stringify({header, events}) */
  sig: string;
}

/** Keyed JSON export format for custom teams. */
export interface ExportedCustomTeams {
  type: "customTeams";
  formatVersion: 1;
  exportedAt: string;
  appVersion?: string;
  payload: {
    teams: CustomTeamDoc[];
  };
  /** FNV-1a 32-bit signature of TEAMS_EXPORT_KEY + JSON.stringify(payload) */
  sig: string;
}
