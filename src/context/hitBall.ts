import { Hit } from "@constants/hitTypes";
import getRandomInt from "@utils/getRandomInt";

import { advanceRunners } from "./advanceRunners";
import { DecisionType, OnePitchModifier, PlayLogEntry, State, Strategy } from "./index";
import { updateActivePitcherLog } from "./pitcherLog";
import { computeFatigueFactor } from "./pitchSimulation";
import { incrementPitcherFatigue, nextBatter, playerOut } from "./playerOut";
import { ZERO_MODS } from "./resolvePlayerMods";
import { stratMod } from "./strategy";

// Vivid hit callouts — logged inside hitBall AFTER the pop-out check passes.
const HIT_CALLOUTS: Record<Hit, string> = {
  [Hit.Single]: "He lines it into the outfield — base hit!",
  [Hit.Double]: "Into the gap — that's a double!",
  [Hit.Triple]: "Deep drive to the warning track — he's in with a triple!",
  [Hit.Homerun]: "That ball is GONE — home run!",
  [Hit.Walk]: "",
};

/**
 * Look up the speedMod for a player by their ID from both team's resolved mods.
 * Returns 0 if the player is not found (stock teams / no overrides).
 */
const getSpeedMod = (state: State, playerId: string | null | undefined): number => {
  if (!playerId) return 0;
  return (
    state.resolvedMods?.[0]?.[playerId]?.speedMod ??
    state.resolvedMods?.[1]?.[playerId]?.speedMod ??
    0
  );
};

/**
 * Handle a ground ball out. Implements three scenarios:
 *   1. Double play — runner on 1st with <2 outs, conditions right: two outs recorded.
 *   2. Fielder's choice — runner on 1st with <2 outs, DP not turned: lead runner out, batter safe.
 *   3. Simple ground out — no force play: batter thrown out at 1st.
 *
 * DP probability is context-aware: slow batter and slow runner increase DP likelihood;
 * fast batter or fast runner reduce it.
 */
const handleGrounder = (state: State, log: (msg: string) => void, pitchKey: number): State => {
  const { baseLayout, outs } = state;
  const groundedState = { ...state, pitchKey, hitType: undefined as Hit | undefined };

  // Batter identity — needed to assign runner ID when batter reaches on FC.
  const battingTeam = state.atBat as 0 | 1;
  const batterSlotIdx = state.batterIndex[battingTeam];
  const batterId = state.lineupOrder[battingTeam][batterSlotIdx] || null;

  if (baseLayout[0] && outs < 2) {
    // Context-aware DP probability: base 55%, adjusted by batter and runner speed.
    const batterSpeedMod = getSpeedMod(state, batterId);
    const runnerSpeedMod = getSpeedMod(state, state.baseRunnerIds?.[0]);
    // Faster players reduce DP chance; slower players increase it.
    const dpChance = Math.max(
      20,
      Math.min(80, 55 - Math.round(batterSpeedMod / 2) - Math.round(runnerSpeedMod / 2)),
    );

    if (getRandomInt(100) < dpChance) {
      // 6-4-3 / 5-4-3 double play: runner from 1st forced out at 2nd, batter out at 1st.
      log("Ground ball to the infield — double play!");
      const dpBase: [number, number, number] = [0, baseLayout[1], baseLayout[2]];
      // Clear the runner ID from 1st (they were forced out); batter is also out.
      const dpRunnerIds = [...(state.baseRunnerIds ?? [null, null, null])] as [
        string | null,
        string | null,
        string | null,
      ];
      dpRunnerIds[0] = null;
      // First out: runner from 1st forced out at 2nd (no lineup advance yet).
      const afterFirst = playerOut(
        { ...groundedState, baseLayout: dpBase, baseRunnerIds: dpRunnerIds },
        log,
      );
      // Second out: batter thrown out at 1st, at-bat is over (advance lineup).
      return playerOut(afterFirst, log, true);
    }
    log("Ground ball to the infield — fielder's choice.");
    const fcBase: [number, number, number] = [1, baseLayout[1], baseLayout[2]];
    // Lead runner (1st) is forced out; batter reaches 1st safely — place batter's ID there.
    const fcRunnerIds = [...(state.baseRunnerIds ?? [null, null, null])] as [
      string | null,
      string | null,
      string | null,
    ];
    fcRunnerIds[0] = batterId; // batter takes 1st; old runner ID (forced out) is replaced
    // Batter reaches 1st safely; at-bat complete, so advance lineup.
    return playerOut(
      { ...groundedState, baseLayout: fcBase, baseRunnerIds: fcRunnerIds },
      log,
      true,
    );
  }

  log("Ground ball to the infield — out at first.");
  return playerOut(groundedState, log, true);
};

