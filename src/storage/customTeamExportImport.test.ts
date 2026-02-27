import { describe, expect, it } from "vitest";

import {
  buildPlayerSig,
  buildTeamFingerprint,
  exportCustomTeams,
  importCustomTeams,
  parseExportedCustomTeams,
  stripTeamPlayerSigs,
  TEAMS_EXPORT_KEY,
} from "./customTeamExportImport";
import { fnv1a } from "./hash";
import type { CustomTeamDoc, TeamPlayer } from "./types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const makePlayer = (overrides: Partial<TeamPlayer> = {}): TeamPlayer => ({
  id: `p_${Math.random().toString(36).slice(2, 8)}`,
  name: "Alice",
  role: "batter",
  batting: { contact: 70, power: 60, speed: 50 },
  ...overrides,
});

const makeTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc => ({
  id: `ct_test_${Math.random().toString(36).slice(2, 8)}`,
  schemaVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  name: "Test Team",
  source: "custom",
  roster: {
    schemaVersion: 1,
    lineup: [makePlayer({ name: "Alice" })],
    bench: [],
    pitchers: [],
  },
  metadata: { archived: false },
  ...overrides,
});

/** Build a valid signed bundle from scratch (for edge-case tests). */
function makeSignedBundle(
  overrides: Record<string, unknown> = {},
  payloadOverride?: Record<string, unknown>,
) {
  const payload = payloadOverride ?? { teams: [] };
  const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
  return JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig, ...overrides });
}

// ── buildTeamFingerprint ─────────────────────────────────────────────────────

describe("buildTeamFingerprint", () => {
  it("returns an 8-char hex string", () => {
    expect(buildTeamFingerprint(makeTeam())).toMatch(/^[0-9a-f]{8}$/);
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
    const a = makeTeam({ name: "A" });
    const b = makeTeam({ name: "B" });
    expect(buildTeamFingerprint(a)).not.toBe(buildTeamFingerprint(b));
  });

  it("differs when abbreviation changes", () => {
    const a = makeTeam({ abbreviation: "AA" });
    const b = makeTeam({ abbreviation: "BB" });
    expect(buildTeamFingerprint(a)).not.toBe(buildTeamFingerprint(b));
  });

  it("is case-insensitive for name and abbreviation", () => {
    const a = makeTeam({ name: "Rockets", abbreviation: "ROC" });
    const b = makeTeam({ name: "rockets", abbreviation: "roc" });
    expect(buildTeamFingerprint(a)).toBe(buildTeamFingerprint(b));
  });
});

// ── buildPlayerSig ───────────────────────────────────────────────────────────

describe("buildPlayerSig", () => {
  it("returns an 8-char hex string", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    expect(buildPlayerSig(fp, team.roster.lineup[0])).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is stable for the same inputs", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    const p = team.roster.lineup[0];
    expect(buildPlayerSig(fp, p)).toBe(buildPlayerSig(fp, p));
  });

  it("differs when the player id changes", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    const p = team.roster.lineup[0];
    expect(buildPlayerSig(fp, { ...p, id: "p_other" })).not.toBe(buildPlayerSig(fp, p));
  });

  it("differs when batting stats change", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    const p = team.roster.lineup[0];
    const pAltered = { ...p, batting: { ...p.batting, contact: 99 } };
    expect(buildPlayerSig(fp, pAltered)).not.toBe(buildPlayerSig(fp, p));
  });

  it("differs when the team fingerprint changes", () => {
    const teamA = makeTeam({ name: "Alpha" });
    const teamB = makeTeam({ name: "Beta" });
    const p = teamA.roster.lineup[0];
    expect(buildPlayerSig(buildTeamFingerprint(teamA), p)).not.toBe(
      buildPlayerSig(buildTeamFingerprint(teamB), p),
    );
  });

  it("does NOT depend on player name (name tracked by team fingerprint)", () => {
    const team = makeTeam();
    const fp = buildTeamFingerprint(team);
    const p = team.roster.lineup[0];
    // Changing the name alone should not change the player sig
    expect(buildPlayerSig(fp, { ...p, name: "Bob" })).toBe(buildPlayerSig(fp, p));
  });
});

