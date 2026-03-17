import { Hit } from "@shared/constants/hitTypes";

export type PlayLogEntry = {
  inning: number;
  half: 0 | 1; // 0 = top (away bats), 1 = bottom (home bats)
  batterNum: number; // 1–9 (batting-order slot; kept for backward compat with older saves)
  /** Player ID of the batter. Present for all events since player tracking was added; absent in older saves. */
  playerId?: string;
  /** Display name of the batter at the time of the hit. Absent in older saves; UI falls back to #N slot. */
  batterName?: string;
  team: 0 | 1;
  event: Hit; // hit type (includes Walk)
  runs: number; // runs scored on this play
  /**
   * RBI credited to the batter on this play.
   * Equals runsScored for hits (single/double/triple/homerun) and walks
   * (including bases-loaded walks). Sac bunts and fielder's choice plays
   * are not credited with RBI in this simulator (simplified rule — those
   * plays resolve through outLog, not playLog).
   * Field is optional for backward compatibility with older saved data:
   * `restore_game` backfills missing `rbi` from `runs` when a save is
   * loaded, and stat aggregation then uses `entry.rbi ?? 0` so that only
   * entries that still lack an explicit value default to 0.
   */
  rbi?: number;
};

export type StrikeoutEntry = {
  team: 0 | 1;
  batterNum: number; // 1–9 (batting-order slot; kept for backward compat with older saves)
  /** Player ID of the batter. Present for all events since player tracking was added; absent in older saves. */
  playerId?: string;
  /**
   * Set to `true` when this out was a sacrifice fly (runner on 3rd tagged up after the catch and scored).
   * Sac flies count as a plate appearance but NOT as an at-bat, and the batter earns RBI.
   * Omitted (undefined / falsy) for all other out types.
   */
  isSacFly?: boolean;
  /**
   * RBI credited on this play. Only set when `isSacFly` is true (run scored on the fly out).
   * Omitted for all other out types. Optional for backward compatibility.
   */
  rbi?: number;
};

/**
 * One entry per pitcher-appearance in the current game.
 * Tracked incrementally in state and used to compute PitcherGameStatRecord rows at FINAL.
 *
 * `teamIdx` is the PITCHING team (fielding), not the batting team.
 * The corresponding fielding team is: `1 - state.atBat` when the entry is updated.
 */
export type PitcherLogEntry = {
  /** Team index for the PITCHING team (0 = away pitching, 1 = home pitching). */
  teamIdx: 0 | 1;
  /** Roster player ID of this pitcher. */
  pitcherId: string;
  /** Inning when this pitcher entered. */
  inningEntered: number;
  /** Half-inning when this pitcher entered (0=top/away batting, 1=bottom/home batting). */
  halfEntered: 0 | 1;
  /** Score [away, home] when this pitcher entered — used to compute SV/HLD/BS. */
  scoreOnEntry: [number, number];
  outsPitched: number;
  battersFaced: number;
  /** Total pitches thrown in this appearance (balls put in play, strikes, balls, fouls). */
  pitchesThrown: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsRecorded: number;
  runsAllowed: number;
  homersAllowed: number;
};
