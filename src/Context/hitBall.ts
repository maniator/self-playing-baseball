import { Hit } from "../constants/hitTypes";
import { State, Strategy, DecisionType, OnePitchModifier, PlayLogEntry } from "./index";
import { advanceRunners } from "./advanceRunners";
import { playerOut, nextBatter } from "./playerOut";
import { stratMod } from "./strategy";
import getRandomInt from "../utilities/getRandomInt";

// Vivid hit callouts — logged inside hitBall AFTER the pop-out check passes.
const HIT_CALLOUTS: Record<Hit, string> = {
  [Hit.Single]:  "He lines it into the outfield — base hit!",
  [Hit.Double]:  "Into the gap — that's a double!",
  [Hit.Triple]:  "Deep drive to the warning track — he's in with a triple!",
  [Hit.Homerun]: "That ball is GONE — home run!",
  [Hit.Walk]:    "",
};

/**
 * Handle a ground ball out. Implements three scenarios:
 *   1. Double play — runner on 1st with <2 outs: two outs recorded, runner on 1st removed.
 *   2. Fielder's choice — runner on 1st with <2 outs, DP not turned: lead runner thrown out
 *      going to 2nd while batter safely reaches 1st.
 *   3. Simple ground out — no force play available: batter thrown out at 1st.
 */
const handleGrounder = (state: State, log, pitchKey: number): State => {
  const { baseLayout, outs } = state;
  const groundedState = { ...state, pitchKey, hitType: undefined as Hit | undefined };

  if (baseLayout[0] && outs < 2) {
    if (getRandomInt(100) < 65) {
      // 6-4-3 / 5-4-3 double play: runner on 1st forced out at 2nd, batter out at 1st.
      log("Ground ball to the infield — double play!");
      const dpBase: [number, number, number] = [0, baseLayout[1], baseLayout[2]];
      // batterCompleted=true: batter's at-bat is over; first out removes runner at 2nd.
      const afterFirst = playerOut({ ...groundedState, baseLayout: dpBase }, log, true);
      return playerOut(afterFirst, log);
    }
    // Fielder's choice: throw to 2nd for the force out; batter safely reaches 1st.
    log("Ground ball to the infield — fielder's choice.");
    const fcBase: [number, number, number] = [1, baseLayout[1], baseLayout[2]];
    return playerOut({ ...groundedState, baseLayout: fcBase }, log);
  }

  log("Ground ball to the infield — out at first.");
  // batterCompleted=true: batter thrown out, at-bat is over.
  return playerOut(groundedState, log, true);
};

/** Accumulate runs into the sparse inningRuns array for the current team/inning. */
const addInningRuns = (state: State, runs: number): State => {
  if (runs === 0) return state;
  const idx = state.inning - 1;
  const newInningRuns: [number[], number[]] = [
    [...state.inningRuns[0]],
    [...state.inningRuns[1]],
  ];
  newInningRuns[state.atBat as 0 | 1][idx] =
    (newInningRuns[state.atBat as 0 | 1][idx] ?? 0) + runs;
  return { ...state, inningRuns: newInningRuns };
};

export const hitBall = (type: Hit, state: State, log, strategy: Strategy = "balanced"): State => {
  const pitchKey = (state.pitchKey ?? 0) + 1;
  const base = {
    ...state,
    balls: 0,
    strikes: 0,
    pendingDecision: null as DecisionType | null,
    onePitchModifier: null as OnePitchModifier,
    pitchKey,
  };
  const randomNumber = getRandomInt(1000);

  const popOutThreshold = Math.round(750 * stratMod(strategy, "contact"));

  if (randomNumber >= popOutThreshold && type !== Hit.Homerun && type !== Hit.Walk) {
    if (strategy === "power" && getRandomInt(100) < 15) {
      type = Hit.Homerun;
      log("Power hitter turns it around — Home Run!");
    } else if (getRandomInt(100) < 40) {
      // ~40% of non-HR outs are ground balls; the rest are fly balls / pop-ups.
      return handleGrounder(state, log, pitchKey);
    } else {
      log("Popped it up — that's an out.");
      // batterCompleted=true: the batter's at-bat ended with a pop-out.
      return playerOut({ ...state, pitchKey, hitType: undefined }, log, true);
    }
  } else if (HIT_CALLOUTS[type]) {
    log(HIT_CALLOUTS[type]);
  }

  const { newBase, runsScored } = advanceRunners(type, state.baseLayout);
  const newScore: [number, number] = [state.score[0], state.score[1]];
  newScore[state.atBat] += runsScored;

  if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);

  // Record this at-bat in the play log (batter reached base).
  const batterNum = state.batterIndex[state.atBat as 0 | 1] + 1;
  const playEntry: PlayLogEntry = {
    inning: state.inning,
    half: state.atBat as 0 | 1,
    batterNum,
    team: state.atBat as 0 | 1,
    event: type,
    runs: runsScored,
  };

  const withRuns = addInningRuns(
    { ...base, baseLayout: newBase, score: newScore, hitType: type },
    runsScored,
  );

  // nextBatter: batter reached base, rotate lineup to next batter.
  return nextBatter({
    ...withRuns,
    playLog: [...state.playLog, playEntry],
  });
};

