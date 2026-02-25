import { describe, expect, it } from "vitest";

import {
  HITTER_STAT_CAP,
  hitterStatTotal,
  PITCHER_STAT_CAP,
  pitcherStatTotal,
} from "../statBudget";
import { generateDefaultCustomTeamDraft, makeAbbreviation } from "./generateDefaultTeam";

describe("generateDefaultCustomTeamDraft", () => {
  it("same seed produces same output (determinism)", () => {
    const a = generateDefaultCustomTeamDraft("abc123");
    const b = generateDefaultCustomTeamDraft("abc123");
    expect(a).toEqual(b);
  });

  it("different seeds produce different city or player names", () => {
    const a = generateDefaultCustomTeamDraft("seed1");
    const b = generateDefaultCustomTeamDraft("seed2");
    const aFirstPlayer = a.roster.lineup[0].name;
    const bFirstPlayer = b.roster.lineup[0].name;
    expect(a.city !== b.city || aFirstPlayer !== bFirstPlayer).toBe(true);
  });

  it("output has correct roster shape: 9 lineup, 2 bench, 3 pitchers", () => {
    const draft = generateDefaultCustomTeamDraft(42);
    expect(draft.roster.lineup).toHaveLength(9);
    expect(draft.roster.bench).toHaveLength(2);
    expect(draft.roster.pitchers).toHaveLength(3);
  });

  it("batter batting stats are in [20, 50]", () => {
    const draft = generateDefaultCustomTeamDraft("testbatters");
    const allBatters = [...draft.roster.lineup, ...draft.roster.bench];
    for (const p of allBatters) {
      expect(p.batting.contact).toBeGreaterThanOrEqual(20);
      expect(p.batting.contact).toBeLessThanOrEqual(50);
      expect(p.batting.power).toBeGreaterThanOrEqual(20);
      expect(p.batting.power).toBeLessThanOrEqual(50);
      expect(p.batting.speed).toBeGreaterThanOrEqual(20);
      expect(p.batting.speed).toBeLessThanOrEqual(50);
    }
  });

  it("pitcher batting stats are in [20, 50]", () => {
    const draft = generateDefaultCustomTeamDraft("testpitchers");
    for (const p of draft.roster.pitchers) {
      expect(p.batting.contact).toBeGreaterThanOrEqual(20);
      expect(p.batting.contact).toBeLessThanOrEqual(50);
      expect(p.batting.power).toBeGreaterThanOrEqual(20);
      expect(p.batting.power).toBeLessThanOrEqual(50);
      expect(p.batting.speed).toBeGreaterThanOrEqual(20);
      expect(p.batting.speed).toBeLessThanOrEqual(50);
    }
  });

  it("all player IDs are unique within a draft", () => {
    const draft = generateDefaultCustomTeamDraft("uniqueids");
    const ids = [
      ...draft.roster.lineup.map((p) => p.id),
      ...draft.roster.bench.map((p) => p.id),
      ...draft.roster.pitchers.map((p) => p.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pitchers have pitching stats", () => {
    const draft = generateDefaultCustomTeamDraft("pitchingstats");
    for (const p of draft.roster.pitchers) {
      expect(p.pitching).toBeDefined();
      expect(p.pitching!.velocity).toBeGreaterThanOrEqual(25);
      expect(p.pitching!.velocity).toBeLessThanOrEqual(53);
      expect(p.pitching!.control).toBeGreaterThanOrEqual(25);
      expect(p.pitching!.control).toBeLessThanOrEqual(53);
      expect(p.pitching!.movement).toBeGreaterThanOrEqual(25);
      expect(p.pitching!.movement).toBeLessThanOrEqual(53);
    }
  });

  it("generated hitter stat total does not exceed HITTER_STAT_CAP", () => {
    const draft = generateDefaultCustomTeamDraft("cap-check-hitters");
    const allBatters = [...draft.roster.lineup, ...draft.roster.bench];
    for (const p of allBatters) {
      const total = hitterStatTotal(p.batting.contact, p.batting.power, p.batting.speed);
      expect(total).toBeLessThanOrEqual(HITTER_STAT_CAP);
    }
  });

  it("generated pitcher pitching stat total does not exceed PITCHER_STAT_CAP", () => {
    const draft = generateDefaultCustomTeamDraft("cap-check-pitchers");
    for (const p of draft.roster.pitchers) {
      expect(p.pitching).toBeDefined();
      const total = pitcherStatTotal(
        p.pitching!.velocity,
        p.pitching!.control,
        p.pitching!.movement,
      );
      expect(total).toBeLessThanOrEqual(PITCHER_STAT_CAP);
    }
  });

  it("lineup players have positions from the standard batting position set", () => {
    const draft = generateDefaultCustomTeamDraft("positions-test");
    const validPositions = new Set(["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]);
    for (const p of draft.roster.lineup) {
      expect(p.position).toBeDefined();
      expect(validPositions.has(p.position!)).toBe(true);
    }
  });

  it("lineup positions cover all 8 required field positions (C 1B 2B 3B SS LF CF RF)", () => {
    const draft = generateDefaultCustomTeamDraft("required-positions");
    const positions = new Set(draft.roster.lineup.map((p) => p.position));
    const required = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    for (const pos of required) {
      expect(positions.has(pos)).toBe(true);
    }
  });

  it("pitcher positions are SP or RP", () => {
    const draft = generateDefaultCustomTeamDraft("pitcher-positions");
    for (const p of draft.roster.pitchers) {
      expect(["SP", "RP"]).toContain(p.position);
    }
    // First pitcher is SP
    expect(draft.roster.pitchers[0].position).toBe("SP");
  });

  it("all players have a handedness value of R, L, or S", () => {
    const draft = generateDefaultCustomTeamDraft("handedness-test");
    const all = [...draft.roster.lineup, ...draft.roster.bench, ...draft.roster.pitchers];
    for (const p of all) {
      expect(["R", "L", "S"]).toContain(p.handedness);
    }
  });

  it("generated team satisfies required-position validation via editorStateToCreateInput", () => {
    // Import validateEditorState indirectly by checking positions are present
    const draft = generateDefaultCustomTeamDraft("validation-compat");
    const positions = draft.roster.lineup.map((p) => p.position);
    const required = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    for (const pos of required) {
      expect(positions).toContain(pos);
    }
  });

  it("generates a valid 2–3 char abbreviation", () => {
    const draft = generateDefaultCustomTeamDraft("abbrev-test");
    expect(typeof draft.abbreviation).toBe("string");
    expect(draft.abbreviation.length).toBeGreaterThanOrEqual(2);
    expect(draft.abbreviation.length).toBeLessThanOrEqual(3);
  });

  it("generates the same abbreviation deterministically for the same seed", () => {
    const a = generateDefaultCustomTeamDraft("abbrev-det");
    const b = generateDefaultCustomTeamDraft("abbrev-det");
    expect(a.abbreviation).toBe(b.abbreviation);
  });
});

describe("makeAbbreviation", () => {
  it("single-word city: first 2 letters of city + first letter of nickname", () => {
    expect(makeAbbreviation("Austin", "Eagles")).toBe("AUE");
  });

  it("two-word city: first letter of each word + first letter of nickname", () => {
    expect(makeAbbreviation("New York", "Eagles")).toBe("NYE");
  });

  it("three-word city: first letter of each of the first 3 words", () => {
    expect(makeAbbreviation("San Jose West", "Dragons")).toBe("SJW");
  });

  it("result is uppercase", () => {
    const result = makeAbbreviation("boston", "eagles");
    expect(result).toBe(result.toUpperCase());
  });
});

describe("generateDefaultCustomTeamDraft — seed variability", () => {
  it("timestamp-based seeds (simulating different page loads) produce different teams", () => {
    // Simulate two different page loads by using different timestamp-derived seeds.
    // This matches how _generateCounter is initialized in CustomTeamEditor.
    const seed1 = Date.now() | 0;
    const seed2 = (Date.now() + 1000) | 0; // 1 second later
    const a = generateDefaultCustomTeamDraft(seed1);
    const b = generateDefaultCustomTeamDraft(seed2);
    // Very likely to differ on city or first player name
    const differ =
      a.city !== b.city || a.roster.lineup[0].name !== b.roster.lineup[0].name || a.name !== b.name;
    expect(differ).toBe(true);
  });

  it("consecutive counter increments produce distinct outputs", () => {
    // Simulates clicking Generate Random multiple times in one session.
    let counter = Date.now() | 0;
    const drafts = Array.from({ length: 5 }, () => generateDefaultCustomTeamDraft(++counter));
    // All city+nickname combos should not all be the same
    const combos = new Set(drafts.map((d) => `${d.city}-${d.name}`));
    expect(combos.size).toBeGreaterThan(1);
  });

  it("batting order (position sequence) is not always fixed to standard positional order", () => {
    // Generate a batch of teams with different seeds; the first batting slot should
    // not always be "C" (which would indicate a fixed positional order).
    const seeds = [1, 2, 3, 4, 5, 100, 200, 300, 400, 500];
    const firstPositions = seeds.map(
      (s) => generateDefaultCustomTeamDraft(s).roster.lineup[0].position,
    );
    // If batting order were fixed, all first positions would be "C".
    // With shuffling, there should be at least 2 distinct first positions across 10 seeds.
    const unique = new Set(firstPositions);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("same seed produces the same shuffled batting order (deterministic)", () => {
    const a = generateDefaultCustomTeamDraft("shuffle-det");
    const b = generateDefaultCustomTeamDraft("shuffle-det");
    const aOrder = a.roster.lineup.map((p) => p.position);
    const bOrder = b.roster.lineup.map((p) => p.position);
    expect(aOrder).toEqual(bOrder);
  });

  it("different seeds produce different batting orders", () => {
    // Use numeric seeds to avoid string-parsing collisions in seedToNumber.
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const orders = seeds.map((s) =>
      generateDefaultCustomTeamDraft(s)
        .roster.lineup.map((p) => p.position)
        .join(","),
    );
    const unique = new Set(orders);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("all 9 required positions still present after shuffle", () => {
    // Required positions must not be lost during the shuffle.
    const required = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
    for (const seed of [1, 2, 3, 42, 999]) {
      const draft = generateDefaultCustomTeamDraft(seed);
      const positions = draft.roster.lineup.map((p) => p.position);
      for (const pos of required) {
        expect(positions).toContain(pos);
      }
    }
  });
});
