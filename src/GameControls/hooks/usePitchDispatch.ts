import * as React from "react";
import { Strategy, State } from "../../Context";
import { detectDecision } from "../../Context/reducer";
import { Hit } from "../../constants/hitTypes";
import getRandomInt from "../../utilities/getRandomInt";
import { GameStateRef } from "./useGameRefs";

/**
 * Builds the handleClickButton callback and returns a stable ref to it.
 * All game state is read through refs to avoid stale closures.
 */
export const usePitchDispatch = (
  dispatch: Function,
  dispatchLog: Function,
  gameStateRef: GameStateRef,
  managerModeRef: React.MutableRefObject<boolean>,
  strategyRef: React.MutableRefObject<Strategy>,
  managedTeamRef: React.MutableRefObject<0 | 1>,
  skipDecisionRef: React.MutableRefObject<boolean>,
  strikesRef: React.MutableRefObject<number>,
): React.MutableRefObject<() => void> => {
  const handleClickButton = React.useCallback(() => {
    const currentState = gameStateRef.current;

    if (currentState.gameOver) return;
    if (managerModeRef.current && currentState.pendingDecision) return;

    if (managerModeRef.current && !skipDecisionRef.current && currentState.atBat === managedTeamRef.current) {
      const decision = detectDecision(
        currentState as State,
        strategyRef.current,
        true
      );
      if (decision) {
        dispatch({ type: "set_pending_decision", payload: decision });
        return;
      }
    }

    const random = getRandomInt(1000);
    const currentStrikes = strikesRef.current;
    const onePitchMod = currentState.onePitchModifier;

    const protectBonus = onePitchMod === "protect" ? 0.7 : 1;
    const contactMod = strategyRef.current === "contact" ? 1.15 : strategyRef.current === "power" ? 0.9 : 1;
    const swingRate = Math.round((500 - (75 * currentStrikes)) * contactMod * protectBonus);
    const effectiveSwingRate = onePitchMod === "swing" ? 920 : swingRate;

    if (random < effectiveSwingRate) {
      if (getRandomInt(100) < 30) {
        dispatch({ type: "foul" });
      } else {
        dispatch({ type: "strike", payload: { swung: true } });
      }
    } else if (random < 920) {
      dispatch({ type: "wait", payload: { strategy: strategyRef.current } });
    } else {
      const strat = strategyRef.current;
      const hitRoll = getRandomInt(100);
      let base: Hit;
      if (strat === "power") {
        base = hitRoll < 20 ? Hit.Homerun : hitRoll < 23 ? Hit.Triple : hitRoll < 43 ? Hit.Double : Hit.Single;
      } else if (strat === "contact") {
        base = hitRoll < 8 ? Hit.Homerun : hitRoll < 10 ? Hit.Triple : hitRoll < 28 ? Hit.Double : Hit.Single;
      } else {
        base = hitRoll < 13 ? Hit.Homerun : hitRoll < 15 ? Hit.Triple : hitRoll < 35 ? Hit.Double : Hit.Single;
      }
      dispatch({ type: "hit", payload: { hitType: base, strategy: strat } });
    }
  }, [dispatch, dispatchLog]);

  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  return handleClickRef;
};
