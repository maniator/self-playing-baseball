/**
 * Unit tests for computePitcherGameStats:
 *   - IP display formatting (formatIP)
 *   - ERA and WHIP computation (with IP=0 guard)
 *   - SV/HLD/BS rules for deterministic scenarios
 */
import { describe, expect, it } from "vitest";

import type { PitcherLogEntry } from "@context/index";

import {
  computeERA,
  computePitcherGameStats,
  computeWHIP,
  formatIP,
} from "./computePitcherGameStats";

const makePitcherEntry = (overrides: Partial<PitcherLogEntry> = {}): PitcherLogEntry => ({
  teamIdx: 0,
  pitcherId: "pitcher1",
  inningEntered: 1,
  halfEntered: 0,
  scoreOnEntry: [0, 0],
  outsPitched: 0,
  battersFaced: 0,
  hitsAllowed: 0,
  walksAllowed: 0,
  strikeoutsRecorded: 0,
  runsAllowed: 0,
  homersAllowed: 0,
  ...overrides,
});

describe("formatIP", () => {
  it("0 outs → 0.0", () => {
    expect(formatIP(0)).toBe("0.0");
  });

  it("3 outs → 1.0", () => {
    expect(formatIP(3)).toBe("1.0");
  });

  it("9 outs → 3.0", () => {
    expect(formatIP(9)).toBe("3.0");
  });

  it("27 outs → 9.0", () => {
    expect(formatIP(27)).toBe("9.0");
  });

  it("7 outs → 2.1", () => {
    expect(formatIP(7)).toBe("2.1");
  });

  it("8 outs → 2.2", () => {
    expect(formatIP(8)).toBe("2.2");
  });

  it("10 outs → 3.1", () => {
    expect(formatIP(10)).toBe("3.1");
  });
});

describe("computeERA", () => {
  it("returns null when outsPitched is 0", () => {
    expect(computeERA(0, 0)).toBeNull();
    expect(computeERA(3, 0)).toBeNull();
  });

  it("returns 0 ERA for 0 earned runs over 9 outs (3 IP)", () => {
    expect(computeERA(0, 9)).toBe(0);
  });

  it("computes ERA for 3 ER in 27 outs (9 IP) → 3.00", () => {
    const era = computeERA(3, 27);
    expect(era).toBeCloseTo(3.0, 5);
  });

  it("computes ERA for 1 ER in 3 outs (1 IP) → 9.00", () => {
    const era = computeERA(1, 3);
    expect(era).toBeCloseTo(9.0, 5);
  });

  it("computes ERA for 2 ER in 6 outs (2 IP) → 9.00", () => {
    const era = computeERA(2, 6);
    expect(era).toBeCloseTo(9.0, 5);
  });
});

describe("computeWHIP", () => {
  it("returns null when outsPitched is 0", () => {
    expect(computeWHIP(0, 0, 0)).toBeNull();
    expect(computeWHIP(2, 1, 0)).toBeNull();
  });

  it("returns 0 WHIP for 0 BB and 0 H over 9 outs", () => {
    expect(computeWHIP(0, 0, 9)).toBe(0);
  });

  it("computes WHIP: 3 BB + 3 H over 9 outs (3 IP) → 2.00", () => {
    const whip = computeWHIP(3, 3, 9);
    expect(whip).toBeCloseTo(2.0, 5);
  });

  it("computes WHIP: 1 BB + 1 H over 3 outs (1 IP) → 2.00", () => {
    const whip = computeWHIP(1, 1, 3);
    expect(whip).toBeCloseTo(2.0, 5);
  });

  it("computes WHIP: 0 BB + 3 H over 9 outs (3 IP) → 1.00", () => {
    const whip = computeWHIP(0, 3, 9);
    expect(whip).toBeCloseTo(1.0, 5);
  });
});

