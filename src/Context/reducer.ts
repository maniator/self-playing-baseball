import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { State, Strategy, DecisionType, OnePitchModifier } from "./index";

enum Base {
  First,
  Second,
  Third,
  Home
}

const createLogger = (dispatchLogger) => (message) => {
  dispatchLogger({ type: "log", payload: message });
}

const moveBase = (log, state: State, fromBase: Base, toBase: Base): State => {
  let newState = { ...state };

  const nextBase = fromBase === null ? Base.First : fromBase + 1;

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 1;
  }

  if (Base[fromBase] === Base[toBase]) {
    if (toBase === Base.Home) {
      log("Player scored a run!");
      newState.score[newState.atBat] += 1;
    }
    // "stayed on base" — internal bookkeeping, not worth announcing

    return newState;
  }

  if (fromBase === toBase) {
    return newState;
  } else if (newState.baseLayout.hasOwnProperty(nextBase) || nextBase === Base.Home) {
    if (newState.baseLayout[nextBase] === 1) {
      // runner being bumped ahead — no announcement needed
      newState = moveBase(log, newState, nextBase, nextBase + 1);
      newState.baseLayout[nextBase] = 0;
    }

    newState = moveBase(log, newState, nextBase, toBase);
  } else {
    throw new Error(`Base does not exist: ${Base[nextBase]}`);
  }

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 0;
  }

  return newState;
}

// --- Strategy modifiers ---
// Returns a multiplier (0.0–2.0 range) for a given stat given the strategy.
const stratMod = (strategy: Strategy, stat: "walk" | "strikeout" | "homerun" | "contact" | "steal" | "advance"): number => {
  const table: Record<Strategy, Record<typeof stat, number>> = {
    balanced:  { walk: 1.0, strikeout: 1.0, homerun: 1.0, contact: 1.0, steal: 1.0, advance: 1.0 },
    aggressive:{ walk: 0.8, strikeout: 1.1, homerun: 1.1, contact: 1.0, steal: 1.3, advance: 1.3 },
    patient:   { walk: 1.4, strikeout: 0.8, homerun: 0.9, contact: 1.0, steal: 0.7, advance: 0.9 },
    contact:   { walk: 1.0, strikeout: 0.7, homerun: 0.7, contact: 1.4, steal: 1.0, advance: 1.1 },
    power:     { walk: 0.9, strikeout: 1.3, homerun: 1.6, contact: 0.8, steal: 0.8, advance: 1.0 },
  };
  return table[strategy][stat];
};

