import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchName, pitchStrikeZoneMod } from "@constants/pitchTypes";
import getRandomInt from "@utils/getRandomInt";

import { hitBall } from "./hitBall";
import { OnePitchModifier, State, Strategy } from "./index";
import { playerOut } from "./playerOut";
import { stratMod } from "./strategy";

export { buntAttempt } from "./buntAttempt";

export const playerStrike = (
  state: State,
  log: (msg: string) => void,
  swung = false,
  foul = false,
  pitchType?: PitchType,
): State => {
  const newStrikes = state.strikes + 1;
  const pitchKey = (state.pitchKey ?? 0) + 1;
  const msg = (text: string) =>
    pitchType ? `${pitchName(pitchType)} — ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`;

  if (newStrikes === 3) {
    log(
      swung
        ? msg("swing and a miss — strike three! He's out!")
        : msg("called strike three! He's out!"),
    );
    return playerOut({ ...state, pitchKey }, log, true);
  }

  if (foul) {
    log(msg(`foul ball — strike ${newStrikes}.`));
  } else {
    log(
      swung ? msg(`swing and a miss — strike ${newStrikes}.`) : msg(`called strike ${newStrikes}.`),
    );
  }

  return {
    ...state,
    strikes: newStrikes,
    pendingDecision: null,
    onePitchModifier: null,
    hitType: undefined,
    pitchKey,
  };
};

export const playerBall = (
  state: State,
  log: (msg: string) => void,
  pitchType?: PitchType,
): State => {
  const newBalls = state.balls + 1;
  const pitchKey = (state.pitchKey ?? 0) + 1;
  const msg = (text: string) =>
    pitchType ? `${pitchName(pitchType)} — ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`;

  if (newBalls === 4) {
    log(msg("ball four — take your base!"));
    return hitBall(Hit.Walk, { ...state, pitchKey }, log);
  }

  log(msg(`ball ${newBalls}.`));
  return {
    ...state,
    balls: newBalls,
    pendingDecision: null,
    onePitchModifier: null,
    hitType: undefined,
    pitchKey,
  };
};

export const stealAttempt = (
  state: State,
  log: (msg: string) => void,
  successPct: number,
  base: 0 | 1,
): State => {
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
      pendingDecision: null,
      onePitchModifier: null,
      pitchKey: (state.pitchKey ?? 0) + 1,
    };
  }
  log("Caught stealing!");
  const clearedBases: [number, number, number] = [...state.baseLayout] as [number, number, number];
  clearedBases[base] = 0;
  return playerOut(
    {
      ...state,
      pendingDecision: null,
      baseLayout: clearedBases,
      pitchKey: (state.pitchKey ?? 0) + 1,
    },
    log,
    false,
  );
};

const computeWaitOutcome = (
  random: number,
  strategy: Strategy,
  modifier: OnePitchModifier,
  pitchType?: PitchType,
): "ball" | "strike" => {
  const zoneMod = pitchType ? pitchStrikeZoneMod(pitchType) : 1.0;
  if (modifier === "take") {
    const walkChance = Math.min(950, Math.round((750 * stratMod(strategy, "walk")) / zoneMod));
    return random < walkChance ? "ball" : "strike";
  }
  const strikeThreshold = Math.round((500 * zoneMod) / stratMod(strategy, "walk"));
  return random < strikeThreshold ? "strike" : "ball";
};

export const playerWait = (
  state: State,
  log: (msg: string) => void,
  strategy: Strategy = "balanced",
  modifier: OnePitchModifier = null,
  pitchType?: PitchType,
): State => {
  const random = getRandomInt(1000);
  const outcome = computeWaitOutcome(random, strategy, modifier, pitchType);
  return outcome === "ball"
    ? playerBall(state, log, pitchType)
    : playerStrike(state, log, false, false, pitchType);
};
