import { describe, expect, it } from "vitest";

import type { TeamPlayer } from "@storage/types";

import {
  buildRoster,
  clampStat,
  requireNonEmpty,
  ROSTER_SCHEMA_VERSION,
  sanitizeAbbreviation,
  sanitizePlayer,
  STAT_MAX,
  STAT_MIN,
} from "./customTeamSanitizers";

const makePlayer = (overrides: Partial<TeamPlayer> = {}): TeamPlayer => ({
  id: "p1",
  name: "Test Player",
  role: "batter",
  batting: { contact: 70, power: 60, speed: 50 },
  ...overrides,
});

describe("constants", () => {
  it("STAT_MIN is 0", () => expect(STAT_MIN).toBe(0));
  it("STAT_MAX is 100", () => expect(STAT_MAX).toBe(100));
  it("ROSTER_SCHEMA_VERSION is 1", () => expect(ROSTER_SCHEMA_VERSION).toBe(1));
});

describe("requireNonEmpty", () => {
  it("returns trimmed string for valid input", () => {
    expect(requireNonEmpty("  hello  ", "field")).toBe("hello");
  });

  it("throws on empty string", () => {
    expect(() => requireNonEmpty("", "myField")).toThrow("myField must be a non-empty string");
  });

  it("throws on whitespace-only string", () => {
    expect(() => requireNonEmpty("   ", "myField")).toThrow("myField must be a non-empty string");
  });

  it("throws on non-string", () => {
    expect(() => requireNonEmpty(42, "myField")).toThrow("myField must be a non-empty string");
    expect(() => requireNonEmpty(null, "myField")).toThrow("myField must be a non-empty string");
    expect(() => requireNonEmpty(undefined, "myField")).toThrow(
      "myField must be a non-empty string",
    );
  });
});

describe("sanitizeAbbreviation", () => {
  it("trims and uppercases valid abbreviation", () => {
    expect(sanitizeAbbreviation("  ny  ")).toBe("NY");
  });

  it("accepts 2-character abbreviation", () => {
    expect(sanitizeAbbreviation("SF")).toBe("SF");
  });

  it("accepts 3-character abbreviation", () => {
    expect(sanitizeAbbreviation("BOS")).toBe("BOS");
  });

  it("throws on 1-character abbreviation", () => {
    expect(() => sanitizeAbbreviation("A")).toThrow(
      'abbreviation must be 2–3 characters (got "A")',
    );
  });

  it("throws on 4-character abbreviation", () => {
    expect(() => sanitizeAbbreviation("LONG")).toThrow(
      'abbreviation must be 2–3 characters (got "LONG")',
    );
  });
});

describe("clampStat", () => {
  it("clamps values below STAT_MIN to 0", () => {
    expect(clampStat(-10)).toBe(0);
    expect(clampStat(-1)).toBe(0);
  });

  it("clamps values above STAT_MAX to 100", () => {
    expect(clampStat(101)).toBe(100);
    expect(clampStat(999)).toBe(100);
  });

  it("passes through in-range values", () => {
    expect(clampStat(0)).toBe(0);
    expect(clampStat(50)).toBe(50);
    expect(clampStat(100)).toBe(100);
  });
});

