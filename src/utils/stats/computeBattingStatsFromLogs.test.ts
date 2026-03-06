import { Hit } from "@constants/hitTypes";
import type { PlayLogEntry, StrikeoutEntry } from "@context/index";

import {
  BatterStat,
  computeBattingStatsFromLogs,
  emptyBatterStat,
  statKey,
} from "./computeBattingStatsFromLogs";

describe("emptyBatterStat", () => {
  it("returns a zeroed stat record", () => {
    const s = emptyBatterStat();
    expect(s.atBats).toBe(0);
    expect(s.hits).toBe(0);
    expect(s.walks).toBe(0);
    expect(s.strikeouts).toBe(0);
    expect(s.rbi).toBe(0);
    expect(s.singles).toBe(0);
    expect(s.doubles).toBe(0);
    expect(s.triples).toBe(0);
    expect(s.homers).toBe(0);
    expect(s.sacFlies).toBe(0);
  });
});

describe("statKey", () => {
  it("returns playerId when present", () => {
    expect(statKey({ playerId: "p1", batterNum: 3 })).toBe("p1");
  });

  it("falls back to slot key when playerId is absent", () => {
    expect(statKey({ batterNum: 5 })).toBe("slot:5");
  });
});

describe("computeBattingStatsFromLogs", () => {
  const makePlayEntry = (
    team: 0 | 1,
    event: Hit,
    batterNum: number,
    playerId?: string,
    rbi = 0,
  ): PlayLogEntry => ({ inning: 1, half: team, batterNum, team, event, runs: rbi, rbi, playerId });

  const makeStrikeout = (team: 0 | 1, batterNum: number, playerId?: string): StrikeoutEntry => ({
    inning: 1,
    half: team,
    batterNum,
    team,
    playerId,
  });

  const makeSacFlyOut = (
    team: 0 | 1,
    batterNum: number,
    playerId?: string,
    rbi = 1,
  ): StrikeoutEntry => ({
    team,
    batterNum,
    playerId,
    isSacFly: true,
    rbi,
  });

  it("counts a single", () => {
    const entry = makePlayEntry(0, Hit.Single, 1, "p1");
    // Hits are in playLog only — never in outLog (outLog = K + pop-out + groundout + FC + sac-bunt).
    const result = computeBattingStatsFromLogs(0, [entry], [], []);
    expect(result["p1"].hits).toBe(1);
    expect(result["p1"].singles).toBe(1);
    // AB = outLog entries(0) + hits(1) = 1
    expect(result["p1"].atBats).toBe(1);
  });

  it("counts a double, triple, homerun", () => {
    const double = makePlayEntry(0, Hit.Double, 2, "p2");
    const triple = makePlayEntry(0, Hit.Triple, 3, "p3");
    const homer = makePlayEntry(0, Hit.Homerun, 4, "p4");
    // Hits are never in outLog
    const result = computeBattingStatsFromLogs(0, [double, triple, homer], [], []);
    expect(result["p2"].doubles).toBe(1);
    expect(result["p3"].triples).toBe(1);
    expect(result["p4"].homers).toBe(1);
  });

  it("counts walks and excludes them from AB", () => {
    const walk = makePlayEntry(0, Hit.Walk, 1, "p1");
    const result = computeBattingStatsFromLogs(0, [walk], [], []);
    // walk is not in outLog, so AB = hits(0) + outLog(0) = 0
    expect(result["p1"].walks).toBe(1);
    expect(result["p1"].atBats).toBe(0);
  });

  it("counts strikeouts and adds to atBats", () => {
    const k = makeStrikeout(0, 1, "p1");
    const result = computeBattingStatsFromLogs(0, [], [k], [k]);
    expect(result["p1"].strikeouts).toBe(1);
    expect(result["p1"].atBats).toBe(1); // outLog entry → atBat
  });

  it("accumulates RBI", () => {
    const hit = makePlayEntry(0, Hit.Homerun, 1, "p1", 3);
    const result = computeBattingStatsFromLogs(0, [hit], [], [hit]);
    expect(result["p1"].rbi).toBe(3);
  });

  it("filters by team", () => {
    const awayHit = makePlayEntry(0, Hit.Single, 1, "p1");
    const homeHit = makePlayEntry(1, Hit.Single, 1, "p2");
    const awayResult = computeBattingStatsFromLogs(0, [awayHit, homeHit], [], [awayHit, homeHit]);
    expect(awayResult["p1"]).toBeDefined();
    expect(awayResult["p2"]).toBeUndefined();

    const homeResult = computeBattingStatsFromLogs(1, [awayHit, homeHit], [], [awayHit, homeHit]);
    expect(homeResult["p2"]).toBeDefined();
    expect(homeResult["p1"]).toBeUndefined();
  });

  it("uses slot key for entries without playerId", () => {
    const entry: PlayLogEntry = {
      inning: 1,
      half: 0,
      batterNum: 5,
      team: 0,
      event: Hit.Single,
      runs: 0,
      rbi: 0,
    };
    const result = computeBattingStatsFromLogs(0, [entry], [], [entry]);
    expect(result["slot:5"]).toBeDefined();
    expect(result["slot:5"].singles).toBe(1);
  });

  it("AB = hits + outLog (not including walks)", () => {
    const hit = makePlayEntry(0, Hit.Single, 1, "p1");
    const out = makeStrikeout(0, 2, "p2");
    const result = computeBattingStatsFromLogs(0, [hit], [], [out]);
    // p1: hits=1, not in outLog → AB = 0 + 1 = 1
    expect(result["p1"].atBats).toBe(1);
    // p2: K in strikeoutLog AND outLog → AB = 1 (from outLog) + 0 (no hits) = 1
    expect(result["p2"].atBats).toBe(1);
  });

  it("sacrifice fly: counts as PA but not AB; awards RBI; increments sacFlies", () => {
    const sf = makeSacFlyOut(0, 3, "p3", 1);
    const result = computeBattingStatsFromLogs(0, [], [], [sf]);
    // sac fly is NOT an AB
    expect(result["p3"].atBats).toBe(0);
    // sac fly counts as sacFlies
    expect(result["p3"].sacFlies).toBe(1);
    // batter earns 1 RBI
    expect(result["p3"].rbi).toBe(1);
  });

  it("sacrifice fly uses explicit rbi field when provided", () => {
    const sf = makeSacFlyOut(0, 1, "p1", 2);
    const result = computeBattingStatsFromLogs(0, [], [], [sf]);
    expect(result["p1"].sacFlies).toBe(1);
    expect(result["p1"].rbi).toBe(2);
    expect(result["p1"].atBats).toBe(0);
  });

  it("mix of regular out and sac fly for same batter: only non-sac out counts as AB", () => {
    const regularOut = makeStrikeout(0, 1, "p1");
    const sf = makeSacFlyOut(0, 1, "p1", 1);
    const result = computeBattingStatsFromLogs(0, [], [regularOut], [regularOut, sf]);
    // 1 regular out → AB=1; 1 sac fly → sacFlies=1; both → PA=2
    expect(result["p1"].atBats).toBe(1);
    expect(result["p1"].sacFlies).toBe(1);
    expect(result["p1"].strikeouts).toBe(1);
    expect(result["p1"].rbi).toBe(1);
  });
});