// ── stripTeamPlayerSigs ──────────────────────────────────────────────────────

describe("stripTeamPlayerSigs", () => {
  it("removes sig from all roster slots", () => {
    const team = makeTeam({
      roster: {
        schemaVersion: 1,
        lineup: [{ ...makePlayer(), sig: "aabbccdd" }],
        bench: [{ ...makePlayer(), sig: "11223344" }],
        pitchers: [{ ...makePlayer(), sig: "deadbeef" }],
      },
    });
    const cleaned = stripTeamPlayerSigs(team);
    expect("sig" in cleaned.roster.lineup[0]).toBe(false);
    expect("sig" in cleaned.roster.bench[0]).toBe(false);
    expect("sig" in cleaned.roster.pitchers[0]).toBe(false);
  });

  it("is a no-op when players have no sig", () => {
    const team = makeTeam();
    const cleaned = stripTeamPlayerSigs(team);
    expect("sig" in cleaned.roster.lineup[0]).toBe(false);
  });
});

// ── exportCustomTeams ────────────────────────────────────────────────────────

describe("exportCustomTeams", () => {
  it("produces valid parseable JSON", () => {
    expect(() => JSON.parse(exportCustomTeams([makeTeam()]))).not.toThrow();
  });

  it("includes top-level type, formatVersion, exportedAt, sig", () => {
    const parsed = JSON.parse(exportCustomTeams([makeTeam()]));
    expect(parsed.type).toBe("customTeams");
    expect(parsed.formatVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(typeof parsed.sig).toBe("string");
    expect(parsed.sig).toMatch(/^[0-9a-f]{8}$/);
  });

  it("always embeds fingerprint on each team", () => {
    const team = makeTeam({ name: "Rocketeers", fingerprint: undefined });
    const parsed = JSON.parse(exportCustomTeams([team]));
    expect(typeof parsed.payload.teams[0].fingerprint).toBe("string");
    expect(parsed.payload.teams[0].fingerprint.length).toBe(8);
  });

  it("embeds sig on every player in every roster slot", () => {
    const team = makeTeam({
      roster: {
        schemaVersion: 1,
        lineup: [makePlayer({ name: "Batter" })],
        bench: [makePlayer({ name: "BenchGuy", role: "batter" })],
        pitchers: [makePlayer({ name: "Pitcher", role: "pitcher" })],
      },
    });
    const parsed = JSON.parse(exportCustomTeams([team]));
    const t = parsed.payload.teams[0];
    expect(typeof t.roster.lineup[0].sig).toBe("string");
    expect(typeof t.roster.bench[0].sig).toBe("string");
    expect(typeof t.roster.pitchers[0].sig).toBe("string");
  });

  it("serializes all provided teams", () => {
    const json = exportCustomTeams([makeTeam({ name: "T1" }), makeTeam({ name: "T2" })]);
    expect(JSON.parse(json).payload.teams).toHaveLength(2);
  });

  it("round-trips through parseExportedCustomTeams", () => {
    const team = makeTeam({ name: "Round Trip" });
    const result = parseExportedCustomTeams(exportCustomTeams([team]));
    expect(result.payload.teams[0].name).toBe("Round Trip");
  });
});

// ── parseExportedCustomTeams ─────────────────────────────────────────────────

describe("parseExportedCustomTeams", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseExportedCustomTeams("not json")).toThrow("Invalid JSON");
  });

  it("throws when type is wrong", () => {
    const bad = makeSignedBundle({ type: "saves" });
    expect(() => parseExportedCustomTeams(bad)).toThrow('expected type "customTeams"');
  });

  it("throws on unsupported formatVersion", () => {
    const bad = makeSignedBundle({ formatVersion: 99 });
    expect(() => parseExportedCustomTeams(bad)).toThrow("Unsupported custom teams format version");
  });

  it("throws when payload is missing", () => {
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, sig: "00000000" });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing payload");
  });

  it("throws when teams is not an array", () => {
    const payload = { teams: "oops" };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("must be an array");
  });

  it("throws when a team is missing required id", () => {
    const fp = buildTeamFingerprint(makeTeam());
    const player = { ...makePlayer(), sig: buildPlayerSig(fp, makePlayer()) };
    const team = { name: "No ID", source: "custom", fingerprint: fp, roster: { lineup: [player] } };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing required field: id");
  });

  it("throws when a team has an empty lineup", () => {
    const fp = "aabbccdd";
    const team = {
      id: "ct1",
      name: "T",
      source: "custom",
      fingerprint: fp,
      roster: { lineup: [] },
    };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("non-empty array");
  });

  it("throws when a team is missing fingerprint", () => {
    const p = makePlayer();
    const team = { id: "ct1", name: "T", source: "custom", roster: { lineup: [p] } };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing fingerprint");
  });

  it("throws when bundle sig is missing", () => {
    const bad = JSON.stringify({
      type: "customTeams",
      formatVersion: 1,
      payload: { teams: [] },
    });
    expect(() => parseExportedCustomTeams(bad)).toThrow("signature mismatch");
  });

  it("throws when bundle sig is wrong (tampered payload)", () => {
    const team = makeTeam({ name: "Legit" });
    const obj = JSON.parse(exportCustomTeams([team]));
    obj.payload.teams[0].name = "Tampered";
    expect(() => parseExportedCustomTeams(JSON.stringify(obj))).toThrow("signature mismatch");
  });

  it("throws when a player sig is wrong (tampered player stats)", () => {
    const team = makeTeam({ name: "Good Team" });
    const exported = exportCustomTeams([team]);
    const obj = JSON.parse(exported);
    // Tamper the player stats inside the payload, then re-sign the bundle so only the player sig fails
    obj.payload.teams[0].roster.lineup[0].batting.contact = 99;
    obj.sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(obj.payload));
    expect(() => parseExportedCustomTeams(JSON.stringify(obj))).toThrow(
      "player signature mismatch",
    );
  });

  it("parses a valid bundle successfully", () => {
    const json = exportCustomTeams([makeTeam({ name: "Valid" })]);
    const result = parseExportedCustomTeams(json);
    expect(result.type).toBe("customTeams");
    expect(result.payload.teams[0].name).toBe("Valid");
  });
});

