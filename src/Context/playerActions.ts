import { State, Strategy, OnePitchModifier, DecisionType } from "./index";
import { checkWalkoff } from "./gameOver";
import { stratMod } from "./strategy";
import { playerOut } from "./playerOut";
import { hitBall } from "./hitBall";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";

export const playerStrike = (state: State, log, swung = false, foul = false): State => {
  const newStrikes = state.strikes + 1;
  const pitchKey = (state.pitchKey ?? 0) + 1;

  if (newStrikes === 3) {
    log(swung ? "Swing and a miss — strike three! He's out!" : "Called strike three! He's out!");
    return playerOut({ ...state, pitchKey }, log);
  }

  if (foul) {
    log(`Foul ball — strike ${newStrikes}.`);
  } else {
    log(swung ? `Swing and a miss — strike ${newStrikes}.` : `Called strike ${newStrikes}.`);
  }

  return {
    ...state,
    strikes: newStrikes,
    pendingDecision: null, onePitchModifier: null,
    hitType: undefined,
    pitchKey,
  };
};

export const playerBall = (state: State, log): State => {
  const newBalls = state.balls + 1;
  const pitchKey = (state.pitchKey ?? 0) + 1;

  if (newBalls === 4) {
    log("Ball four — take your base!");
    return hitBall(Hit.Walk, { ...state, pitchKey }, log);
  }

  log(`Ball ${newBalls}.`);
  return {
    ...state,
    balls: newBalls,
    pendingDecision: null, onePitchModifier: null,
    hitType: undefined,
    pitchKey,
  };
};

export const stealAttempt = (state: State, log, successPct: number, base: 0 | 1): State => {
  log(`Steal attempt from ${base === 0 ? "1st" : "2nd"}...`);
  const roll = getRandomInt(100);
  if (roll < successPct) {
    log("Safe! Steal successful!");
    const newBase: [number, number, number] = [...state.baseLayout] as [number, number, number];
    newBase[base] = 0;
    newBase[base + 1] = 1;
    return {
      ...state,
      baseLayout: newBase,
      pendingDecision: null, onePitchModifier: null,
      pitchKey: (state.pitchKey ?? 0) + 1,
    };
  }
  log("Caught stealing!");
  const clearedBases: [number, number, number] = [...state.baseLayout] as [number, number, number];
  clearedBases[base] = 0;
  return playerOut({ ...state, pendingDecision: null, baseLayout: clearedBases, pitchKey: (state.pitchKey ?? 0) + 1 }, log);
};

export const buntAttempt = (state: State, log, strategy: Strategy = "balanced"): State => {
  log("Batter squares to bunt...");
  const roll = getRandomInt(100);
  const singleChance = strategy === "contact" ? 20 : 8;

  if (roll < singleChance) {
    log("Bunt single!");
    return hitBall(Hit.Single, { ...state, pendingDecision: null }, log, strategy);
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
    const afterBunt = {
      ...state, baseLayout: newBase, score: newScore,
      pendingDecision: null as DecisionType | null, onePitchModifier: null as OnePitchModifier,
      strikes: 0, balls: 0, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1,
    };
    return checkWalkoff(playerOut(afterBunt, log), log);
  }
  log("Bunt popped up — out!");
  return playerOut({ ...state, pendingDecision: null, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1 }, log);
};

const computeWaitOutcome = (random: number, strategy: Strategy, modifier: OnePitchModifier): "ball" | "strike" => {
  if (modifier === "take") {
    const walkChance = Math.min(950, Math.round(750 * stratMod(strategy, "walk")));
    return random < walkChance ? "ball" : "strike";
  }
  const strikeThreshold = Math.round(500 / stratMod(strategy, "walk"));
  return random < strikeThreshold ? "strike" : "ball";
};

export const playerWait = (state: State, log, strategy: Strategy = "balanced", modifier: OnePitchModifier = null): State => {
  const random = getRandomInt(1000);
  const outcome = computeWaitOutcome(random, strategy, modifier);
  return outcome === "ball" ? playerBall(state, log) : playerStrike(state, log, false);
};
