/** AI decision types and shared reason codes for the AI manager. */

/** Reason codes for AI manager decisions. */
export type AiDecisionReason =
  | "pitcher_fatigue_high"
  | "pitcher_fatigue_medium"
  | "no_eligible_reliever"
  | "late_game_score_close"
  | "bench_hitter_opportunity"
  | "no_bench_available"
  | "already_substituted"
  | "steal_high_success"
  | "bunt_sacrifice_opportunity"
  | "protect_plate"
  | "work_count"
  | "intentional_walk"
  | "pinch_hitter_late_game"
  | "defensive_shift_power";

export interface AiPitchingChangeDecision {
  kind: "pitching_change";
  teamIdx: 0 | 1;
  pitcherIdx: number;
  reason: AiDecisionReason;
  reasonText: string;
}

/** AI auto-apply a tactical game decision (steal, bunt, count modifier, IBB, etc). */
export interface AiTacticalDecision {
  kind: "tactical";
  /** The action type to dispatch (maps to GameAction types). */
  actionType: string;
  /** Action payload. */
  payload: unknown;
  reasonText: string;
}

export interface AiNoneDecision {
  kind: "none";
}

export type AiDecision = AiPitchingChangeDecision | AiTacticalDecision | AiNoneDecision;