describe("computePitcherGameStats — SV/HLD/BS rules", () => {
  it("awards no saves when there are no pitcher entries", () => {
    const result = computePitcherGameStats([[], []], [3, 1]);
    expect(result).toHaveLength(0);
  });

  it("awards a save to the winning team's finishing pitcher who pitched 3+ outs with lead ≤ 3", () => {
    // Home team won 3-1. Their starter went 6 innings (18 outs) with lead, no run surrendered.
    // A reliever (closer) came in with 3-1 lead and pitched 3 outs.
    const awayPitcher = makePitcherEntry({
      teamIdx: 0,
      pitcherId: "away_starter",
      outsPitched: 27,
      scoreOnEntry: [0, 0],
      runsAllowed: 1,
    });
    const homeStarter = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_starter",
      outsPitched: 18,
      scoreOnEntry: [0, 0],
      runsAllowed: 0,
    });
    const homeCloser = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_closer",
      outsPitched: 9,
      scoreOnEntry: [1, 3], // 3-1 lead (home leads by 2)
      runsAllowed: 0,
    });

    const result = computePitcherGameStats([[awayPitcher], [homeStarter, homeCloser]], [1, 3]);

    const closer = result.find((r) => r.result.pitcherId === "home_closer");
    expect(closer?.result.saves).toBe(1);
    expect(closer?.result.holds).toBe(0);
    expect(closer?.result.blownSaves).toBe(0);

    // Starter did NOT get a save (they're not the finisher).
    const starter = result.find((r) => r.result.pitcherId === "home_starter");
    expect(starter?.result.saves).toBe(0);
  });

  it("does NOT award a save when the winning pitcher pitched < 3 outs", () => {
    // Home wins 3-1. Closer pitched only 2 outs.
    const homeStarter = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_starter",
      outsPitched: 24,
      scoreOnEntry: [0, 0],
      runsAllowed: 1,
    });
    const homeCloser = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_closer",
      outsPitched: 2,
      scoreOnEntry: [1, 3],
      runsAllowed: 0,
    });

    const result = computePitcherGameStats([[], [homeStarter, homeCloser]], [1, 3]);
    const closer = result.find((r) => r.result.pitcherId === "home_closer");
    // Gets a hold instead (left with lead intact but <3 outs)
    expect(closer?.result.saves).toBe(0);
    expect(closer?.result.holds).toBe(1);
  });

  it("awards a blown save to a pitcher who gave up the tying run in a save situation", () => {
    // Closer entered with 3-1 lead, gave up 2 runs (tied the game).
    const homeStarter = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_starter",
      outsPitched: 21,
      scoreOnEntry: [0, 0],
      runsAllowed: 1,
    });
    const homeCloser = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_closer",
      outsPitched: 6,
      scoreOnEntry: [1, 3], // 2-run lead
      runsAllowed: 2, // gave up 2 → tied game 3-3
    });

    // Game ended 3-3 (tie, or away won later)
    const result = computePitcherGameStats([[], [homeStarter, homeCloser]], [3, 3]);
    const closer = result.find((r) => r.result.pitcherId === "home_closer");
    expect(closer?.result.blownSaves).toBe(1);
    expect(closer?.result.saves).toBe(0);
    expect(closer?.result.holds).toBe(0);
  });

  it("awards a hold to a relief pitcher who enters with lead ≤ 3 and exits with lead intact", () => {
    // 3 pitchers for home team. Closer is the finisher.
    const homeP1 = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_starter",
      outsPitched: 15,
      scoreOnEntry: [0, 0],
      runsAllowed: 0,
    });
    const homeP2 = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_setup",
      outsPitched: 9,
      scoreOnEntry: [0, 3], // 3-0 lead — save situation
      runsAllowed: 0,
    });
    const homeP3 = makePitcherEntry({
      teamIdx: 1,
      pitcherId: "home_closer",
      outsPitched: 3,
      scoreOnEntry: [0, 3], // still 3-0 lead
      runsAllowed: 0,
    });

    const result = computePitcherGameStats([[], [homeP1, homeP2, homeP3]], [0, 3]);
    const setup = result.find((r) => r.result.pitcherId === "home_setup");
    expect(setup?.result.holds).toBe(1);
    expect(setup?.result.saves).toBe(0);

    const closer = result.find((r) => r.result.pitcherId === "home_closer");
    expect(closer?.result.saves).toBe(1);
  });

  it("accumulates correct counting stats into result rows", () => {
    const p = makePitcherEntry({
      teamIdx: 0,
      pitcherId: "pitcher1",
      outsPitched: 18,
      battersFaced: 22,
      hitsAllowed: 5,
      walksAllowed: 2,
      strikeoutsRecorded: 7,
      homersAllowed: 1,
      runsAllowed: 3,
      scoreOnEntry: [0, 0],
    });

    const result = computePitcherGameStats([[p], []], [3, 2]);
    expect(result).toHaveLength(1);
    const r = result[0].result;
    expect(r.outsPitched).toBe(18);
    expect(r.battersFaced).toBe(22);
    expect(r.hitsAllowed).toBe(5);
    expect(r.walksAllowed).toBe(2);
    expect(r.strikeoutsRecorded).toBe(7);
    expect(r.homersAllowed).toBe(1);
    expect(r.runsAllowed).toBe(3);
    expect(r.earnedRuns).toBe(3); // v1: earnedRuns = runsAllowed
  });

  it("merges stats when the same pitcher has multiple stints (logged twice)", () => {
    // A pitcher who was removed and brought back — two PitcherLogEntry rows for same pitcherId.
    const firstStint = makePitcherEntry({
      teamIdx: 0,
      pitcherId: "fireman",
      outsPitched: 6,
      hitsAllowed: 2,
      walksAllowed: 1,
      strikeoutsRecorded: 3,
      runsAllowed: 1,
      homersAllowed: 0,
      battersFaced: 9,
      scoreOnEntry: [0, 0],
    });
    const secondStint = makePitcherEntry({
      teamIdx: 0,
      pitcherId: "fireman",
      outsPitched: 3,
      hitsAllowed: 1,
      walksAllowed: 0,
      strikeoutsRecorded: 2,
      runsAllowed: 0,
      homersAllowed: 0,
      battersFaced: 4,
      scoreOnEntry: [1, 2],
    });

    // Two stints for the same pitcher; one placeholder for the opponent.
    const result = computePitcherGameStats([[firstStint, secondStint], []], [1, 2]);
    // Should produce one merged result row for "fireman".
    const fireman = result.find((r) => r.result.pitcherId === "fireman");
    expect(fireman).toBeDefined();
    expect(fireman!.result.outsPitched).toBe(9); // 6 + 3
    expect(fireman!.result.hitsAllowed).toBe(3); // 2 + 1
    expect(fireman!.result.walksAllowed).toBe(1); // 1 + 0
    expect(fireman!.result.strikeoutsRecorded).toBe(5); // 3 + 2
    expect(fireman!.result.runsAllowed).toBe(1); // 1 + 0
    expect(fireman!.result.battersFaced).toBe(13); // 9 + 4
  });
});
