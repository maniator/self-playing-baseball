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

import type { DecisionType, State, Strategy } from "./index";
import { computeFatigueFactor } from "./pitchSimulation";

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

/** Batters-faced reference thresholds used to derive fatigue-factor limits below. */
export const AI_FATIGUE_THRESHOLD_HIGH = 18;
export const AI_FATIGUE_THRESHOLD_MEDIUM = 12;

/**
 * Fatigue-factor limits for AI pitching-change decisions.
 * Derived from the reference thresholds at default stamina (staminaMod = 0) so
 * that default-stamina behavior stays identical while high/low stamina pitchers
 * are pulled later/earlier respectively.
 *
 * computeFatigueFactor(18, 0) ≈ 1.225  →  AI_FATIGUE_FACTOR_HIGH
 * computeFatigueFactor(12, 0) ≈ 1.075  →  AI_FATIGUE_FACTOR_MEDIUM
 */
export const AI_FATIGUE_FACTOR_HIGH = 1.225;
export const AI_FATIGUE_FACTOR_MEDIUM = 1.075;

/** Steal success % above which the AI sends the runner. */
const AI_STEAL_THRESHOLD = 0.62;

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
 * Picks the first eligible candidate using priority order: RP > SP/RP > no-role.
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

  // Use stamina-aware fatigue factor so high-stamina pitchers stay in longer
  // and low-stamina relievers get pulled sooner.
  const activePitcherId = rosterPitchers[activePitcherIdx];
  const staminaMod = activePitcherId
    ? (state.resolvedMods?.[pitchingTeamIdx]?.[activePitcherId]?.staminaMod ?? 0)
    : 0;
  const fatigueFactor = computeFatigueFactor(battersFaced, staminaMod);

  const isHighFatigue = fatigueFactor >= AI_FATIGUE_FACTOR_HIGH;
  // Medium fatigue pull requires inning >= 6 AND a game-context trigger:
  // - close game (≤1 run diff): pitcher is on a shorter leash
  // - late game (inning >= 7): willing to pull even in a 2-run game
  // - runners on base: higher leverage situation
  const runDiff = Math.abs(state.score[0] - state.score[1]);
  const isTightGame = runDiff <= 1;
  const hasRunnersOn = state.baseLayout.some((b) => b === 1);
  const isMediumFatigue =
    fatigueFactor >= AI_FATIGUE_FACTOR_MEDIUM &&
    state.inning >= 6 &&
    (isTightGame || state.inning >= 7 || hasRunnersOn);

  if (!isHighFatigue && !isMediumFatigue) return { kind: "none" };

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

  const reason: AiDecisionReason = isHighFatigue
    ? "pitcher_fatigue_high"
    : "pitcher_fatigue_medium";

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

/**
 * AI tactical decision for the unmanaged batting/fielding team.
 *
 * Given a detected DecisionType (from `detectDecision`), returns what the AI
 * manager would do with it — either acting (AiTacticalDecision) or passing
 * (AiNoneDecision, meaning let the normal pitch proceed).
 *
 * Heuristics used (all deterministic, state-based):
 * - steal: send runner when successPct > AI_STEAL_THRESHOLD
 * - bunt: sacrifice when trailing by 1-2 runs in inning 7+ with 0 outs
 * - count30: take the pitch (work the count)
 * - count02: protect the plate (make contact)
 * - ibb / ibb_or_steal: issue the intentional walk
 * - pinch_hitter: use "contact" strategy in late game
 * - defensive_shift: enable when offered (shift against power hitters)
 */