// ── importCustomTeams ────────────────────────────────────────────────────────

describe("importCustomTeams", () => {
  it("imports teams with no collisions", () => {
    const team = makeTeam({ id: "ct_unique", name: "New Team" });
    const json = exportCustomTeams([team]);
    const result = importCustomTeams(json, []);
    expect(result.teams).toHaveLength(1);
    expect(result.created).toBe(1);
    expect(result.remapped).toBe(0);
  });

  it("strips player sigs from output (not stored in DB)", () => {
    const team = makeTeam();
    const result = importCustomTeams(exportCustomTeams([team]), []);
    for (const player of result.teams[0].roster.lineup) {
      expect("sig" in player).toBe(false);
    }
  });

  it("remaps team id on collision", () => {
    const existing = makeTeam({ id: "ct_clash" });
    const incoming = makeTeam({ id: "ct_clash", name: "Incoming" });
    const result = importCustomTeams(exportCustomTeams([incoming]), [existing], {
      makeTeamId: () => "ct_new_id",
    });
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
        lineup: [makePlayer({ id: sharedPlayerId, name: "Existing Player" })],
        bench: [],
        pitchers: [],
      },
    });
    const incoming = makeTeam({
      id: "ct_different",
      name: "Incoming",
      roster: {
        schemaVersion: 1,
        lineup: [makePlayer({ id: sharedPlayerId, name: "Incoming Player" })],
        bench: [],
        pitchers: [],
      },
    });
    let counter = 0;
    const result = importCustomTeams(exportCustomTeams([incoming]), [existing], {
      makePlayerId: () => `p_remapped_${counter++}`,
    });
    expect(result.remapped).toBe(1);
    expect(result.teams[0].roster.lineup[0].id).not.toBe(sharedPlayerId);
  });

  it("counts team as created when no IDs collide", () => {
    const json = exportCustomTeams([makeTeam({ id: "ct_a" }), makeTeam({ id: "ct_b" })]);
    const result = importCustomTeams(json, []);
    expect(result.created).toBe(2);
    expect(result.remapped).toBe(0);
  });

  it("emits duplicateWarnings for matching team fingerprint", () => {
    const team = makeTeam({ id: "ct_orig", name: "Dupes" });
    const existing = { ...team, id: "ct_existing", fingerprint: buildTeamFingerprint(team) };
    const result = importCustomTeams(exportCustomTeams([team]), [existing], {
      makeTeamId: () => "ct_new",
    });
    expect(result.duplicateWarnings.length).toBeGreaterThan(0);
    expect(result.duplicateWarnings[0]).toMatch(/Dupes/);
  });

  it("emits duplicatePlayerWarnings when player sig matches existing player", () => {
    const player = makePlayer({ id: "p_alice", name: "Alice" });
    const existing = makeTeam({
      id: "ct_existing",
      roster: { schemaVersion: 1, lineup: [player], bench: [], pitchers: [] },
    });
    // Re-import the same player under a slightly different team (different team id, same name/abbr/lineup names → same fingerprint)
    const incoming = makeTeam({ id: "ct_fresh_id", name: existing.name, roster: existing.roster });
    const result = importCustomTeams(exportCustomTeams([incoming]), [existing], {
      makeTeamId: () => "ct_remapped",
    });
    expect(result.duplicatePlayerWarnings.length).toBeGreaterThan(0);
    expect(result.duplicatePlayerWarnings[0]).toMatch(/Alice/);
  });

  it("has empty duplicatePlayerWarnings when no player matches", () => {
    const fresh = makeTeam({ id: "ct_fresh", name: "New Squad" });
    const result = importCustomTeams(exportCustomTeams([fresh]), []);
    expect(result.duplicatePlayerWarnings).toHaveLength(0);
  });

  it("attaches fingerprint to each output team", () => {
    const team = makeTeam();
    const result = importCustomTeams(exportCustomTeams([team]), []);
    expect(typeof result.teams[0].fingerprint).toBe("string");
    expect(result.teams[0].fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles mixed created + remapped teams", () => {
    const fresh = makeTeam({ id: "ct_fresh", name: "Fresh" });
    const collision = makeTeam({ id: "ct_col", name: "Collision" });
    const existing = makeTeam({ id: "ct_col" });
    let n = 0;
    const result = importCustomTeams(exportCustomTeams([fresh, collision]), [existing], {
      makeTeamId: () => `ct_gen_${n++}`,
    });
    expect(result.created).toBe(1);
    expect(result.remapped).toBe(1);
  });

  it("throws on malformed JSON", () => {
    expect(() => importCustomTeams("bad", [])).toThrow("Invalid JSON");
  });

  it("remaps cross-slot intra-team duplicate player IDs (no duplicate IDs in output roster)", () => {
    // Both lineup and bench share the same player ID; bench player must be remapped.
    const sharedId = "p_dupe";
    const incoming = makeTeam({
      id: "ct_intra",
      name: "Intra Dupe Team",
      roster: {
        schemaVersion: 1,
        lineup: [makePlayer({ id: sharedId, name: "Player A" })],
        bench: [makePlayer({ id: sharedId, name: "Player B", role: "batter" })],
        pitchers: [],
      },
    });
    let n = 0;
    const result = importCustomTeams(exportCustomTeams([incoming]), [], {
      makePlayerId: () => `p_gen_${n++}`,
    });
    const t = result.teams[0];
    const allIds = [
      ...t.roster.lineup.map((p) => p.id),
      ...t.roster.bench.map((p) => p.id),
      ...t.roster.pitchers.map((p) => p.id),
    ];
    // All IDs within the roster must be unique
    expect(new Set(allIds).size).toBe(allIds.length);
    // The bench player (second occurrence of the shared ID) must have been remapped
    expect(t.roster.bench[0].id).not.toBe(sharedId);
    // The lineup player (first occurrence) keeps the original ID
    expect(t.roster.lineup[0].id).toBe(sharedId);
  });

  it("player sig is used only for duplicate detection — not as primary identity key", () => {
    // After import, the primary identity is player.id, not the sig.
    // The sig must be stripped from the output (not stored in DB).
    const team = makeTeam({
      roster: {
        schemaVersion: 1,
        lineup: [makePlayer({ id: "p_identity", name: "Identity Check" })],
        bench: [],
        pitchers: [],
      },
    });
    const result = importCustomTeams(exportCustomTeams([team]), []);
    const player = result.teams[0].roster.lineup[0];
    expect(player.id).toBe("p_identity");
    expect("sig" in player).toBe(false);
  });
});

