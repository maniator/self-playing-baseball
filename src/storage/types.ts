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
  /** Highest event index that has been stored; acts as a progress cursor. */
  progressIdx: number;
  /** Small immutable setup blob used to reconstruct the game deterministically. */
  setup: Record<string, unknown>;
  scoreSnapshot?: Record<string, unknown>;
  inningSnapshot?: Record<string, unknown>;
  /** Full game State + rngState captured on each half-inning, for restore. */
  stateSnapshot?: Record<string, unknown>;
  schemaVersion: number;
}

/** Append-only event document (one per game event). */
export interface EventDoc {
  /** Deterministic primary key: `${saveId}:${idx}` */
  id: string;
  saveId: string;
  /** Monotonic index per save, starting at 0. */
  idx: number;
  /** Deterministic position within the game (eventIndex or inning/half/pitchIndex object). */
  at: number | Record<string, unknown>;
  type: string;
  payload: Record<string, unknown>;
  /** Wall-clock timestamp — metadata only, NOT used for determinism. */
  ts: number;
  schemaVersion: number;
}

/** Input shape for creating a new save. */
export interface GameSetup {
  matchupMode: string;
  homeTeamId: string;
  awayTeamId: string;
  seed: string;
  setup: Record<string, unknown>;
}

/** A single game event to be appended. */
export interface GameEvent {
  type: string;
  at: number | Record<string, unknown>;
  payload: Record<string, unknown>;
}

/** Optional progress-update summary fields. */
export interface ProgressSummary {
  scoreSnapshot?: Record<string, unknown>;
  inningSnapshot?: Record<string, unknown>;
  /** Full game State + rngState for deterministic restore. */
  stateSnapshot?: Record<string, unknown>;
}

/** Portable export format: save header + full event log, signed for integrity. */
export interface RxdbExportedSave {
  version: 1;
  header: SaveDoc;
  events: EventDoc[];
  /** FNV-1a 32-bit signature of RXDB_EXPORT_KEY + JSON.stringify({header, events}) */
  sig: string;
}
