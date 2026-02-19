import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { State, Strategy, DecisionType, OnePitchModifier } from "./index";

const createLogger = (dispatchLogger) => (message) => {
  dispatchLogger({ type: "log", payload: message });
}

// --- Strategy modifiers ---
// Returns a multiplier (0.0–2.0 range) for a given stat given the strategy.
export const stratMod = (strategy: Strategy, stat: "walk" | "strikeout" | "homerun" | "contact" | "steal" | "advance"): number => {
  const table: Record<Strategy, Record<typeof stat, number>> = {
    balanced:  { walk: 1.0, strikeout: 1.0, homerun: 1.0, contact: 1.0, steal: 1.0, advance: 1.0 },
    aggressive:{ walk: 0.8, strikeout: 1.1, homerun: 1.1, contact: 1.0, steal: 1.3, advance: 1.3 },
    patient:   { walk: 1.4, strikeout: 0.8, homerun: 0.9, contact: 1.0, steal: 0.7, advance: 0.9 },
    contact:   { walk: 1.0, strikeout: 0.7, homerun: 0.7, contact: 1.4, steal: 1.0, advance: 1.1 },
    power:     { walk: 0.9, strikeout: 1.3, homerun: 1.6, contact: 0.8, steal: 0.8, advance: 1.0 },
  };
  return table[strategy][stat];
};

// Vivid hit callouts — logged inside hitBall AFTER the pop-out check passes.
const HIT_CALLOUTS: Record<Hit, string> = {
  [Hit.Single]:  "He lines it into the outfield — base hit!",
  [Hit.Double]:  "Into the gap — that's a double!",
  [Hit.Triple]:  "Deep drive to the warning track — he's in with a triple!",
  [Hit.Homerun]: "That ball is GONE — home run!",
  [Hit.Walk]:    "", // walks are announced separately
};

/**
 * Advance runners using explicit, correct baseball rules.
 * Returns a fresh baseLayout tuple and run count — never mutates state arrays.
 *
 * Rules:
 *   HR     – all runners score, batter scores (grand-slam logic included)
 *   Triple – all runners score, batter to 3rd
 *   Double – runners on 2nd/3rd score; runner on 1st to 3rd; batter to 2nd
 *   Single – runner on 3rd scores; runner on 2nd to 3rd; runner on 1st to 2nd; batter to 1st
 *   Walk   – force advancement only (batter to 1st, each runner advances only if forced)
 *
 * TODO (future PR): Add grounder / double-play logic, directional-hit runner-advancement,
 * and caught-at-first-with-trailing-runner scenarios.  These require tracking ball direction
 * and individual runner speeds, which is a larger state change.
 */
const advanceRunners = (
  type: Hit,
  oldBase: [number, number, number],
): { newBase: [number, number, number]; runsScored: number } => {
  const newBase: [number, number, number] = [0, 0, 0];
  let runsScored = 0;

  switch (type) {
    case Hit.Homerun:
      // All runners + batter score; bases clear
      runsScored = oldBase.filter(Boolean).length + 1;
      break;

    case Hit.Triple:
      // All existing runners score; batter to 3rd
      runsScored = oldBase.filter(Boolean).length;
      newBase[2] = 1;
      break;

    case Hit.Double:
      // Runners on 2nd and 3rd score; runner on 1st goes to 3rd; batter to 2nd
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) runsScored++;
      if (oldBase[0]) newBase[2] = 1;
      newBase[1] = 1;
      break;

    case Hit.Single:
      // Runner on 3rd scores; runner on 2nd to 3rd; runner on 1st to 2nd; batter to 1st
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) newBase[2] = 1;
      if (oldBase[0]) newBase[1] = 1;
      newBase[0] = 1;
      break;

    case Hit.Walk:
      // Force advancement: batter takes 1st; each runner advances only if the base
      // behind them is (or becomes) occupied.
      if (oldBase[0]) {
        // 1st occupied → batter forces everyone up
        if (oldBase[1]) {
          if (oldBase[2]) {
            runsScored++; // bases loaded — runner on 3rd forced home
          }
          newBase[2] = 1; // runner from 2nd to 3rd (always when 2nd was occupied)
          newBase[1] = 1; // runner from 1st to 2nd
        } else {
          newBase[1] = 1; // runner from 1st to 2nd
          if (oldBase[2]) newBase[2] = 1; // runner on 3rd stays
        }
        newBase[0] = 1; // batter to 1st
      } else {
        // 1st is free — no force; other runners stay put
        newBase[0] = 1; // batter to 1st
        if (oldBase[1]) newBase[1] = 1;
        if (oldBase[2]) newBase[2] = 1;
      }
      break;

    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  return { newBase, runsScored };
};

