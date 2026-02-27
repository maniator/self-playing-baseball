import { describe, expect, it } from "vitest";

import {
  buildTeamFingerprint,
  exportCustomTeams,
  importCustomTeams,
  parseExportedCustomTeams,
} from "./customTeamExportImport";
import type { CustomTeamDoc } from "./types";

const makeTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc => ({
  id: `ct_test_${Math.random().toString(36).slice(2, 8)}`,
  schemaVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  name: "Test Team",
  source: "custom",
  roster: {
    schemaVersion: 1,
    lineup: [
      {
        id: `p_${Math.random().toString(36).slice(2, 8)}`,
        name: "Alice",
        role: "batter",
        batting: { contact: 70, power: 60, speed: 50 },
      },
    ],
    bench: [],
    pitchers: [],
  },
  metadata: { archived: false },
  ...overrides,
});

describe("buildTeamFingerprint", () => {
  it("returns a hex string", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is stable across calls", () => {
    const team = makeTeam({ id: "ct_stable", name: "StableTeam" });
    expect(buildTeamFingerprint(team)).toBe(buildTeamFingerprint(team));
  });

  it("does not depend on team id", () => {
    const team1 = makeTeam({ id: "ct_aaa", name: "X" });
    const team2 = { ...team1, id: "ct_bbb" };
    expect(buildTeamFingerprint(team1)).toBe(buildTeamFingerprint(team2));
  });

  it("differs when name changes", () => {
    const base = makeTeam({ name: "Alpha" });
    const changed = { ...base, name: "Beta" };
    expect(buildTeamFingerprint(base)).not.toBe(buildTeamFingerprint(changed));
  });

  it("differs when abbreviation changes", () => {
    const base = makeTeam({ abbreviation: "AA" });
    const changed = { ...base, abbreviation: "BB" };
    expect(buildTeamFingerprint(base)).not.toBe(buildTeamFingerprint(changed));
  });

  it("is case-insensitive for name and abbreviation", () => {
    const lower = makeTeam({ name: "team", abbreviation: "tm" });
    const upper = { ...lower, name: "TEAM", abbreviation: "TM" };
    expect(buildTeamFingerprint(lower)).toBe(buildTeamFingerprint(upper));
  });
});

describe("exportCustomTeams", () => {
  it("produces a parseable JSON string", () => {
    const team = makeTeam();
    const json = exportCustomTeams([team]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes the expected top-level fields", () => {
    const json = exportCustomTeams([makeTeam()]);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("customTeams");
    expect(parsed.formatVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(Array.isArray(parsed.payload.teams)).toBe(true);
  });

  it("serialises all provided teams", () => {
    const t1 = makeTeam({ name: "T1" });
    const t2 = makeTeam({ name: "T2" });
    const json = exportCustomTeams([t1, t2]);
    const parsed = JSON.parse(json);
    expect(parsed.payload.teams).toHaveLength(2);
  });

  it("produces a round-trippable bundle", () => {
    const team = makeTeam({ name: "Round Trip" });
    const json = exportCustomTeams([team]);
    const result = parseExportedCustomTeams(json);
    expect(result.payload.teams[0].name).toBe("Round Trip");
  });
});

describe("parseExportedCustomTeams", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseExportedCustomTeams("not json")).toThrow("Invalid JSON");
  });

  it("throws when type is wrong", () => {
    const bad = JSON.stringify({ type: "saves", formatVersion: 1, payload: { teams: [] } });
    expect(() => parseExportedCustomTeams(bad)).toThrow('expected type "customTeams"');
  });

  it("throws on unsupported formatVersion", () => {
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 99, payload: { teams: [] } });
    expect(() => parseExportedCustomTeams(bad)).toThrow("Unsupported custom teams format version");
  });

  it("throws when payload is missing", () => {
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1 });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing payload");
  });

  it("throws when teams is not an array", () => {
    const bad = JSON.stringify({
      type: "customTeams",
      formatVersion: 1,
      payload: { teams: "oops" },
    });
    expect(() => parseExportedCustomTeams(bad)).toThrow("must be an array");
  });

  it("throws when a team is missing required id", () => {
    const team = { name: "No ID", source: "custom", roster: { lineup: [{ id: "p1" }] } };
    const bad = JSON.stringify({
      type: "customTeams",
      formatVersion: 1,
      payload: { teams: [team] },
    });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing required field: id");
  });

  it("throws when a team has an empty lineup", () => {
    const team = { id: "ct1", name: "T", source: "custom", roster: { lineup: [] } };
    const bad = JSON.stringify({
      type: "customTeams",
      formatVersion: 1,
      payload: { teams: [team] },
    });
    expect(() => parseExportedCustomTeams(bad)).toThrow("non-empty array");
  });

  it("parses a valid bundle successfully", () => {
    const json = exportCustomTeams([makeTeam({ name: "Valid" })]);
    const result = parseExportedCustomTeams(json);
    expect(result.type).toBe("customTeams");
    expect(result.payload.teams[0].name).toBe("Valid");
  });
});

