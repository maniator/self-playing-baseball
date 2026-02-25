import * as React from "react";

import type { PitchingRole } from "@components/SubstitutionPanel";
import { Hit } from "@constants/hitTypes";
import { pitchSwingRateMod, selectPitchType } from "@constants/pitchTypes";
import { makeAiPitchingDecision, makeAiTacticalDecision } from "@context/aiManager";
import { GameAction, LogAction, State, Strategy } from "@context/index";
import { detectDecision } from "@context/reducer";
import getRandomInt from "@utils/getRandomInt";

import { GameStateRef } from "./useGameRefs";

/**
 * Builds the handleClickButton callback and returns a stable ref to it.
 * All game state is read through refs to avoid stale closures.
 */
export const usePitchDispatch = (
  dispatch: (action: GameAction) => void,
  gameStateRef: GameStateRef,
  managerModeRef: React.MutableRefObject<boolean>,
  strategyRef: React.MutableRefObject<Strategy>,
  managedTeamRef: React.MutableRefObject<0 | 1>,
  skipDecisionRef: React.MutableRefObject<boolean>,
  strikesRef: React.MutableRefObject<number>,
  dispatchLog?: (action: LogAction) => void,
  pitcherRolesRef?: React.MutableRefObject<
    [Record<string, PitchingRole>, Record<string, PitchingRole>]
  >,
): React.MutableRefObject<() => void> => {
  const handleClickButton = React.useCallback(() => {
    const currentState = gameStateRef.current;

    if (currentState.gameOver) return;
    if (managerModeRef.current && currentState.pendingDecision) return;

    // Defensive shift: offered once per half-inning when the managed team is FIELDING
    if (
      managerModeRef.current &&
      !skipDecisionRef.current &&
      currentState.atBat !== managedTeamRef.current
    ) {
      if (
        !currentState.defensiveShiftOffered &&
        currentState.balls === 0 &&
        currentState.strikes === 0
      ) {
        dispatch({ type: "set_pending_decision", payload: { kind: "defensive_shift" } });
        return;
      }
    }

    if (
      managerModeRef.current &&
      !skipDecisionRef.current &&
      currentState.atBat === managedTeamRef.current
    ) {
      if (currentState.suppressNextDecision) {
        dispatch({ type: "clear_suppress_decision" });
      } else {
        const decision = detectDecision(currentState as State, strategyRef.current, true);
        if (decision) {
          dispatch({ type: "set_pending_decision", payload: decision });
          return;
        }
      }
    }

    // ── AI manager for unmanaged teams ────────────────────────────────────────
    // Determine which teams are NOT managed by the human (or both when no manager mode).
    const isBattingUnmanaged =
      !managerModeRef.current || currentState.atBat !== managedTeamRef.current;
    const isFieldingUnmanaged =
      !managerModeRef.current || 1 - currentState.atBat !== managedTeamRef.current;

    // Pitching change (fielding team): evaluate at start of each at-bat (0-0 count).
    if (currentState.balls === 0 && currentState.strikes === 0) {
      const pitchingTeamIdx = (1 - currentState.atBat) as 0 | 1;
      if (isFieldingUnmanaged) {
        const roles = pitcherRolesRef?.current[pitchingTeamIdx] ?? {};
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
        dispatchLog?.({ type: "log", payload: `The manager: ${shiftDecision.reasonText}.` });
        // Do NOT return early — the pitch continues after the shift is set.
      }
    }

    // Batting-team AI: tactical decisions (steal, bunt, count modifiers, pinch-hitter).
    if (isBattingUnmanaged && !currentState.suppressNextDecision) {
      const battingDecision = detectDecision(currentState as State, "balanced", true);
      if (battingDecision) {
        const aiAction = makeAiTacticalDecision(currentState as State, battingDecision);
        if (aiAction.kind === "tactical") {
          dispatch({ type: aiAction.actionType as GameAction["type"], payload: aiAction.payload });
          // After AI makes a concrete pinch-hit substitution, lock pinchHitterStrategy to
          // prevent the decision from being re-offered during this at-bat.
          if (
            battingDecision.kind === "pinch_hitter" &&
            aiAction.actionType === "make_substitution"
          ) {
            dispatch({ type: "set_pinch_hitter_strategy", payload: "balanced" });
          }
          dispatchLog?.({
            type: "log",
            payload: `The manager: ${aiAction.reasonText}.`,
          });
          // Decisions that replace the pitch (steal_attempt, bunt_attempt) should
          // return early; count/modifier decisions let the pitch proceed.
          const replacePitch =
            aiAction.actionType === "steal_attempt" || aiAction.actionType === "bunt_attempt";
          if (replacePitch) return;
        } else {
          // AI decided not to act — skip the decision so it is not re-offered
          dispatch({ type: "skip_decision" });
        }
      }
    }
    // ── End AI manager ────────────────────────────────────────────────────────

    // Select pitch type based on current count, then roll main outcome.
    const currentStrikes = strikesRef.current;
    const currentBalls = (currentState as State).balls;
    const pitchType = selectPitchType(currentBalls, currentStrikes, getRandomInt(100));

    const effectiveStrategy = currentState.pinchHitterStrategy ?? strategyRef.current;
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
    gameStateRef,
    managedTeamRef,
    managerModeRef,
    pitcherRolesRef,
    skipDecisionRef,
    strategyRef,
    strikesRef,
  ]);

  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  return handleClickRef;
};
