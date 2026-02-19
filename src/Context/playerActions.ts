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
    // batterCompleted=true: batter's at-bat ended with a strikeout.
    return playerOut({ ...state, pitchKey }, log, true);
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
  // batterCompleted=false (default): a runner was put out; the same batter remains at the plate.
  return playerOut({ ...state, pendingDecision: null, baseLayout: clearedBases, pitchKey: (state.pitchKey ?? 0) + 1 }, log, false);
};

export const buntAttempt = (state: State, log, strategy: Strategy = "balanced"): State => {
  log("Batter squares to bunt...");
  const roll = getRandomInt(100);
  const singleChance = strategy === "contact" ? 20 : 8;
  const fcChance = singleChance + 12;

  if (roll < singleChance) {
    log("Bunt single!");
    // hitBall handles batter advancement and play log recording.
    return hitBall(Hit.Single, { ...state, pendingDecision: null }, log, strategy);
  }
  if (roll < fcChance) {
    log("Fielder's choice! Lead runner thrown out — batter reaches first safely.");
    const oldBase = state.baseLayout;
    const newBase: [number, number, number] = [1, 0, 0]; // batter to 1st
    let runsScored = 0;

    if (oldBase[0]) {
      // Runner on 1st is forced to 2nd and thrown out; advance runners on 2nd/3rd as in a sacrifice
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) newBase[2] = 1;
    } else if (oldBase[1]) {
      // Runner on 2nd is thrown out at 3rd; runner on 3rd scores
      if (oldBase[2]) runsScored++;
    }

    const newScore: [number, number] = [state.score[0], state.score[1]];
    newScore[state.atBat] += runsScored;
    if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);

    const inningIdx = state.inning - 1;
    const newInningRuns: [number[], number[]] = [
      [...state.inningRuns[0]],
      [...state.inningRuns[1]],
    ];
    if (runsScored > 0) {
      newInningRuns[state.atBat as 0 | 1][inningIdx] =
        (newInningRuns[state.atBat as 0 | 1][inningIdx] ?? 0) + runsScored;
    }

    const afterFC = {
      ...state, baseLayout: newBase, score: newScore,
      pendingDecision: null as DecisionType | null, onePitchModifier: null as OnePitchModifier,
      strikes: 0, balls: 0, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1,
      inningRuns: newInningRuns,
    };
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

    // Update inning runs for any sac-bunt runs scored.
    const inningIdx = state.inning - 1;
    const newInningRuns: [number[], number[]] = [
      [...state.inningRuns[0]],
      [...state.inningRuns[1]],
    ];
    if (runsScored > 0) {
      newInningRuns[state.atBat as 0 | 1][inningIdx] =
        (newInningRuns[state.atBat as 0 | 1][inningIdx] ?? 0) + runsScored;
    }

    const afterBunt = {
      ...state, baseLayout: newBase, score: newScore,
      pendingDecision: null as DecisionType | null, onePitchModifier: null as OnePitchModifier,
      pinchHitterStrategy: null as Strategy | null,
      defensiveShift: false, defensiveShiftOffered: false,
      strikes: 0, balls: 0, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1,
      inningRuns: newInningRuns,
    };
    return checkWalkoff(playerOut(afterBunt, log, true), log);
  }
  log("Bunt popped up — out!");
  // batterCompleted=true: batter's at-bat ended with a bunt pop-up.
  return playerOut(
    { ...state, pendingDecision: null, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1 },
    log,
    true,
  );
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
