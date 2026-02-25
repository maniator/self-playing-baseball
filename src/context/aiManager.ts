/**
 * AI Manager — baseline context-aware decisions for unmanaged teams.
 *
 * Makes coherent, heuristic-based decisions rather than purely random ones.
 * Each decision includes a structured reason for announcer/log output.
 *
 * Design:
 * - Pure functions — testable without mocking side effects.
 * - Deterministic given the same inputs (no random calls inside).
 * - Only handles actions available in the current game state.
 */

import type { State } from "./index";

/** Reason codes for AI manager decisions. */
export type AiDecisionReason =
  | "pitcher_fatigue_high"
  | "pitcher_fatigue_medium"
  | "no_eligible_reliever"
  | "late_game_score_close"
  | "bench_hitter_opportunity"
  | "no_bench_available"
  | "already_substituted";

export interface AiPitchingChangeDecision {
  kind: "pitching_change";
  teamIdx: 0 | 1;
  pitcherIdx: number;
  reason: AiDecisionReason;
  reasonText: string;
}

export interface AiNoneDecision {
  kind: "none";
}

export type AiDecision = AiPitchingChangeDecision | AiNoneDecision;

/** Batters-faced threshold above which the AI considers a pitching change. */
export const AI_FATIGUE_THRESHOLD_HIGH = 18;
export const AI_FATIGUE_THRESHOLD_MEDIUM = 12;

/**
 * Returns true if a pitcher ID is a viable in-game replacement:
 * - Not already the active pitcher
 * - Not substituted out (no-reentry)
 * - Has a reliever-eligible role (RP, SP/RP, or no role set — legacy/stock teams)
 */
export function isPitcherEligibleForChange(
  pitcherId: string,
  pitcherIdx: number,
  activePitcherIdx: number,
  substitutedOut: string[],
  pitcherRole?: string,
): boolean {
  if (pitcherIdx === activePitcherIdx) return false;
  if (substitutedOut.includes(pitcherId)) return false;
  // If no role set (stock/legacy teams), allow any pitcher.
  if (!pitcherRole) return true;
  return pitcherRole === "RP" || pitcherRole === "SP/RP";
}

/**
 * Returns the index of the best available reliever for a given team, or -1 if none.
 * "Best" is determined by a simple heuristic: prefer RP over SP/RP over no-role.
 * For simplicity within Stage 3C, picks the first eligible candidate.
 */
export function findBestReliever(
  rosterPitchers: string[],
  activePitcherIdx: number,
  substitutedOut: string[],
  pitcherRoles: Record<string, string>,
): number {
  // Prefer explicit RP first, then SP/RP, then any eligible.
  const priorities: Array<(role?: string) => boolean> = [
    (r) => r === "RP",
    (r) => r === "SP/RP",
    (r) => r === undefined || r === "",
  ];

  for (const matchesPriority of priorities) {
    const idx = rosterPitchers.findIndex((id, i) => {
      const role = pitcherRoles[id];
      return (
        isPitcherEligibleForChange(id, i, activePitcherIdx, substitutedOut, role) &&
        matchesPriority(role)
      );
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Derives pitcher role mapping from state's playerOverrides.
 * Since pitching role is stored in custom team docs (not playerOverrides),
 * this returns an empty map — callers should pass explicit roles when available.
 */
export function extractPitcherRolesFromState(_state: State): Record<string, string> {
  return {};
}

/**
 * Main AI manager decision function.
 *
 * Evaluates whether the AI-managed pitching team should make a pitching change
 * at the start of a new at-bat (0-0 count, beginning of plate appearance).
 *
 * Returns the decision to take, or `{ kind: "none" }` if no action is warranted.
 */
export function makeAiPitchingDecision(
  state: State,
  pitchingTeamIdx: 0 | 1,
  pitcherRoles: Record<string, string> = {},
): AiDecision {
  const battersFaced = (state.pitcherBattersFaced ?? [0, 0])[pitchingTeamIdx];
  const activePitcherIdx = (state.activePitcherIdx ?? [0, 0])[pitchingTeamIdx];
  const rosterPitchers = (state.rosterPitchers ?? [[], []])[pitchingTeamIdx];
  const substitutedOut = (state.substitutedOut ?? [[], []])[pitchingTeamIdx];

  // Only consider a pitching change if the pitcher is getting tired.
  const isFatigued =
    battersFaced >= AI_FATIGUE_THRESHOLD_HIGH ||
    (battersFaced >= AI_FATIGUE_THRESHOLD_MEDIUM && state.inning >= 6);

  if (!isFatigued) return { kind: "none" };

  // Find the best available reliever.
  const relieverIdx = findBestReliever(
    rosterPitchers,
    activePitcherIdx,
    substitutedOut,
    pitcherRoles,
  );

  if (relieverIdx === -1) {
    return { kind: "none" };
  }

  const reason: AiDecisionReason =
    battersFaced >= AI_FATIGUE_THRESHOLD_HIGH ? "pitcher_fatigue_high" : "pitcher_fatigue_medium";

  const reasonText =
    reason === "pitcher_fatigue_high"
      ? "pitcher fatigue becoming a concern"
      : "looking fresh arm late in the game";

  return {
    kind: "pitching_change",
    teamIdx: pitchingTeamIdx,
    pitcherIdx: relieverIdx,
    reason,
    reasonText,
  };
}