/** Accumulate runs into the sparse inningRuns array for the current team/inning. */
export const addInningRuns = (state: State, runs: number): State => {
  if (runs === 0) return state;
  const idx = state.inning - 1;
  const newInningRuns: [number[], number[]] = [[...state.inningRuns[0]], [...state.inningRuns[1]]];
  newInningRuns[state.atBat as 0 | 1][idx] = (newInningRuns[state.atBat as 0 | 1][idx] ?? 0) + runs;
  return { ...state, inningRuns: newInningRuns };
};

export const hitBall = (
  type: Hit,
  state: State,
  log: (msg: string) => void,
  strategy: Strategy = "balanced",
): State => {
  const pitchKey = (state.pitchKey ?? 0) + 1;
  const base = {
    ...state,
    balls: 0,
    strikes: 0,
    pendingDecision: null as DecisionType | null,
    onePitchModifier: null as OnePitchModifier,
    pinchHitterStrategy: null as Strategy | null,
    pitchKey,
  };
  const randomNumber = getRandomInt(1000);

  // Batter overrides
  const battingTeam = state.atBat as 0 | 1;
  const batterSlotIdx = state.batterIndex[battingTeam];
  const playerId = state.lineupOrder[battingTeam][batterSlotIdx] || undefined;
  const batterMods = playerId
    ? (state.resolvedMods?.[battingTeam]?.[playerId] ?? ZERO_MODS)
    : ZERO_MODS;

  // Pitcher overrides
  const pitchingTeam = (1 - (state.atBat as number)) as 0 | 1;
  const activePitcherId =
    state.rosterPitchers[pitchingTeam]?.[state.activePitcherIdx[pitchingTeam]];
  const pitcherMods = activePitcherId
    ? (state.resolvedMods?.[pitchingTeam]?.[activePitcherId] ?? ZERO_MODS)
    : ZERO_MODS;

  // Pitcher fatigue: more batters faced → higher factor → easier to get hits.
  const pitcherBattersFaced = (state.pitcherBattersFaced ?? [0, 0])[pitchingTeam];
  const fatigueFactor = computeFatigueFactor(pitcherBattersFaced, pitcherMods.staminaMod);

  // contactMod: higher contact = higher threshold (easier to get hits)
  // movementMod: higher movement = lower threshold (harder to hit clean)
  // velocityMod: higher velocity = slightly lower threshold (harder to make solid contact)
  // fatigueFactor > 1: tired pitcher → higher threshold → easier to hit (more balls in play)
  const contactFactor = 1 + batterMods.contactMod / 100;
  const pitchingFactor = 1 - (pitcherMods.movementMod + pitcherMods.velocityMod / 2) / 100;
  const popOutThreshold = Math.round(
    750 *
      stratMod(strategy, "contact") *
      (state.defensiveShift ? 0.85 : 1) *
      contactFactor *
      Math.max(0.5, pitchingFactor) *
      fatigueFactor,
  );

  if (randomNumber >= popOutThreshold && type !== Hit.Homerun && type !== Hit.Walk) {
    const powerBonus = Math.round(15 * (1 + batterMods.powerMod / 100));
    if (strategy === "power" && getRandomInt(100) < powerBonus) {
      type = Hit.Homerun;
      log("Power hitter turns it around — Home Run!");
    } else if (getRandomInt(100) < 40) {
      // ~40% of non-HR outs are ground balls; rest are fly balls / pop-ups.
      return handleGrounder(state, log, pitchKey);
    } else {
      log("Popped it up — that's an out.");
      // batterCompleted=true: the batter's at-bat ended with a pop-out.
      return playerOut({ ...state, pitchKey, hitType: undefined }, log, true);
    }
  } else if (HIT_CALLOUTS[type]) {
    log(HIT_CALLOUTS[type]);
  }

  // ── Speed-based runner advancement ────────────────────────────────────────
  // Apply probabilistic advancement BEFORE calling advanceRunners so that
  // runners who score early are removed from the base layout first.
  const currentRunnerIds =
    state.baseRunnerIds ?? ([null, null, null] as [string | null, string | null, string | null]);

  const adjustedBase: [number, number, number] = [...state.baseLayout] as [number, number, number];
  const adjustedRunnerIds: [string | null, string | null, string | null] = [
    ...currentRunnerIds,
  ] as [string | null, string | null, string | null];
  let bonusRuns = 0;

  if (type === Hit.Single) {
    // Runner on 2nd: probabilistic scoring chance (~60% base, modified by runner speed).
    if (adjustedBase[1]) {
      const runner2ndSpeedMod = getSpeedMod(state, adjustedRunnerIds[1]);
      const scoreChance = Math.max(40, Math.min(85, 60 + Math.round(runner2ndSpeedMod * 1.5)));
      if (getRandomInt(100) < scoreChance) {
        adjustedBase[1] = 0;
        adjustedRunnerIds[1] = null;
        bonusRuns++;
        log("Runner on second scores!");
      }
    }
  } else if (type === Hit.Double) {
    // Runner on 1st: probabilistic scoring chance (~30% base, modified by runner speed).
    // (advanceRunners places runner from 1st on 3rd for a double by default.)
    if (adjustedBase[0]) {
      const runner1stSpeedMod = getSpeedMod(state, adjustedRunnerIds[0]);
      const scoreChance = Math.max(15, Math.min(55, 30 + Math.round(runner1stSpeedMod * 1.5)));
      if (getRandomInt(100) < scoreChance) {
        adjustedBase[0] = 0;
        adjustedRunnerIds[0] = null;
        bonusRuns++;
        log("Runner scores from first on the double!");
      }
    }
  }
  // ── End speed-based pre-processing ────────────────────────────────────────

  const { newBase, runsScored, newRunnerIds } = advanceRunners(
    type,
    adjustedBase,
    adjustedRunnerIds,
  );
  const totalRuns = runsScored + bonusRuns;
  const newScore: [number, number] = [state.score[0], state.score[1]];
  newScore[state.atBat] += totalRuns;

  if (runsScored > 0) {
    log(runsScored === 1 ? "One run scores!" : `${runsScored} runs score!`);
  }

  // Runner from 1st: sometimes stretches to 3rd on a single (if 3rd is empty after advance).
  const finalBase: [number, number, number] = [...newBase] as [number, number, number];
  const finalRunnerIds: [string | null, string | null, string | null] = [...newRunnerIds] as [
    string | null,
    string | null,
    string | null,
  ];

  if (type === Hit.Single && state.baseLayout[0] && !state.baseLayout[2]) {
    // Original runner was on 1st; they are now on 2nd (newBase[1]).
    // Check if they can stretch to 3rd (only if 3rd is still empty).
    if (finalBase[1] && !finalBase[2]) {
      const runner1stSpeedMod = getSpeedMod(state, currentRunnerIds[0]);
      const stretchChance = Math.max(10, Math.min(45, 28 + Math.round(runner1stSpeedMod * 1.5)));
      if (getRandomInt(100) < stretchChance) {
        finalBase[2] = 1;
        finalBase[1] = 0;
        finalRunnerIds[2] = finalRunnerIds[1];
        finalRunnerIds[1] = null;
        log("Runner stretches to third!");
      }
    }
  }

  // Place batter on their destination base
  const batterBase =
    type === Hit.Single || type === Hit.Walk
      ? 0
      : type === Hit.Double
        ? 1
        : type === Hit.Triple
          ? 2
          : null; // HR: batter scores, no base

  if (batterBase !== null && playerId) {
    finalRunnerIds[batterBase] = playerId;
  }

  // Record this at-bat in the play log (batter reached base).
  const batterNum = batterSlotIdx + 1;
  const playEntry: PlayLogEntry = {
    inning: state.inning,
    half: battingTeam,
    batterNum,
    ...(playerId ? { playerId } : {}),
    team: battingTeam,
    event: type,
    runs: totalRuns,
    rbi: totalRuns,
  };

  // Update pitcher log: increment hits/walks/homers/runs/battersFaced for pitching team.
  const isWalk = type === Hit.Walk;
  const isHomer = type === Hit.Homerun;
  const pitcherLogAfterHit = updateActivePitcherLog(
    base.pitcherGameLog ?? [[], []],
    pitchingTeam,
    (entry) => ({
      ...entry,
      hitsAllowed: entry.hitsAllowed + (isWalk ? 0 : 1),
      walksAllowed: entry.walksAllowed + (isWalk ? 1 : 0),
      homersAllowed: entry.homersAllowed + (isHomer ? 1 : 0),
      runsAllowed: entry.runsAllowed + totalRuns,
      battersFaced: entry.battersFaced + 1,
    }),
  );

  const withRuns = addInningRuns(
    {
      ...base,
      baseLayout: finalBase,
      score: newScore,
      hitType: type,
      baseRunnerIds: finalRunnerIds,
      pitcherGameLog: pitcherLogAfterHit,
    },
    totalRuns,
  );

  // Increment pitcher fatigue: batter reached base (hit or walk) — at-bat complete.
  const withFatigue = incrementPitcherFatigue(withRuns);

  // nextBatter: batter reached base, rotate lineup to next batter.
  return nextBatter({
    ...withFatigue,
    playLog: [...state.playLog, playEntry],
  });
};
