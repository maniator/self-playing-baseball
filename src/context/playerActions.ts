import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchName, pitchStrikeZoneMod } from "@constants/pitchTypes";
import getRandomInt from "@utils/getRandomInt";

import { hitBall } from "./hitBall";
import { OnePitchModifier, State, Strategy } from "./index";
import { updateActivePitcherLog } from "./pitcherLog";
import { computeFatigueFactor } from "./pitchSimulation";
import { incrementPitchCount, playerOut } from "./playerOut";
import { ZERO_MODS } from "./resolvePlayerMods";
import { stratMod } from "./strategy";

export { buntAttempt } from "./buntAttempt";

export const playerStrike = (
  state: State,
  log: (msg: string) => void,
  swung = false,
  foul = false,
  pitchType?: PitchType,
): State => {
  // Count this pitch before processing its outcome.
  const stateWithPitch = incrementPitchCount(state);
  const newStrikes = stateWithPitch.strikes + 1;
  const pitchKey = (stateWithPitch.pitchKey ?? 0) + 1;
  const msg = (text: string) =>
    pitchType ? `${pitchName(pitchType)} — ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`;

  if (newStrikes === 3) {
    log(
      swung
        ? msg("swing and a miss — strike three! He's out!")
        : msg("called strike three! He's out!"),
    );
    // Track strikeout for the active pitcher before recording the out.
    const pitchingTeam = (1 - (stateWithPitch.atBat as number)) as 0 | 1;
    const stateWithK = {
      ...stateWithPitch,
      pitcherGameLog: updateActivePitcherLog(
        stateWithPitch.pitcherGameLog ?? [[], []],
        pitchingTeam,
        (entry) => ({ ...entry, strikeoutsRecorded: entry.strikeoutsRecorded + 1 }),
      ),
    };
    return playerOut({ ...stateWithK, pitchKey }, log, true);
  }

  if (foul) {
    log(msg(`foul ball — strike ${newStrikes}.`));
  } else {
    log(
      swung ? msg(`swing and a miss — strike ${newStrikes}.`) : msg(`called strike ${newStrikes}.`),
    );
  }

  return {
    ...stateWithPitch,
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
  // Count this pitch before processing its outcome.
  const stateWithPitch = incrementPitchCount(state);
  const newBalls = stateWithPitch.balls + 1;
  const pitchKey = (stateWithPitch.pitchKey ?? 0) + 1;
  const msg = (text: string) =>
    pitchType ? `${pitchName(pitchType)} — ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`;

  if (newBalls === 4) {
    log(msg("ball four — take your base!"));
    return hitBall(Hit.Walk, { ...stateWithPitch, pitchKey }, log);
  }

  log(msg(`ball ${newBalls}.`));
  return {
    ...stateWithPitch,
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
    const newRunnerIds = [...(state.baseRunnerIds ?? [null, null, null])] as [
      string | null,
      string | null,
      string | null,
    ];
    newRunnerIds[base + 1] = newRunnerIds[base];
    newRunnerIds[base] = null;
    return {
      ...state,
      baseLayout: newBase,
      baseRunnerIds: newRunnerIds,
      pendingDecision: null,
      onePitchModifier: null,
      pitchKey: (state.pitchKey ?? 0) + 1,
    };
  }
  log("Caught stealing!");
  const clearedBases: [number, number, number] = [...state.baseLayout] as [number, number, number];
  clearedBases[base] = 0;
  const clearedRunnerIds = [...(state.baseRunnerIds ?? [null, null, null])] as [
    string | null,
    string | null,
    string | null,
  ];
  clearedRunnerIds[base] = null;
  return playerOut(
    {
      ...state,
      pendingDecision: null,
      baseLayout: clearedBases,
      baseRunnerIds: clearedRunnerIds,
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
  pitcherControlMod: number = 0,
  pitcherVelocityMod: number = 0,
): "ball" | "strike" => {
  const zoneMod = pitchType ? pitchStrikeZoneMod(pitchType) : 1.0;
  // Higher control = pitcher more likely to throw strikes; higher velocity = harder to draw walks.
  // Clamp all thresholds to [0, 999] to stay within the getRandomInt(1000) RNG range.
  const controlFactor = 1 + (pitcherControlMod + pitcherVelocityMod / 2) / 100;
  if (modifier === "take") {
    const adjustedWalkChance = Math.min(
      999,
      Math.max(0, Math.round((220 * stratMod(strategy, "walk")) / (zoneMod * controlFactor))),
    );
    return random < adjustedWalkChance ? "ball" : "strike";
  }
  const adjustedStrikeThreshold = Math.min(
    999,
    Math.max(0, Math.round((500 * zoneMod * controlFactor) / stratMod(strategy, "walk"))),
  );
  return random < adjustedStrikeThreshold ? "strike" : "ball";
};

export const playerWait = (
  state: State,
  log: (msg: string) => void,
  strategy: Strategy = "balanced",
  modifier: OnePitchModifier = null,
  pitchType?: PitchType,
): State => {
  const random = getRandomInt(1000);
  // Look up active pitcher's control and velocity mods
  const pitchingTeam = (1 - (state.atBat as number)) as 0 | 1;
  const activePitcherId =
    state.rosterPitchers[pitchingTeam]?.[state.activePitcherIdx[pitchingTeam]];
  const pitcherMods = activePitcherId
    ? (state.resolvedMods?.[pitchingTeam]?.[activePitcherId] ?? ZERO_MODS)
    : ZERO_MODS;
  const pitcherControlMod = pitcherMods.controlMod;
  const pitcherVelocityMod = pitcherMods.velocityMod;

  // Fatigue reduces effective control: a tired pitcher misses the zone more often.
  const pitcherBattersFaced = (state.pitcherBattersFaced ?? [0, 0])[pitchingTeam];
  const pitcherPitchCount = (state.pitcherPitchCount ?? [0, 0])[pitchingTeam];
  const fatigueFactor = computeFatigueFactor(
    pitcherPitchCount,
    pitcherBattersFaced,
    pitcherMods.staminaMod,
  );
  const fatigueControlPenalty = Math.round((fatigueFactor - 1) * 20);
  const effectiveControlMod = pitcherControlMod - fatigueControlPenalty;

  const outcome = computeWaitOutcome(
    random,
    strategy,
    modifier,
    pitchType,
    effectiveControlMod,
    pitcherVelocityMod,
  );
  return outcome === "ball"
    ? playerBall(state, log, pitchType)
    : playerStrike(state, log, false, false, pitchType);
};
