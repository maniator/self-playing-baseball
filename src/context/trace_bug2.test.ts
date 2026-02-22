/**
 * Detailed trace to find the batting stats bug
 */
import { describe, it } from "vitest";
import { Hit } from "@constants/hitTypes";
import { selectPitchType, pitchSwingRateMod } from "@constants/pitchTypes";
import type { GameAction, LogAction, State } from "@context/index";
import { makeState } from "@test/testHelpers";
import { restoreRng } from "@utils/rng";
import getRandomInt from "@utils/getRandomInt";
import { generateRoster } from "@utils/roster";
import reducerFactory from "@context/reducer";

const SEED_STR = "30nl0i";
const parseSeed = (s: string): number => parseInt(s, 36) >>> 0;

describe("seed 30nl0i detailed trace", () => {
  it("shows per-batter stats after each inning", () => {
    const seed = parseSeed(SEED_STR);
    restoreRng(seed);

    const logs: string[] = [];
    const dispatchLogger = (action: LogAction) => {
      if (action.type === "log") logs.push(action.payload);
    };
    const reducer = reducerFactory(dispatchLogger);

    const awayTeam = "New York Mets";
    const homeTeam = "New York Yankees";
    const awayRoster = generateRoster(awayTeam);
    const homeRoster = generateRoster(homeTeam);

    let state = makeState({
      teams: [awayTeam, homeTeam],
      lineupOrder: [
        awayRoster.batters.map(b => b.id),
        homeRoster.batters.map(b => b.id),
      ],
    });

    let pitchCount = 0;
    const maxPitches = 2000;
    let lastInning = 1;
    let lastAtBat = 0;

    const printAwayStats = (label: string) => {
      const s = state;
      console.log(`\n${label} (inning=${s.inning}, atBat=${s.atBat}, batterIndex=[${s.batterIndex}])`);
      console.log("  outLog for team 0:", JSON.stringify(s.outLog.filter(e => e.team === 0)));
      console.log("  strikeoutLog for team 0:", JSON.stringify(s.strikeoutLog.filter(e => e.team === 0)));
      console.log("  playLog for team 0:", JSON.stringify(s.playLog.filter(e => e.team === 0)));
      
      // Compute stats
      const stats: Record<number, { ab: number, k: number }> = {};
      for (let i = 1; i <= 9; i++) stats[i] = { ab: 0, k: 0 };
      for (const e of s.outLog.filter(e => e.team === 0)) stats[e.batterNum].ab++;
      for (const e of s.playLog.filter(e => e.team === 0 && e.event !== Hit.Walk)) stats[e.batterNum].ab++;
      for (const e of s.strikeoutLog.filter(e => e.team === 0)) stats[e.batterNum].k++;
      console.log("  Stats: ", Object.entries(stats).map(([n, s]) => `Slot${n}:AB=${s.ab},K=${s.k}`).join(", "));
    };

    while (!state.gameOver && pitchCount < maxPitches) {
      pitchCount++;

      // Print stats at start of each new inning
      if (state.inning !== lastInning || state.atBat !== lastAtBat) {
        if (state.atBat === 0) { // away team up
          printAwayStats(`TOP OF INNING ${state.inning}`);
        }
        lastInning = state.inning;
        lastAtBat = state.atBat;
      }

      const currentStrikes = state.strikes;
      const currentBalls = state.balls;
      const pitchType = selectPitchType(currentBalls, currentStrikes, getRandomInt(100));

      const random = getRandomInt(1000);
      const baseSwingRate = Math.round((500 - 75 * currentStrikes) * 1.0);
      const swingRate = Math.round(baseSwingRate * pitchSwingRateMod(pitchType));

      let action: GameAction;
      if (random < swingRate) {
        if (getRandomInt(100) < 30) {
          action = { type: "foul", payload: { pitchType } };
        } else {
          action = { type: "strike", payload: { swung: true, pitchType } };
        }
      } else if (random < 920) {
        action = { type: "wait", payload: { strategy: "balanced", pitchType } };
      } else {
        const hitRoll = getRandomInt(100);
        let base: Hit;
        base = hitRoll < 13 ? Hit.Homerun : hitRoll < 15 ? Hit.Triple : hitRoll < 35 ? Hit.Double : Hit.Single;
        action = { type: "hit", payload: { hitType: base, strategy: "balanced" } };
      }

      state = reducer(state, action);
    }

    printAwayStats("GAME OVER");
  });
});
