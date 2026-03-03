import * as React from "react";

import type { PitchingRole } from "@components/SubstitutionPanel";
import { Hit } from "@constants/hitTypes";
import { pitchSwingRateMod, selectPitchType } from "@constants/pitchTypes";
import { makeAiPitchingDecision, makeAiTacticalDecision } from "@context/aiManager";
import { GameAction, LogAction, State, Strategy } from "@context/index";
import { detectDecision } from "@context/reducer";
import getRandomInt from "@utils/getRandomInt";

/**
 * Builds and returns the pitch handler callback.
 * Receives current game state as direct parameters for proper React data flow.
 */
export const usePitchDispatch = ({
  dispatch,
  currentState,
  managerMode,
  strategy,
  managedTeam,
  skipDecision,
  dispatchLog,
  allTeamPitcherRoles,
}: {
  dispatch: (action: GameAction) => void;
  currentState: State;
  managerMode: boolean;
  strategy: Strategy;
  managedTeam: 0 | 1;
  skipDecision: boolean;
  dispatchLog?: (action: LogAction) => void;
  allTeamPitcherRoles?: [Record<string, PitchingRole>, Record<string, PitchingRole>];
}): (() => void) => {
  const handlePitch = React.useCallback(() => {
    if (currentState.gameOver) return;
    if (managerMode && currentState.pendingDecision) return;

    // Defensive shift: offered once per half-inning when the managed team is FIELDING
    if (managerMode && !skipDecision && currentState.atBat !== managedTeam) {
      if (
        !currentState.defensiveShiftOffered &&
        currentState.balls === 0 &&
        currentState.strikes === 0
      ) {
        dispatch({ type: "set_pending_decision", payload: { kind: "defensive_shift" } });
        return;
      }
    }

    if (managerMode && !skipDecision && currentState.atBat === managedTeam) {
      if (currentState.suppressNextDecision) {
        dispatch({ type: "clear_suppress_decision" });
        return;
      } else {
        const decision = detectDecision(currentState as State, strategy, true);
        if (decision) {
          dispatch({ type: "set_pending_decision", payload: decision });
          return;
        }
      }
    }

    // ── AI manager for unmanaged teams ────────────────────────────────────────
    // Determine which teams are NOT managed by the human (or both when no manager mode).
    const isBattingUnmanaged = !managerMode || currentState.atBat !== managedTeam;
    const isFieldingUnmanaged = !managerMode || 1 - currentState.atBat !== managedTeam;

    // Pitching change (fielding team): evaluate at start of each at-bat (0-0 count).
    if (currentState.balls === 0 && currentState.strikes === 0) {
      const pitchingTeamIdx = (1 - currentState.atBat) as 0 | 1;
      if (isFieldingUnmanaged) {
        const roles = allTeamPitcherRoles?.[pitchingTeamIdx] ?? {};
        const aiDecision = makeAiPitchingDecision(currentState as State, pitchingTeamIdx, roles);
        if (aiDecision.kind === "pitching_change") {
          dispatch({
            type: "make_substitution",
            payload: {
              teamIdx: aiDecision.teamIdx,
              kind: "pitcher",
              pitcherIdx: aiDecision.pitcherIdx,
              reason: aiDecision.reasonText,
            },
          });
          // Continue — the pitch is still processed after the substitution.
        }
      }
    }

    // Fielding-team AI: defensive shift (unmanaged fielding team).
    if (
      isFieldingUnmanaged &&
      !currentState.defensiveShiftOffered &&
      currentState.balls === 0 &&
      currentState.strikes === 0
    ) {
      const shiftDecision = makeAiTacticalDecision(currentState as State, {
        kind: "defensive_shift",
      });
      if (shiftDecision.kind === "tactical") {
        dispatch({
          type: shiftDecision.actionType as GameAction["type"],
          payload: shiftDecision.payload,
        });
        // The reducer for the defensive shift action marks the shift as offered so
        // we don't re-offer it every 0-0 count; no need for a pending/skip pair here.
        dispatchLog?.({ type: "log", payload: `The manager: ${shiftDecision.reasonText}.` });
        // Return early to avoid pitching in the same tick as the shift decision.
        return;
      }
    }

    // Batting-team AI: tactical decisions (steal, bunt, count modifiers, pinch-hitter).
    if (isBattingUnmanaged) {
      if (currentState.suppressNextDecision) {
        // Mirror the human-manager path: clear the suppress flag so AI decisions
        // resume for the next batter (e.g. after an intentional walk).
        dispatch({ type: "clear_suppress_decision" });
        // Fall through to normal pitch after clearing the suppress flag.
      } else {
        const battingDecision = detectDecision(currentState as State, "balanced", true);
        if (battingDecision) {
          const aiAction = makeAiTacticalDecision(currentState as State, battingDecision);
          if (aiAction.kind === "tactical") {
            dispatch({
              type: aiAction.actionType as GameAction["type"],
              payload: aiAction.payload,
            });
            // After AI makes a concrete pinch-hit substitution, lock pinchHitterStrategy to
            // prevent the decision from being re-offered during this at-bat.
            // Use "contact" to reflect the AI's late-game tactical intent.
            if (
              battingDecision.kind === "pinch_hitter" &&
              aiAction.actionType === "make_substitution"
            ) {
              dispatch({ type: "set_pinch_hitter_strategy", payload: "contact" });
            }
            dispatchLog?.({
              type: "log",
              payload: `The manager: ${aiAction.reasonText}.`,
            });
            // Decisions that replace the pitch (steal_attempt, bunt_attempt,
            // intentional_walk) should return early so the regular pitch is not
            // also dispatched in the same tick.
            const replacePitch = ["steal_attempt", "bunt_attempt", "intentional_walk"].includes(
              aiAction.actionType,
            );
            if (replacePitch) return;
          } else {
            // AI decided not to act — skip the decision so it is not re-offered
            dispatch({ type: "skip_decision" });
          }
        }
      }
    }
    // ── End AI manager ────────────────────────────────────────────────────────

    // Select pitch type based on current count, then roll main outcome.
    const currentStrikes = currentState.strikes;
    const currentBalls = currentState.balls;
    const pitchType = selectPitchType(currentBalls, currentStrikes, getRandomInt(100));

    const effectiveStrategy = currentState.pinchHitterStrategy ?? strategy;
    const random = getRandomInt(1000);
    const onePitchMod = currentState.onePitchModifier;

    const protectBonus = onePitchMod === "protect" ? 0.7 : 1;
    const contactMod =
      effectiveStrategy === "contact" ? 1.15 : effectiveStrategy === "power" ? 0.9 : 1;
    const baseSwingRate = Math.round((500 - 75 * currentStrikes) * contactMod * protectBonus);
    const swingRate = Math.round(baseSwingRate * pitchSwingRateMod(pitchType));
    const effectiveSwingRate = onePitchMod === "swing" ? 920 : swingRate;

    if (random < effectiveSwingRate) {
      if (getRandomInt(100) < 30) {
        dispatch({ type: "foul", payload: { pitchType } });
      } else {
        dispatch({ type: "strike", payload: { swung: true, pitchType } });
      }
    } else if (random < 920) {
      dispatch({ type: "wait", payload: { strategy: effectiveStrategy, pitchType } });
    } else {
      const strat = effectiveStrategy;
      const hitRoll = getRandomInt(100);
      let base: Hit;
      if (strat === "power") {
        base =
          hitRoll < 20
            ? Hit.Homerun
            : hitRoll < 23
              ? Hit.Triple
              : hitRoll < 43
                ? Hit.Double
                : Hit.Single;
      } else if (strat === "contact") {
        base =
          hitRoll < 8
            ? Hit.Homerun
            : hitRoll < 10
              ? Hit.Triple
              : hitRoll < 28
                ? Hit.Double
                : Hit.Single;
      } else {
        base =
          hitRoll < 13
            ? Hit.Homerun
            : hitRoll < 15
              ? Hit.Triple
              : hitRoll < 35
                ? Hit.Double
                : Hit.Single;
      }
      dispatch({ type: "hit", payload: { hitType: base, strategy: strat } });
    }
  }, [
    dispatch,
    dispatchLog,
    currentState,
    managedTeam,
    managerMode,
    allTeamPitcherRoles,
    skipDecision,
    strategy,
  ]);

  return handlePitch;
};