describe("importCustomTeams", () => {
  it("imports teams with no collisions", () => {
    const team = makeTeam({ id: "ct_unique", name: "New Team" });
    const json = exportCustomTeams([team]);
    const result = importCustomTeams(json, []);
    expect(result.teams).toHaveLength(1);
    expect(result.created).toBe(1);
    expect(result.remapped).toBe(0);
  });

  it("remaps team id on collision", () => {
    const existing = makeTeam({ id: "ct_clash" });
    const incoming = makeTeam({ id: "ct_clash", name: "Incoming" });
    const json = exportCustomTeams([incoming]);
    const result = importCustomTeams(json, [existing], { makeTeamId: () => "ct_new_id" });
    expect(result.remapped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.teams[0].id).toBe("ct_new_id");
  });

  it("remaps player ids on collision", () => {
    const sharedPlayerId = "p_shared";
    const existing = makeTeam({
      id: "ct_existing",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: sharedPlayerId,
            name: "Existing Player",
            role: "batter",
            batting: { contact: 70, power: 60, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
    });
    const incoming = makeTeam({
      id: "ct_different",
      name: "Incoming",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: sharedPlayerId,
            name: "Incoming Player",
            role: "batter",
            batting: { contact: 80, power: 70, speed: 60 },
          },
        ],
        bench: [],
        pitchers: [],
      },
    });
    const json = exportCustomTeams([incoming]);
    let counter = 0;
    const result = importCustomTeams(json, [existing], {
      makePlayerId: () => `p_remapped_${counter++}`,
    });
    expect(result.remapped).toBe(1);
    expect(result.teams[0].roster.lineup[0].id).not.toBe(sharedPlayerId);
  });

  it("counts team as created when no IDs collide", () => {
    const t1 = makeTeam({ id: "ct_a", name: "A" });
    const t2 = makeTeam({ id: "ct_b", name: "B" });
    const json = exportCustomTeams([t1, t2]);
    const result = importCustomTeams(json, []);
    expect(result.created).toBe(2);
    expect(result.remapped).toBe(0);
  });

  it("emits duplicate warning for matching fingerprint", () => {
    const team = makeTeam({ id: "ct_orig", name: "Dupes" });
    const existing = { ...team, id: "ct_existing", fingerprint: buildTeamFingerprint(team) };
    const json = exportCustomTeams([team]);
    const result = importCustomTeams(json, [existing], { makeTeamId: () => "ct_new" });
    expect(result.duplicateWarnings.length).toBeGreaterThan(0);
    expect(result.duplicateWarnings[0]).toMatch(/Dupes/);
  });

  it("attaches fingerprint to each output team", () => {
    const team = makeTeam();
    const json = exportCustomTeams([team]);
    const result = importCustomTeams(json, []);
    expect(typeof result.teams[0].fingerprint).toBe("string");
    expect(result.teams[0].fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles mixed created + remapped teams", () => {
    const fresh = makeTeam({ id: "ct_fresh", name: "Fresh" });
    const collision = makeTeam({ id: "ct_col", name: "Collision" });
    const existing = makeTeam({ id: "ct_col" });
    const json = exportCustomTeams([fresh, collision]);
    let n = 0;
    const result = importCustomTeams(json, [existing], { makeTeamId: () => `ct_gen_${n++}` });
    expect(result.created).toBe(1);
    expect(result.remapped).toBe(1);
  });

  it("throws on malformed JSON", () => {
    expect(() => importCustomTeams("bad", [])).toThrow("Invalid JSON");
  });
});
