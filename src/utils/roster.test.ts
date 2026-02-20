import { describe, expect, it } from "vitest";

import { generateRoster } from "./roster";

describe("generateRoster", () => {
  it("returns 9 batters and 1 pitcher", () => {
    const roster = generateRoster("New York Yankees");
    expect(roster.batters).toHaveLength(9);
    expect(roster.pitcher.isPitcher).toBe(true);
  });

  it("batters are not pitchers", () => {
    const { batters } = generateRoster("Boston Red Sox");
    batters.forEach((b) => expect(b.isPitcher).toBe(false));
  });

  it("generates stable unique IDs for each player", () => {
    const roster = generateRoster("New York Yankees");
    const ids = [roster.pitcher, ...roster.batters].map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("IDs differ between teams", () => {
    const yank = generateRoster("New York Yankees");
    const mets = generateRoster("New York Mets");
    expect(yank.batters[0].id).not.toBe(mets.batters[0].id);
    expect(yank.pitcher.id).not.toBe(mets.pitcher.id);
  });

  it("is deterministic — same team produces same IDs on repeated calls", () => {
    const a = generateRoster("Atlanta Braves");
    const b = generateRoster("Atlanta Braves");
    expect(a.batters.map((p) => p.id)).toEqual(b.batters.map((p) => p.id));
    expect(a.pitcher.id).toBe(b.pitcher.id);
  });

  it("first batter position is C (catcher)", () => {
    const { batters } = generateRoster("Los Angeles Dodgers");
    expect(batters[0].position).toBe("C");
    expect(batters[0].name).toBe("Catcher");
  });

  it("last batter position is DH", () => {
    const { batters } = generateRoster("Los Angeles Dodgers");
    expect(batters[8].position).toBe("DH");
  });

  it("pitcher position is SP", () => {
    const { pitcher } = generateRoster("Los Angeles Dodgers");
    expect(pitcher.position).toBe("SP");
  });

  it("handles team names with special characters in slug", () => {
    const roster = generateRoster("St. Louis Cardinals");
    expect(roster.batters[0].id).toMatch(/^st_louis_cardinals_b0$/);
  });

  it("handles empty string team name without throwing", () => {
    expect(() => generateRoster("")).not.toThrow();
  });
});
