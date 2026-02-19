import { Hit } from "../constants/hitTypes";
import { State, Strategy, DecisionType, OnePitchModifier } from "./index";
import { advanceRunners } from "./advanceRunners";
import { playerOut } from "./playerActions";
import { stratMod } from "./reducer";
import getRandomInt from "../utilities/getRandomInt";

// Vivid hit callouts — logged inside hitBall AFTER the pop-out check passes.
const HIT_CALLOUTS: Record<Hit, string> = {
  [Hit.Single]:  "He lines it into the outfield — base hit!",
  [Hit.Double]:  "Into the gap — that's a double!",
  [Hit.Triple]:  "Deep drive to the warning track — he's in with a triple!",
  [Hit.Homerun]: "That ball is GONE — home run!",
  [Hit.Walk]:    "",
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
    } else {
      log("Popped it up — that's an out.");
      return playerOut({ ...state, pitchKey, hitType: undefined }, log);
    }
  } else if (HIT_CALLOUTS[type]) {
    log(HIT_CALLOUTS[type]);
  }

  const { newBase, runsScored } = advanceRunners(type, state.baseLayout);
  const newScore: [number, number] = [state.score[0], state.score[1]];
  newScore[state.atBat] += runsScored;

  if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);

  return { ...base, baseLayout: newBase, score: newScore, hitType: type };
};