const hitBall = (type: Hit, state: State, log, strategy: Strategy = "balanced"): State => {
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

  // Contact strategy reduces pop-out chance
  const popOutThreshold = Math.round(750 * stratMod(strategy, "contact"));

  if (randomNumber >= popOutThreshold && type !== Hit.Homerun) {
    // Power strategy: rare chance to turn pop-out into HR
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

// Check if the game is over: bottom of 9th (or later), home team is leading after 3 outs
const checkGameOver = (state: State, log): State => {
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
  const newState = {
    ...state,
    baseLayout: [0, 0, 0] as [number, number, number],
    outs: 0, strikes: 0, balls: 0,
    pendingDecision: null as DecisionType | null,
    onePitchModifier: null as OnePitchModifier,
    hitType: undefined,
  };
  let newHalfInning = newState.atBat + 1;
  let newInning = newState.inning;

  if (newHalfInning > 1) {
    newHalfInning = 0;
    newInning += 1;
  }

  const next = { ...newState, inning: newInning, atBat: newHalfInning };

  if (newHalfInning === 0 && newInning > 9) {
    const maybe = checkGameOver(next, log);
    if (maybe.gameOver) return maybe;
  }

  log(`${state.teams[newHalfInning]} are now up to bat!`);
  return next;
}

const playerOut = (state: State, log): State => {
  const newOuts = state.outs + 1;

  if (newOuts === 3) {
    const afterHalf = nextHalfInning(state, log);
    if (afterHalf.gameOver) return afterHalf;

    if (state.atBat === 1 && state.inning >= 9) {
      const maybe = checkGameOver(afterHalf, log);
      if (maybe.gameOver) return maybe;
    }

    return afterHalf;
  }

  log(newOuts === 1 ? "One out." : "Two outs.");
  return {
    ...state,
    strikes: 0, balls: 0, outs: newOuts,
    pendingDecision: null, onePitchModifier: null,
    hitType: undefined,
  };
}

const playerStrike = (state: State, log, swung = false, foul = false): State => {
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
}

const playerBall = (state: State, log): State => {
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
  const base_pct = base === 0 ? 70 : 60; // stealing 3rd is harder
  return Math.round(base_pct * stratMod(strategy, "steal"));
};

// Minimum steal success probability required to offer the steal decision.
// > 72 means effectively 73%+.
const STEAL_MIN_PCT = 72;

export const detectDecision = (state: State, strategy: Strategy, managerMode: boolean): DecisionType | null => {
  if (!managerMode) return null;
  if (state.gameOver) return null;

  const { baseLayout, outs, balls, strikes } = state;

  // IBB: runner on 2nd or 3rd, 1st base open — only realistic in late innings
  // (7th+), close game (≤2 runs apart), with 2 outs to set up a force play.
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

  // Steal: destination base must be empty; success pct must exceed threshold
  if (outs < 2) {
    if (baseLayout[0] && !baseLayout[1]) {
      // Runner on 1st, 2nd is free
      const pct = computeStealSuccessPct(0, strategy);
      if (pct > STEAL_MIN_PCT) return { kind: "steal", base: 0, successPct: pct };
    }
    if (baseLayout[1] && !baseLayout[2]) {
      // Runner on 2nd, 3rd is free
      const pct = computeStealSuccessPct(1, strategy);
      if (pct > STEAL_MIN_PCT) return { kind: "steal", base: 1, successPct: pct };
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

// Walk-off check for bottom of 9th+
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
    if (state.gameOver && !['setTeams', 'nextInning', 'reset'].includes(action.type)) {
      return state;
    }

    switch (action.type) {
      case 'nextInning':
        return { ...state, inning: state.inning + 1 };

      case 'hit': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        const hitType: Hit = action.payload?.hitType ?? action.payload;
        const result = hitBall(hitType, state, log, strategy);
        return checkWalkoff(result, log);
      }

      case 'setTeams':
        return { ...state, teams: action.payload };

      case 'strike': {
        const swung = action.payload?.swung ?? false;
        return playerStrike(state, log, swung, false);
      }

      case 'foul': {
        // Foul ball: strike unless already at 2 strikes (can't strike out on a foul)
        if (state.strikes < 2) {
          return playerStrike(state, log, true, true);
        }
        // Two-strike foul: count stays, just log and increment pitchKey
        log("Foul ball — count stays.");
        return {
          ...state,
          pendingDecision: null,
          hitType: undefined,
          pitchKey: (state.pitchKey ?? 0) + 1,
        };
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
          // Simple array swap — destination base is guaranteed empty by detectDecision.
          const newBase: [number, number, number] = [...state.baseLayout] as [number, number, number];
          newBase[base] = 0;
          newBase[base + 1] = 1;
          return {
            ...state,
            baseLayout: newBase,
            pendingDecision: null, onePitchModifier: null,
            pitchKey: (state.pitchKey ?? 0) + 1,
          };
        } else {
          log("Caught stealing!");
          const clearedBases: [number, number, number] = [...state.baseLayout] as [number, number, number];
          clearedBases[base] = 0;
          return playerOut({
            ...state,
            pendingDecision: null,
            baseLayout: clearedBases,
            pitchKey: (state.pitchKey ?? 0) + 1,
          }, log);
        }
      }

      case 'bunt_attempt': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        log("Batter squares to bunt...");
        const roll = getRandomInt(100);
        const singleChance = strategy === "contact" ? 20 : 8;

        if (roll < singleChance) {
          log("Bunt single!");
          return hitBall(Hit.Single, { ...state, pendingDecision: null }, log, strategy);
        } else if (roll < 80) {
          // Sacrifice bunt: advance all runners (runner on 3rd scores), batter is out.
          log("Sacrifice bunt! Runner(s) advance.");
          const oldBase = state.baseLayout;
          const newBase: [number, number, number] = [0, 0, 0];
          let runsScored = 0;

          if (oldBase[2]) runsScored++;       // runner on 3rd scores
          if (oldBase[1]) newBase[2] = 1;     // runner on 2nd to 3rd
          if (oldBase[0]) newBase[1] = 1;     // runner on 1st to 2nd

          const newScore: [number, number] = [state.score[0], state.score[1]];
          newScore[state.atBat] += runsScored;
          if (runsScored > 0) log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);

          const afterBunt = {
            ...state,
            baseLayout: newBase,
            score: newScore,
            pendingDecision: null as DecisionType | null,
            onePitchModifier: null as OnePitchModifier,
            strikes: 0, balls: 0,
            hitType: undefined,
            pitchKey: (state.pitchKey ?? 0) + 1,
          };
          return checkWalkoff(playerOut(afterBunt, log), log);
        } else {
          log("Bunt popped up — out!");
          return playerOut({
            ...state,
            pendingDecision: null,
            hitType: undefined,
            pitchKey: (state.pitchKey ?? 0) + 1,
          }, log);
        }
      }

      case 'intentional_walk': {
        log("Intentional walk issued.");
        const result = hitBall(Hit.Walk, { ...state, pendingDecision: null }, log);
        return checkWalkoff(result, log);
      }

      case 'reset':
        return {
          inning: 1,
          score: [0, 0] as [number, number],
          teams: state.teams,
          baseLayout: [0, 0, 0] as [number, number, number],
          outs: 0, strikes: 0, balls: 0,
          atBat: 0,
          hitType: undefined,
          gameOver: false,
          pendingDecision: null,
          onePitchModifier: null,
          pitchKey: 0,
          decisionLog: [],
        };

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