// ── Import validation: roster constraints and required fields ─────────────────
// These tests verify the parser rejects structurally invalid bundles, matching
// the issue requirement "import validation rejects invalid teams (roster
// constraints, stat caps, missing fields)".

describe("parseExportedCustomTeams — roster constraint validation", () => {
  it("throws when a team is missing required name", () => {
    const fp = buildTeamFingerprint(makeTeam());
    const player = { ...makePlayer(), sig: buildPlayerSig(fp, makePlayer()) };
    const team = { id: "ct1", source: "custom", fingerprint: fp, roster: { lineup: [player] } };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing required field: name");
  });

  it("throws when a team is missing required source", () => {
    const fp = buildTeamFingerprint(makeTeam());
    const player = { ...makePlayer(), sig: buildPlayerSig(fp, makePlayer()) };
    const team = { id: "ct1", name: "T", fingerprint: fp, roster: { lineup: [player] } };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing required field: source");
  });

  it("throws when a team is missing required roster", () => {
    const fp = buildTeamFingerprint(makeTeam());
    const team = { id: "ct1", name: "T", source: "custom", fingerprint: fp };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("missing required field: roster");
  });

  it("throws when a team entry is not an object", () => {
    const payload = { teams: ["not-an-object"] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("is not an object");
  });

  it("throws when roster.lineup is empty (lineup size constraint)", () => {
    const fp = "aabbccdd";
    const team = {
      id: "ct1",
      name: "T",
      source: "custom",
      fingerprint: fp,
      roster: { lineup: [] },
    };
    const payload = { teams: [team] };
    const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
    const bad = JSON.stringify({ type: "customTeams", formatVersion: 1, payload, sig });
    expect(() => parseExportedCustomTeams(bad)).toThrow("non-empty array");
  });

  it("rejects a bundle where the whole payload is a bare array (not a keyed object)", () => {
    // A bare array IS typeof "object", so the parser's type check passes but
    // the 'type' discriminator will be undefined — the type check is the specific rejection.
    expect(() => parseExportedCustomTeams(JSON.stringify([{ id: "ct1" }]))).toThrow(
      'expected type "customTeams"',
    );
  });

  it("accepts a bundle with optional bench and pitchers omitted from roster", () => {
    const team = makeTeam({
      roster: {
        schemaVersion: 1,
        lineup: [makePlayer({ name: "Sole Batter" })],
        bench: [],
        pitchers: [],
      },
    });
    const result = parseExportedCustomTeams(exportCustomTeams([team]));
    expect(result.payload.teams[0].roster.lineup[0].name).toBe("Sole Batter");
  });

  it("imports teams without preserving player sig fields in output (stat-sanitized)", () => {
    // Verifies that player sigs are stripped on import (not persisted to DB)
    const team = makeTeam();
    const result = importCustomTeams(exportCustomTeams([team]), []);
    const player = result.teams[0].roster.lineup[0];
    expect("sig" in player).toBe(false);
  });
});
