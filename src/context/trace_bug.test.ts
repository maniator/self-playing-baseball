/**
 * Debug test: trace batting stats for seed 30nl0i
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

// Convert base-36 seed to number
const parseSeed = (s: string): number => parseInt(s, 36) >>> 0;

describe("seed 30nl0i batting stats trace", () => {
  it("traces batting stats through a full game", () => {
    const seed = parseSeed(SEED_STR);
    console.log(`Seed: ${SEED_STR} = ${seed} (0x${seed.toString(16)})`);
    restoreRng(seed);

    const logs: string[] = [];
    const dispatchLogger = (action: LogAction) => {
      if (action.type === "log") logs.push(action.payload);
    };
    const reducer = reducerFactory(dispatchLogger);

    // Set up teams like the screenshot (New York Mets vs New York Yankees)
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

    // Simulate the pitch logic exactly as usePitchDispatch does
    let pitchCount = 0;
    const maxPitches = 2000;

    while (!state.gameOver && pitchCount < maxPitches) {
      pitchCount++;

      const currentStrikes = state.strikes;
      const currentBalls = state.balls;
      const pitchType = selectPitchType(currentBalls, currentStrikes, getRandomInt(100));

      const random = getRandomInt(1000);
      const contactMod = 1.0; // balanced strategy
      const baseSwingRate = Math.round((500 - 75 * currentStrikes) * contactMod);
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
        base =
          hitRoll < 13 ? Hit.Homerun :
          hitRoll < 15 ? Hit.Triple :
          hitRoll < 35 ? Hit.Double :
          Hit.Single;
        action = { type: "hit", payload: { hitType: base, strategy: "balanced" } };
      }

      state = reducer(state, action);
    }

    console.log(`Game over: ${state.gameOver}, pitches: ${pitchCount}`);
    console.log(`Score: Away ${state.score[0]} - Home ${state.score[1]}`);
    console.log(`Innings: ${state.inning}`);

    // Print batting stats for away team (team 0)
    console.log("\n=== AWAY TEAM BATTING STATS ===");
    console.log(`Lineup order: ${state.lineupOrder[0].join(", ")}`);
    
    // Compute stats manually
    const computeStats = (team: 0 | 1) => {
      const stats: Record<number, { atBats: number; hits: number; walks: number; strikeouts: number }> = {};
      for (let i = 1; i <= 9; i++) {
        stats[i] = { atBats: 0, hits: 0, walks: 0, strikeouts: 0 };
      }
      for (const entry of state.playLog) {
        if (entry.team !== team) continue;
        if (entry.event === Hit.Walk) {
          stats[entry.batterNum].walks++;
        } else {
          stats[entry.batterNum].hits++;
        }
      }
      for (const entry of state.strikeoutLog) {
        if (entry.team !== team) continue;
        stats[entry.batterNum].strikeouts++;
      }
      for (const entry of state.outLog) {
        if (entry.team !== team) continue;
        stats[entry.batterNum].atBats++;
      }
      for (let i = 1; i <= 9; i++) {
        stats[i].atBats += stats[i].hits;
      }
      return stats;
    };

    const awayStats = computeStats(0);
    console.log("\nSlot | Player           | AB | H | BB | K");
    for (let num = 1; num <= 9; num++) {
      const s = awayStats[num];
      const playerName = awayRoster.batters[num - 1]?.name ?? `Slot ${num}`;
      console.log(`  ${num}  | ${playerName.padEnd(16)} | ${s.atBats} | ${s.hits} | ${s.walks} | ${s.strikeouts}`);
    }

    // Check the invariant: no later batter should have more ABs than an earlier batter
    // (in a consistent batting order game)
    console.log("\n=== BATTING ORDER CONSISTENCY CHECK ===");
    let foundViolation = false;
    for (let i = 1; i <= 9; i++) {
      for (let j = i + 1; j <= 9; j++) {
        const abDiff = awayStats[j].atBats - awayStats[i].atBats;
        if (abDiff > 1) {
          console.log(`VIOLATION: Slot ${j} has ${awayStats[j].atBats} AB but slot ${i} only has ${awayStats[i].atBats} AB (diff=${abDiff})`);
          foundViolation = true;
        }
      }
    }
    if (!foundViolation) {
      console.log("No violations found (batting order is consistent)");
    }

    // Also trace outLog for team 0
    console.log("\n=== outLog for team 0 (first 30 entries) ===");
    const teamOutLog = state.outLog.filter(e => e.team === 0);
    teamOutLog.slice(0, 30).forEach((e, i) => {
      console.log(`  out[${i}]: team=${e.team}, batterNum=${e.batterNum}`);
    });
    
    console.log("\n=== playLog for team 0 (first 30 entries) ===");
    const teamPlayLog = state.playLog.filter(e => e.team === 0);
    teamPlayLog.slice(0, 30).forEach((e, i) => {
      console.log(`  play[${i}]: team=${e.team}, batterNum=${e.batterNum}, event=${e.event}, inning=${e.inning}`);
    });
  });
});