const hitBall = (type: Hit, state: State, log, strategy: Strategy = "balanced"): State => {
  let newState = { ...state, balls: 0, strikes: 0, pendingDecision: null as DecisionType | null, onePitchModifier: null as OnePitchModifier };
  const randomNumber = getRandomInt(1000);

  // Contact strategy reduces pop-out chance; power strategy increases HR chance
  const popOutThreshold = Math.round(750 * stratMod(strategy, "contact"));

  if (randomNumber >= popOutThreshold && type !== Hit.Homerun) {
    // Power strategy: on "pop out" roll, small chance to turn it into HR
    if (strategy === "power" && getRandomInt(100) < 15) {
      log("Power hitter turns it around — Home Run!")
      newState = moveBase(log, newState, null, Base.Home);
      return { ...newState, hitType: Hit.Homerun };
    }
    log("Popped it up — that's an out.")
    return playerOut(state, log);
  }

  switch (type) {
    case Hit.Homerun:
      newState = moveBase(log, newState, null, Base.Home);
      break;
    case Hit.Triple:
      newState = moveBase(log, newState, null, Base.Third);
      break;
    case Hit.Double:
      newState = moveBase(log, newState, null, Base.Second);
      break;
    case Hit.Walk:
    case Hit.Single:
      newState = moveBase(log, newState, null, Base.First);
      break;
    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  // Hit type is announced by BatterButton before dispatching; no duplicate log here.

  return { ...newState, hitType: type };
};

// Check if the game is over: bottom of 9th (or later), home team is leading after 3 outs
const checkGameOver = (state: State, log): State => {
  // Game ends after the 9th inning is complete with no tie,
  // OR at the end of the bottom of the 9th if the home team leads.
  if (state.inning >= 9) {
    const [away, home] = state.score;
    if (away !== home) {
      const winner = away > home ? state.teams[0] : state.teams[1];
      log(`That's the ball game! ${winner} win!`);
      return { ...state, gameOver: true };
    }
  }
  return state;
};

const nextHalfInning = (state: State, log): State => {
  const newState = { ...state, baseLayout: [0, 0, 0] as [number, number, number], outs: 0, strikes: 0, balls: 0, pendingDecision: null as DecisionType | null, onePitchModifier: null as OnePitchModifier };
  let newHalfInning = newState.atBat + 1;
  let newInning = newState.inning;

  if (newHalfInning > 1) {
    newHalfInning = 0;
    newInning += 1;
  }

  const next = { ...newState, inning: newInning, atBat: newHalfInning };

  // Check game over after completing the top of an inning only when it's 9th+
  // (home team wins in walk-off: handled when bottom side gets the winning run — checked at score time)
  // We check end-of-inning: just finished bottom half (atBat was 1 → newHalfInning = 0)
  if (newHalfInning === 0 && newInning > 9) {
    const maybe = checkGameOver(next, log);
    if (maybe.gameOver) return maybe;
  }

  log(`${state.teams[newHalfInning]} are now up to bat!`)
  return next;
}

const playerOut = (state: State, log): State => {
  const newState = { ...state };
  const newOuts = newState.outs + 1;

  if (newOuts === 3) {
    // nextHalfInning announces who bats next — no need to repeat "three outs" here
    const afterHalf = nextHalfInning(newState, log);
    if (afterHalf.gameOver) return afterHalf;

    // End of bottom of 9th+ — check if game should end
    if (newState.atBat === 1 && newState.inning >= 9) {
      const maybe = checkGameOver(afterHalf, log);
      if (maybe.gameOver) return maybe;
    }

    return afterHalf;
  }

  log(newOuts === 1 ? "One out." : "Two outs.");
  return { ...newState, strikes: 0, balls: 0, outs: newOuts, pendingDecision: null, onePitchModifier: null }
}

const playerStrike = (state: State, log, swung = false): State => {
  const newStrikes = state.strikes + 1;

  if (newStrikes === 3) {
    log(swung ? "Swing and a miss — strike three! He's out!" : "Called strike three! He's out!");
    return playerOut(state, log);
  }

  log(swung ? `Swing and a miss — strike ${newStrikes}.` : `Called strike ${newStrikes}.`);

  return { ...state, strikes: newStrikes, pendingDecision: null, onePitchModifier: null };
}

const playerBall = (state: State, log): State => {
  const newBalls = state.balls + 1;

  if (newBalls === 4) {
    log("Ball four — take your base!");
    return hitBall(Hit.Walk, state, log);
  }

  log(`Ball ${newBalls}.`);
  return { ...state, balls: newBalls, pendingDecision: null, onePitchModifier: null };
}

const playerWait = (state: State, log, strategy: Strategy = "balanced", modifier: OnePitchModifier = null): State => {
  const random = getRandomInt(1000);

  // "Take" on 3-0: bias heavily toward ball
  if (modifier === "take") {
    const walkChance = Math.min(950, Math.round(750 * stratMod(strategy, "walk")));
    if (random < walkChance) {
      return playerBall(state, log);
    }
    return playerStrike(state, log, false);
  }

  // Strategy modifies the called-strike/ball split (threshold out of 1000)
  const strikeThreshold = Math.round(500 / stratMod(strategy, "walk"));
  if (random < strikeThreshold) {
    return playerStrike(state, log, false);
  } else {
    return playerBall(state, log);
  }
}

// --- Decision detection ---
const computeStealSuccessPct = (base: 0 | 1, strategy: Strategy): number => {
  const base_pct = base === 0 ? 70 : 60; // 2nd->3rd harder
  return Math.round(base_pct * stratMod(strategy, "steal"));
};

export const detectDecision = (state: State, strategy: Strategy, managerMode: boolean): DecisionType | null => {
  if (!managerMode) return null;
  if (state.gameOver) return null;

  const { baseLayout, outs, balls, strikes } = state;

  // IBB: runner on 2nd or 3rd, 1st base open — only a realistic option in late innings
  // (7th+), close game (≤2 runs apart), and with 2 outs to set up a force play.
  const scoreDiff = Math.abs(state.score[0] - state.score[1]);
  if (
    !baseLayout[0] &&
    (baseLayout[1] || baseLayout[2]) &&
    outs === 2 &&
    state.inning >= 7 &&
    scoreDiff <= 2
  ) {
    return { kind: "ibb" };
  }

  // Steal: runner on 1st or 2nd, fewer than 2 outs
  if (outs < 2) {
    if (baseLayout[0]) {
      return { kind: "steal", base: 0, successPct: computeStealSuccessPct(0, strategy) };
    }
    if (baseLayout[1]) {
      return { kind: "steal", base: 1, successPct: computeStealSuccessPct(1, strategy) };
    }
  }

  // Bunt: runner on 1st or 2nd, fewer than 2 outs
  if (outs < 2 && (baseLayout[0] || baseLayout[1])) {
    return { kind: "bunt" };
  }

  // Count decisions
  if (balls === 3 && strikes === 0) return { kind: "count30" };
  if (balls === 0 && strikes === 2) return { kind: "count02" };

  return null;
};

// Score a run for the home team walkoff in bottom of 9th+
const checkWalkoff = (state: State, log): State => {
  if (state.inning >= 9 && state.atBat === 1) {
    const [away, home] = state.score;
    if (home > away) {
      log(`Walk-off! ${state.teams[1]} win!`);
      return { ...state, gameOver: true };
    }
  }
  return state;
};

const reducer = (dispatchLogger) => {
  const log = createLogger(dispatchLogger);

  return function reducer(state: State, action: { type: string, payload: any }): State {
    if (state.gameOver && !['setTeams', 'nextInning'].includes(action.type)) {
      return state;
    }

    switch (action.type) {
      case 'nextInning':
        return { ...state, inning: state.inning + 1 };

      case 'hit': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        const hitType: Hit = action.payload?.hitType ?? action.payload;
        const result = hitBall(hitType, state, log, strategy);
        const afterWalkoff = checkWalkoff(result, log);
        return afterWalkoff;
      }

      case 'setTeams':
        return { ...state, teams: action.payload };

      case 'strike': {
        const swung = action.payload?.swung ?? false;
        return playerStrike(state, log, swung);
      }

      case 'wait': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        return playerWait(state, log, strategy, state.onePitchModifier);
      }

      case 'set_one_pitch_modifier':
        return { ...state, onePitchModifier: action.payload as OnePitchModifier, pendingDecision: null };

      case 'steal_attempt': {
        const { successPct, base } = action.payload;
        log(`Steal attempt from ${base === 0 ? "1st" : "2nd"}...`);
        const roll = getRandomInt(100);
        if (roll < successPct) {
          log("Safe! Steal successful!");
          const fromBase = base === 0 ? Base.First : Base.Second;
          const newState = moveBase(log, { ...state, pendingDecision: null }, fromBase, fromBase + 1);
          return { ...newState, pendingDecision: null, onePitchModifier: null };
        } else {
          log("Caught stealing!");
          // Remove the runner from their original base before recording the out.
          const clearedBases: [number, number, number] = [...state.baseLayout] as [number, number, number];
          clearedBases[base] = 0;
          return playerOut({ ...state, pendingDecision: null, baseLayout: clearedBases }, log);
        }
      }

      case 'bunt_attempt': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        log("Batter squares to bunt...");
        const roll = getRandomInt(100);
        // Contact strategy: small chance of bunt single
        const singleChance = strategy === "contact" ? 20 : 8;
        if (roll < singleChance) {
          log("Bunt single!");
          return hitBall(Hit.Single, { ...state, pendingDecision: null }, log, strategy);
        } else if (roll < 80) {
          // Sac bunt: advance runners, batter out
          log("Sacrifice bunt! Runner(s) advance.");
          let newState = { ...state, pendingDecision: null, onePitchModifier: null, strikes: 0, balls: 0 };
          if (newState.baseLayout[1]) {
            newState = moveBase(log, newState, Base.Second, Base.Third);
          }
          if (newState.baseLayout[0]) {
            newState = moveBase(log, newState, Base.First, Base.Second);
          }
          return checkWalkoff(playerOut(newState, log), log);
        } else {
          log("Bunt popped up — out!");
          return playerOut({ ...state, pendingDecision: null }, log);
        }
      }

      case 'intentional_walk': {
        log("Intentional walk issued.");
        const result = hitBall(Hit.Walk, { ...state, pendingDecision: null }, log);
        return checkWalkoff(result, log);
      }

      case 'skip_decision':
        return { ...state, pendingDecision: null };

      case 'set_pending_decision':
        return { ...state, pendingDecision: action.payload as DecisionType };

      default:
        throw new Error(`No such reducer type as ${action.type}`);
    }
  }
}

export default reducer;