export function makeAiTacticalDecision(state: State, decision: DecisionType): AiDecision {
  const { score, inning, outs, atBat } = state;
  const scoreDiff = score[0] - score[1]; // positive = away leading

  switch (decision.kind) {
    case "steal": {
      if (decision.successPct >= AI_STEAL_THRESHOLD) {
        return {
          kind: "tactical",
          actionType: "steal_attempt",
          payload: { base: decision.base, successPct: decision.successPct },
          reasonText: "high-percentage steal opportunity",
        };
      }
      return { kind: "none" };
    }

    case "bunt": {
      // Sacrifice bunt when trailing by 1 in innings 7+, 0 outs, runner on first
      const isBehind = atBat === 0 ? scoreDiff < 0 : scoreDiff > 0;
      const isLateCloseGame = inning >= 7 && Math.abs(scoreDiff) <= 1 && outs === 0 && isBehind;
      if (isLateCloseGame) {
        return {
          kind: "tactical",
          actionType: "bunt_attempt",
          payload: {},
          reasonText: "sacrifice bunt in close late game",
        };
      }
      return { kind: "none" };
    }

    case "count30": {
      // Always take a 3-0 pitch (work the count, draw a walk)
      return {
        kind: "tactical",
        actionType: "set_one_pitch_modifier",
        payload: "take",
        reasonText: "taking the pitch with a 3-0 count",
      };
    }

    case "count02": {
      // Protect the plate — swing at anything to avoid a strikeout
      return {
        kind: "tactical",
        actionType: "set_one_pitch_modifier",
        payload: "protect",
        reasonText: "protecting the plate with two strikes",
      };
    }

    case "ibb":
    case "ibb_or_steal": {
      // Always issue the intentional walk when the game situation calls for it
      return {
        kind: "tactical",
        actionType: "intentional_walk",
        payload: {},
        reasonText: "intentional walk — set up the double play",
      };
    }

    case "pinch_hitter": {
      const { candidates, teamIdx, lineupIdx } = decision;
      if (candidates.length > 0) {
        // Pick the candidate with the best contact mod for late-game situational hitting.
        // Falls back to first candidate when all mods are equal.
        const bestCandidate = candidates.reduce((best, c) =>
          c.contactMod > best.contactMod ? c : best,
        );
        const reason =
          bestCandidate.contactMod > 0
            ? "pinch hitter — strong contact bat"
            : "pinch hitter — best available";
        return {
          kind: "tactical",
          actionType: "make_substitution",
          payload: {
            teamIdx,
            kind: "batter",
            lineupIdx,
            benchPlayerId: bestCandidate.id,
            reason,
          },
          reasonText: `${bestCandidate.name} in as pinch hitter`,
        };
      }
      // No bench available — fall back to strategy override
      return {
        kind: "tactical",
        actionType: "set_pinch_hitter_strategy",
        payload: "contact",
        reasonText: "pinch hitter in, looking for contact late in the game",
      };
    }

    case "defensive_shift": {
      // Enable shift — AI always uses the shift when offered
      return {
        kind: "tactical",
        actionType: "set_defensive_shift",
        payload: true,
        reasonText: "defensive shift deployed",
      };
    }

    default:
      return { kind: "none" };
  }
}

/**
 * AI manager strategy selection — mirrors the choices a human manager can make.
 *
 * Picks a batting strategy based on game context so the unmanaged team responds
 * intelligently instead of always using "balanced".
 *
 * Rules (evaluated in priority order):
 *  - Down 2+ late game (inning ≥ 7) → "power"   (swing for extra bases)
 *  - Down 1  late game (inning ≥ 7) → "aggressive" (pressure the bases)
 *  - Ahead 3+ runs → "patient"                   (work the count, protect lead)
 *  - 2 outs, close game (±2), inning ≥ 7 → "aggressive" (extend the inning)
 *  - Early game with runners in scoring position → "contact" (put ball in play)
 *  - Default → "balanced"
 */
export function makeAiStrategyDecision(state: State, battingTeamIdx: 0 | 1): Strategy {
  const { score, inning, outs } = state;
  const battingScore = score[battingTeamIdx];
  const fieldingScore = score[1 - battingTeamIdx];
  const runDiff = battingScore - fieldingScore; // positive = batting team leading

  if (inning >= 7) {
    if (runDiff <= -2) return "power";
    if (runDiff === -1) return "aggressive";
  }

  if (runDiff >= 3) return "balanced";

  if (outs === 2 && inning >= 7 && Math.abs(runDiff) <= 2) return "aggressive";

  // Runners in scoring position (no other condition matched) → contact hitting (put it in play)
  const { baseLayout } = state;
  if (baseLayout[1] || baseLayout[2]) return "contact";

  return "balanced";
}