describe("sanitizePlayer", () => {
  it("trims player name", () => {
    const result = sanitizePlayer(makePlayer({ name: "  John Doe  " }), 0);
    expect(result.name).toBe("John Doe");
  });

  it("throws on empty player name", () => {
    expect(() => sanitizePlayer(makePlayer({ name: "" }), 0)).toThrow(
      "roster player[0].name must be a non-empty string",
    );
  });

  it("throws on invalid role", () => {
    // @ts-expect-error testing invalid role
    expect(() => sanitizePlayer(makePlayer({ role: "fielder" }), 2)).toThrow(
      'roster player[2].role must be "batter", "pitcher", or "two-way"',
    );
  });

  it("throws when batting is missing", () => {
    // @ts-expect-error testing missing batting
    expect(() => sanitizePlayer(makePlayer({ batting: null }), 0)).toThrow(
      "roster player[0].batting is required",
    );
  });

  it("clamps batting stats", () => {
    const result = sanitizePlayer(
      makePlayer({ batting: { contact: 150, power: -5, speed: 50 } }),
      0,
    );
    expect(result.batting.contact).toBe(100);
    expect(result.batting.power).toBe(0);
    expect(result.batting.speed).toBe(50);
  });

  it("generates playerSeed when not provided", () => {
    const result = sanitizePlayer(makePlayer(), 0);
    expect(typeof result.playerSeed).toBe("string");
    expect(result.playerSeed!.length).toBeGreaterThan(0);
  });

  it("preserves existing playerSeed", () => {
    const result = sanitizePlayer(makePlayer({ playerSeed: "fixed-seed-123" }), 0);
    expect(result.playerSeed).toBe("fixed-seed-123");
  });

  it("generates globalPlayerId when not provided", () => {
    const result = sanitizePlayer(makePlayer(), 0);
    expect(typeof result.globalPlayerId).toBe("string");
    expect(result.globalPlayerId!.startsWith("pl_")).toBe(true);
  });

  it("preserves existing globalPlayerId", () => {
    const result = sanitizePlayer(makePlayer({ globalPlayerId: "pl_existing" }), 0);
    expect(result.globalPlayerId).toBe("pl_existing");
  });

  it("generates fingerprint", () => {
    const result = sanitizePlayer(makePlayer(), 0);
    expect(typeof result.fingerprint).toBe("string");
    expect(result.fingerprint!.length).toBeGreaterThan(0);
  });

  it("clamps pitching stats when present", () => {
    const result = sanitizePlayer(
      makePlayer({
        role: "pitcher",
        pitching: { velocity: 200, control: -10, movement: 75 },
      }),
      0,
    );
    expect(result.pitching!.velocity).toBe(100);
    expect(result.pitching!.control).toBe(0);
    expect(result.pitching!.movement).toBe(75);
  });

  it("omits pitching when not provided", () => {
    const result = sanitizePlayer(makePlayer({ role: "batter" }), 0);
    expect(result.pitching).toBeUndefined();
  });

  it("accepts two-way role", () => {
    const result = sanitizePlayer(
      makePlayer({ role: "two-way", pitching: { velocity: 80, control: 70, movement: 60 } }),
      0,
    );
    expect(result.role).toBe("two-way");
  });
});

describe("buildRoster", () => {
  it("returns roster with schemaVersion", () => {
    const result = buildRoster({ lineup: [makePlayer()] });
    expect(result.schemaVersion).toBe(ROSTER_SCHEMA_VERSION);
  });

  it("throws when lineup is empty", () => {
    expect(() => buildRoster({ lineup: [] })).toThrow("roster.lineup must have at least 1 player");
  });

  it("throws when lineup is not an array", () => {
    // @ts-expect-error testing invalid input
    expect(() => buildRoster({ lineup: null })).toThrow(
      "roster.lineup must have at least 1 player",
    );
  });

  it("sanitizes all players in lineup", () => {
    const result = buildRoster({
      lineup: [makePlayer({ name: "  Alice  " }), makePlayer({ name: "Bob" })],
    });
    expect(result.lineup[0].name).toBe("Alice");
    expect(result.lineup[1].name).toBe("Bob");
  });

  it("defaults bench and pitchers to empty when omitted", () => {
    const result = buildRoster({ lineup: [makePlayer()] });
    expect(result.bench).toEqual([]);
    expect(result.pitchers).toEqual([]);
  });

  it("sanitizes bench players", () => {
    const result = buildRoster({
      lineup: [makePlayer()],
      bench: [makePlayer({ batting: { contact: 200, power: 50, speed: 50 } })],
    });
    expect(result.bench[0].batting.contact).toBe(100);
  });

  it("sanitizes pitchers", () => {
    const result = buildRoster({
      lineup: [makePlayer()],
      pitchers: [
        makePlayer({ role: "pitcher", pitching: { velocity: 80, control: 70, movement: 60 } }),
      ],
    });
    expect(result.pitchers.length).toBe(1);
    expect(result.pitchers[0].role).toBe("pitcher");
  });
});
