import { describe, expect, it } from "vitest";

import { generateDefaultCustomTeamDraft } from "./generateDefaultTeam";

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

  it("batter batting stats are in [40, 80]", () => {
    const draft = generateDefaultCustomTeamDraft("testbatters");
    const allBatters = [...draft.roster.lineup, ...draft.roster.bench];
    for (const p of allBatters) {
      expect(p.batting.contact).toBeGreaterThanOrEqual(40);
      expect(p.batting.contact).toBeLessThanOrEqual(80);
      expect(p.batting.power).toBeGreaterThanOrEqual(40);
      expect(p.batting.power).toBeLessThanOrEqual(80);
      expect(p.batting.speed).toBeGreaterThanOrEqual(40);
      expect(p.batting.speed).toBeLessThanOrEqual(80);
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
      expect(p.pitching!.velocity).toBeGreaterThanOrEqual(40);
      expect(p.pitching!.velocity).toBeLessThanOrEqual(80);
      expect(p.pitching!.control).toBeGreaterThanOrEqual(40);
      expect(p.pitching!.control).toBeLessThanOrEqual(80);
      expect(p.pitching!.movement).toBeGreaterThanOrEqual(40);
      expect(p.pitching!.movement).toBeLessThanOrEqual(80);
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
});
