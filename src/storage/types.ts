import type { State, Strategy } from "@context/index";

/** Persisted save-header document (one per save game). */
export interface SaveDoc {
  id: string;
  name: string;
  seed: string;
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

/** Persisted player document — stores all TeamPlayer fields plus team foreign key and roster metadata.
 * The `sig` field from `TeamPlayer` is intentionally omitted: it is only used in export bundles
 * and is stripped before any DB storage.
 */
export interface PlayerDoc extends Omit<TeamPlayer, "sig"> {
  /** Foreign key: the `id` of the parent `CustomTeamDoc`. Null when the player is a free agent (not assigned to any team). */
  teamId?: string | null;
  /** Which roster section this player belongs to. */
  section: "lineup" | "bench" | "pitchers";
  /** Zero-based position within the section — used for ordering when assembling the roster. */
  orderIndex: number;
  schemaVersion: number;
  /**
   * Original player ID (`TeamPlayer.id`). Stored so the composite primary key
   * (`${teamId}:${playerId}`) can be unwound back to the original player identity
   * when assembling a `TeamRoster` from `PlayerDoc`s.
   * Absent on documents created before schema v2 — `id` is used as the fallback.
   */
  playerId?: string;
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
   * Random seed generated once at player creation. Stored permanently so the
   * fingerprint can be re-verified. Travels in export bundles so re-imported
   * players retain their identity. Absent on documents created before schema v3
   * (backfilled by the v2→v3 migration).
   */
  playerSeed?: string;
  /**
   * Persistent FNV-1a content fingerprint stored in the DB.
   * Covers the player's immutable identity fields: `name`, `role`, `batting`, and `pitching`.
   * Used for global duplicate detection across all teams in the local install.
   * Computed by `buildPlayerSig` in `customTeamExportImport.ts` and stored by
   * `sanitizePlayer` in `customTeamStore.ts`. Absent on documents created before
   * schema v2 — backfilled by the v1→v2 migration strategy in `db.ts`.
   */
  fingerprint?: string;
  /**
   * FNV-1a integrity signature covering the player's immutable identity fields:
   * `name`, `role`, `batting`, and `pitching`. Editable fields (`position`,
   * `handedness`, `jerseyNumber`, `pitchingRole`) and local IDs are intentionally
   * excluded so the sig remains valid after position edits, team moves, or ID remapping.
   * Present only in export bundles; stripped before DB storage.
   */
  sig?: string;
  /**
   * Team-independent stable identity for this player.
   * Set once at player creation (`"pl_" + fnv1a(playerSeed)`) and preserved
   * across team moves, imports, and ID remapping.
   * Used as the `playerKey` in `PlayerGameStatDoc` for cross-team career aggregation:
   * if a player moves from Team A to Team B, their career stat rows accumulate under
   * the same `globalPlayerId` regardless of which team they currently belong to.
   * Absent on documents created before schema v3 — backfilled by the v2→v3 migration.
   */
  globalPlayerId?: string;
}

/** Keyed JSON export format for a single player. */
export interface ExportedCustomPlayer {
  type: "customPlayer";
  formatVersion: 1;
  exportedAt: string;
  payload: {
    /** Player data with `sig` field embedded for integrity validation on import. */
    player: TeamPlayer & { sig: string };
  };
  /** FNV-1a 32-bit signature of PLAYER_EXPORT_KEY + JSON.stringify(payload) */
  sig: string;
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
  /**
   * Random seed generated once at team creation. Stored permanently so the
   * fingerprint can be re-verified. Travels in export bundles.
   * Absent on documents created before schema v3 (backfilled by the v2→v3 migration).
   */
  teamSeed?: string;
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

// ── Game History ─────────────────────────────────────────────────────────────

/**
 * Persisted completed-game document (one per finished game).
 *
 * Written exactly once when a game reaches FINAL. Loading an already-FINAL save
 * must never create a new GameDoc.
 */
export interface GameDoc {
  /**
   * Primary key — the `gameInstanceId` stored in `State` for the completed run.
   * Using `gameInstanceId` (not `saveId`) ensures that loading any mid-game
   * save slot from the same run and finishing it does NOT produce a second entry.
   */
  id: string;
  /** Wall-clock timestamp when the game was committed (ms since epoch). */
  playedAt: number;
  /** PRNG seed used for this game. */
  seed: string;
  /** RNG state captured at game-over for replay verification. */
  rngState: number | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  /** Number of innings played (9 normally; more for extras). */
  innings: number;
  /** The save ID (`SaveDoc.id`) that triggered the commit — for debug/traceability only. */
  committedBySaveId?: string;
  schemaVersion: number;
}

/**
 * Batting statistics for a single player in a single completed game.
 *
 * playerKey rules (v1):
 *   - Custom-team players: `globalPlayerId` when available (team-independent, so
 *     career stats follow the player across team moves). Falls back to
 *     `${teamId}:${playerId}` for legacy players that predate the v3 migration.
 *   - Stock / generated-team players: `${teamId}:${playerId}` using the player's
 *     stable roster ID (same ID generated by generateRoster for that team). Stock
 *     players cannot move teams, so team-scoping is permanent and correct.
 *   - Substituted players are recorded under their own playerKey, not the replaced slot.
 *   - Future trade/free-agent work can continue using `globalPlayerId` as-is — old
 *     rows keep their original playerKey so existing history remains intact.
 */
export interface PlayerGameStatDoc {
  /**
   * Primary key — composite: `${gameId}:${teamId}:${playerKey}`.
   * The composite format ensures global uniqueness without a separate UUID.
   */
  id: string;
  /** FK → GameDoc.id */
  gameId: string;
  teamId: string;
  opponentTeamId: string;
  /**
   * Stable cross-game identity string.
   * Custom-team players: `globalPlayerId` (team-independent) when available;
   * falls back to `${teamId}:${playerId}` for pre-v3-migration players.
   * Stock/generated-team players: `${teamId}:${playerId}`.
   */
  playerKey: string;
  /** TeamPlayer.id at the time of the game — for display/debug; may differ from playerKey. */
  playerId: string;
  /** Player name captured at game time — so history is readable even if the name changes later. */
  nameAtGameTime: string;
  role: "batter" | "pitcher";
  batting: {
    atBats: number;
    hits: number;
    walks: number;
    strikeouts: number;
    rbi: number;
    singles: number;
    doubles: number;
    triples: number;
    homers: number;
  };
  /** Wall-clock timestamp when this row was created (ms since epoch). */
  createdAt: number;
  schemaVersion: number;
}

/**
 * Pitching statistics for a single pitcher in a single completed game.
 *
 * playerKey rules match PlayerGameStatDoc — globalPlayerId for custom-team pitchers,
 * `${teamId}:${pitcherId}` for stock/generated-team pitchers.
 *
 * Outs are stored as integers; display IP as `Math.floor(outsPitched/3).Y` where
 * Y = outsPitched % 3.
 *
 * v1 simplification: earnedRuns = runsAllowed (error-tracking not yet implemented).
 */
export interface PitcherGameStatDoc {
  /**
   * Primary key — composite: `${gameId}:${teamId}:${pitcherKey}`.
   * Guarantees global uniqueness and idempotent inserts.
   */
  id: string;
  /** FK → GameDoc.id */
  gameId: string;
  teamId: string;
  opponentTeamId: string;
  /**
   * Stable cross-game identity string (mirrors PlayerGameStatDoc.playerKey rules).
   * Custom-team pitchers: globalPlayerId when available.
   * Stock/generated-team pitchers: `${teamId}:${pitcherId}`.
   */
  pitcherKey: string;
  /** Roster player ID at game time — for display/debug. */
  pitcherId: string;
  /** Pitcher name captured at game time for readable history. */
  nameAtGameTime: string;
  /** Total outs recorded while this pitcher was in the game. Display as X.Y (Y = outsPitched%3). */
  outsPitched: number;
  /** Total batters faced. */
  battersFaced: number;
  /** Hits allowed by this pitcher. */
  hitsAllowed: number;
  /** Walks (and intentional walks) allowed. */
  walksAllowed: number;
  /** Strikeouts recorded (batters K'd). */
  strikeoutsRecorded: number;
  /** Home runs allowed. */
  homersAllowed: number;
  /** Runs allowed (all, not just earned). */
  runsAllowed: number;
  /**
   * Earned runs. v1 approximation: equals runsAllowed.
   * Will be refined when error/earned-run tracking is added.
   */
  earnedRuns: number;
  /** Save recorded (1) or not (0). See SV rules in computePitcherGameStats.ts. */
  saves: number;
  /** Hold recorded (1) or not (0). */
  holds: number;
  /** Blown save recorded (1) or not (0). */
  blownSaves: number;
  /** Wall-clock timestamp when this row was created (ms since epoch). */
  createdAt: number;
  schemaVersion: number;
}

/** Portable signed export format for completed-game history.
 *
 * formatVersion 1 — original format (no pitcherGameStats).
 * formatVersion 2 — adds pitcherGameStats to the payload.
 * The import function accepts both versions; the export function always produces v2.
 */
export interface ExportedGameHistory {
  type: "gameHistory";
  formatVersion: 1 | 2;
  exportedAt: string;
  payload: {
    games: GameDoc[];
    playerGameStats: PlayerGameStatDoc[];
    /** Only present in v2+ bundles; undefined for v1 legacy imports. */
    pitcherGameStats?: PitcherGameStatDoc[];
    /** Team IDs referenced by stats rows — must exist locally for import to succeed. */
    requiredTeamIds: string[];
  };
  /** FNV-1a 32-bit signature of GAME_HISTORY_EXPORT_KEY + JSON.stringify(payload) */
  sig: string;
}

/** Summary returned after importing a game history bundle. */
export interface ImportGameHistoryResult {
  gamesCreated: number;
  gamesSkipped: number;
  statsCreated: number;
  statsSkipped: number;
  pitcherStatsCreated: number;
  pitcherStatsSkipped: number;
}

// ── Team Career Aggregates ────────────────────────────────────────────────────

/** Aggregated team career statistics derived from completed games. */
export interface TeamCareerSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  /** Win percentage (0–1). */
  winPct: number;
  runsScored: number;
  runsAllowed: number;
  /** RS − RA */
  runDiff: number;
  /** Runs scored per game. */
  rsPer9: number;
  /** Runs allowed per game. */
  raPer9: number;
  /** Current streak string (e.g. "W3", "L2", or "-" when no games played). */
  streak: string;
  /** W-L record from the last 10 games played. */
  last10: { wins: number; losses: number };
}

/** A single batting leader entry for a team. */
export interface BattingLeader {
  playerKey: string;
  nameAtGameTime: string;
  /** The stat value (e.g. HR count, batting average, RBI count). */
  value: number;
  gamesPlayed: number;
}

/** A single pitching leader entry for a team. */
export interface PitchingLeader {
  pitcherKey: string;
  nameAtGameTime: string;
  /** The stat value (e.g. ERA, saves, strikeouts). */
  value: number;
  gamesPlayed: number;
}
