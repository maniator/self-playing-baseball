import { Hit } from "@constants/hitTypes";
import getRandomInt from "@utils/getRandomInt";

import { checkWalkoff } from "./gameOver";
import { addInningRuns, hitBall } from "./hitBall";
import { DecisionType, OnePitchModifier, State, Strategy } from "./index";
import { playerOut } from "./playerOut";

export const buntAttempt = (
  state: State,
  log: (msg: string) => void,
  strategy: Strategy = "balanced",
): State => {
  log("Batter squares to bunt...");
  const roll = getRandomInt(100);
  const singleChance = strategy === "contact" ? 20 : 8;

  if (roll < singleChance) {
    log("Bunt single!");
    return hitBall(Hit.Single, { ...state, pendingDecision: null }, log, strategy);
  }

  const fcChance = singleChance + 12;
  if (roll < fcChance) {
    log("Fielder's choice! Lead runner thrown out — batter reaches first safely.");
    const oldBase = state.baseLayout;
    const newBase: [number, number, number] = [1, 0, 0];
    let runsScored = 0;
    if (oldBase[0]) {
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) newBase[2] = 1;
    } else if (oldBase[1]) {
      if (oldBase[2]) runsScored++;
    }
    const newScore: [number, number] = [state.score[0], state.score[1]];
    newScore[state.atBat] += runsScored;
    if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);
    const afterFC = addInningRuns(
      {
        ...state,
        baseLayout: newBase,
        score: newScore,
        pendingDecision: null as DecisionType | null,
        onePitchModifier: null as OnePitchModifier,
        strikes: 0,
        balls: 0,
        hitType: undefined,
        pitchKey: (state.pitchKey ?? 0) + 1,
      },
      runsScored,
    );
    return checkWalkoff(playerOut(afterFC, log, true), log);
  }

  if (roll < 80) {
    log("Sacrifice bunt! Runner(s) advance.");
    const oldBase = state.baseLayout;
    const newBase: [number, number, number] = [0, 0, 0];
    let runsScored = 0;
    if (oldBase[2]) runsScored++;
    if (oldBase[1]) newBase[2] = 1;
    if (oldBase[0]) newBase[1] = 1;
    const newScore: [number, number] = [state.score[0], state.score[1]];
    newScore[state.atBat] += runsScored;
    if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);
    const afterBunt = addInningRuns(
      {
        ...state,
        baseLayout: newBase,
        score: newScore,
        pendingDecision: null as DecisionType | null,
        onePitchModifier: null as OnePitchModifier,
        pinchHitterStrategy: null as Strategy | null,
        defensiveShift: false,
        defensiveShiftOffered: false,
        strikes: 0,
        balls: 0,
        hitType: undefined,
        pitchKey: (state.pitchKey ?? 0) + 1,
      },
      runsScored,
    );
    return checkWalkoff(playerOut(afterBunt, log, true), log);
  }

  log("Bunt popped up — out!");
  return playerOut(
    { ...state, pendingDecision: null, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1 },
    log,
    true,
  );
};
