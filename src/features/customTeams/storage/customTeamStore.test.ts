import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "@storage/db";
import type { CreateCustomTeamInput, TeamPlayer, UpdateCustomTeamInput } from "@storage/types";

import { exportCustomPlayer } from "./customTeamExportImport";
import { makeCustomTeamStore } from "./customTeamStore";

const makePlayer = (overrides: Partial<TeamPlayer> = {}): TeamPlayer => ({
  id: `player_${Math.random().toString(36).slice(2, 8)}`,
  name: "Test Player",
  role: "batter",
  batting: { contact: 50, power: 50, speed: 50 },
  ...overrides,
});

const makeInput = (overrides: Partial<CreateCustomTeamInput> = {}): CreateCustomTeamInput => ({
  name: "Test Team",
  roster: {
    lineup: [makePlayer()],
    bench: [],
    pitchers: [],
  },
  ...overrides,
});

let db: BallgameDb;
let store: ReturnType<typeof makeCustomTeamStore>;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
  store = makeCustomTeamStore(() => Promise.resolve(db));
});

afterEach(async () => {
  await db.close();
});

describe("createCustomTeam", () => {
  it("returns a string id", async () => {
    const id = await store.createCustomTeam(makeInput());
    expect(typeof id).toBe("string");
    expect(id).toBeTruthy();
  });

  it("persists a document with expected fields", async () => {
    const id = await store.createCustomTeam(
      makeInput({ name: "Rockets", city: "Houston", nickname: "Rox", slug: "rockets" }),
    );
    const doc = await db.customTeams.findOne(id).exec();
    expect(doc?.name).toBe("Rockets");
    expect(doc?.city).toBe("Houston");
    expect(doc?.nickname).toBe("Rox");
    expect(doc?.slug).toBe("rockets");
    expect(doc?.source).toBe("custom");
    expect(doc?.schemaVersion).toBe(1);
    expect(typeof doc?.createdAt).toBe("string");
    expect(typeof doc?.updatedAt).toBe("string");
  });

  it("uses provided id when given via meta", async () => {
    const id = await store.createCustomTeam(makeInput(), { id: "my-custom-id" });
    expect(id).toBe("my-custom-id");
    const doc = await db.customTeams.findOne("my-custom-id").exec();
    expect(doc).not.toBeNull();
  });

  it("defaults source to 'custom'", async () => {
    const id = await store.createCustomTeam(makeInput());
    const doc = await db.customTeams.findOne(id).exec();
    expect(doc?.source).toBe("custom");
  });

  it("accepts source 'generated'", async () => {
    const id = await store.createCustomTeam(makeInput({ source: "generated" }));
    const doc = await db.customTeams.findOne(id).exec();
    expect(doc?.source).toBe("generated");
  });

  it("trims team name whitespace", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "  Padres  " }));
    const doc = await db.customTeams.findOne(id).exec();
    expect(doc?.name).toBe("Padres");
  });

  it("throws on empty team name", async () => {
    await expect(store.createCustomTeam(makeInput({ name: "" }))).rejects.toThrow(
      "name must be a non-empty string",
    );
  });

  it("throws on whitespace-only team name", async () => {
    await expect(store.createCustomTeam(makeInput({ name: "   " }))).rejects.toThrow(
      "name must be a non-empty string",
    );
  });

  it("throws when lineup is empty", async () => {
    await expect(store.createCustomTeam(makeInput({ roster: { lineup: [] } }))).rejects.toThrow(
      "roster.lineup must have at least 1 player",
    );
  });

  it("clamps batting stats to 0–100", async () => {
    const player = makePlayer({
      batting: { contact: 150, power: -10, speed: 50 },
    });
    const id = await store.createCustomTeam(makeInput({ roster: { lineup: [player] } }));
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup[0].batting.contact).toBe(100);
    expect(team?.roster.lineup[0].batting.power).toBe(0);
    expect(team?.roster.lineup[0].batting.speed).toBe(50);
  });

  it("clamps pitching stats to 0–100", async () => {
    const player = makePlayer({
      role: "pitcher",
      pitching: { velocity: 200, control: -5, movement: 55 },
    });
    const id = await store.createCustomTeam(makeInput({ roster: { lineup: [player] } }));
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup[0].pitching?.velocity).toBe(100);
    expect(team?.roster.lineup[0].pitching?.control).toBe(0);
    expect(team?.roster.lineup[0].pitching?.movement).toBe(55);
  });

  it("throws when player name is empty", async () => {
    const player = makePlayer({ name: "" });
    await expect(
      store.createCustomTeam(makeInput({ roster: { lineup: [player] } })),
    ).rejects.toThrow("roster player[0].name must be a non-empty string");
  });

  it("throws on invalid player role", async () => {
    const player = makePlayer({ role: "invalid" as "batter" });
    await expect(
      store.createCustomTeam(makeInput({ roster: { lineup: [player] } })),
    ).rejects.toThrow('roster player[0].role must be "batter", "pitcher", or "two-way"');
  });

  it("stores bench and pitchers arrays", async () => {
    const bench = makePlayer({ name: "Bench Guy" });
    const pitcher = makePlayer({ name: "Pitcher Joe", role: "pitcher" });
    const id = await store.createCustomTeam(
      makeInput({ roster: { lineup: [makePlayer()], bench: [bench], pitchers: [pitcher] } }),
    );
    const team = await store.getCustomTeam(id);
    expect(team?.roster.bench).toHaveLength(1);
    expect(team?.roster.bench[0].name).toBe("Bench Guy");
    expect(team?.roster.pitchers).toHaveLength(1);
    expect(team?.roster.pitchers[0].name).toBe("Pitcher Joe");
  });

  it("stores roster schemaVersion", async () => {
    const id = await store.createCustomTeam(makeInput());
    const doc = await db.customTeams.findOne(id).exec();
    const stored = doc?.toJSON() as unknown as { roster: { schemaVersion: number } };
    expect(stored.roster.schemaVersion).toBe(1);
  });

  it("stores metadata fields", async () => {
    const id = await store.createCustomTeam(
      makeInput({ metadata: { notes: "note", tags: ["fast"], archived: false } }),
    );
    const doc = await db.customTeams.findOne(id).exec();
    const stored = doc?.toJSON() as unknown as { metadata: { notes: string; tags: string[] } };
    expect(stored.metadata.notes).toBe("note");
    expect(stored.metadata.tags).toEqual(["fast"]);
  });

  it("stores statsProfile when provided", async () => {
    const id = await store.createCustomTeam(makeInput({ statsProfile: "power" }));
    const doc = await db.customTeams.findOne(id).exec();
    expect(doc?.statsProfile).toBe("power");
  });

  it("uppercases and trims abbreviation on create", async () => {
    const id = await store.createCustomTeam(makeInput({ abbreviation: " sox " }));
    const team = await store.getCustomTeam(id);
    expect(team?.abbreviation).toBe("SOX");
  });

  it("throws when abbreviation is too short on create", async () => {
    await expect(store.createCustomTeam(makeInput({ abbreviation: "X" }))).rejects.toThrow(
      "abbreviation must be 2–3 characters",
    );
  });

  it("throws when abbreviation is too long on create", async () => {
    await expect(store.createCustomTeam(makeInput({ abbreviation: "WXYZ" }))).rejects.toThrow(
      "abbreviation must be 2–3 characters",
    );
  });
});

describe("getCustomTeam", () => {
  it("returns the team by id", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Falcons" }));
    const team = await store.getCustomTeam(id);
    expect(team?.name).toBe("Falcons");
  });

  it("returns null when not found", async () => {
    const team = await store.getCustomTeam("nonexistent");
    expect(team).toBeNull();
  });
});

describe("listCustomTeams", () => {
  it("returns all non-archived teams by default", async () => {
    await store.createCustomTeam(makeInput({ name: "Active Team" }));
    await store.createCustomTeam(
      makeInput({ name: "Archived Team", metadata: { archived: true } }),
    );
    const teams = await store.listCustomTeams();
    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe("Active Team");
  });

  it("returns archived teams when includeArchived is true", async () => {
    await store.createCustomTeam(makeInput({ name: "Active" }));
    await store.createCustomTeam(makeInput({ name: "Archived", metadata: { archived: true } }));
    const teams = await store.listCustomTeams({ includeArchived: true });
    expect(teams).toHaveLength(2);
  });

  it("returns empty array when no teams exist", async () => {
    const teams = await store.listCustomTeams();
    expect(teams).toEqual([]);
  });

  it("returns teams ordered by updatedAt descending", async () => {
    const id1 = await store.createCustomTeam(makeInput({ name: "First" }), {
      id: "ct_first",
    });
    const id2 = await store.createCustomTeam(makeInput({ name: "Second" }), {
      id: "ct_second",
    });
    // touch id1 so it has a newer updatedAt
    await store.updateCustomTeam(id1, { name: "First Updated" });
    const teams = await store.listCustomTeams();
    expect(teams[0].id).toBe(id1);
    expect(teams[1].id).toBe(id2);
  });
});

describe("updateCustomTeam", () => {
  it("updates name", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Old Name" }));
    await store.updateCustomTeam(id, { name: "New Name" });
    const team = await store.getCustomTeam(id);
    expect(team?.name).toBe("New Name");
  });

  it("trims updated name", async () => {
    const id = await store.createCustomTeam(makeInput());
    await store.updateCustomTeam(id, { name: "  Tigers  " });
    const team = await store.getCustomTeam(id);
    expect(team?.name).toBe("Tigers");
  });

  it("throws when team not found", async () => {
    await expect(store.updateCustomTeam("ghost", { name: "x" })).rejects.toThrow(
      "Custom team not found: ghost",
    );
  });

  it("throws on empty updated name", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.updateCustomTeam(id, { name: "" })).rejects.toThrow(
      "name must be a non-empty string",
    );
  });

  it("throws when renaming to a name already used by another team (case-insensitive)", async () => {
    await store.createCustomTeam(makeInput({ name: "Alpha" }));
    const id2 = await store.createCustomTeam(makeInput({ name: "Beta" }));
    await expect(store.updateCustomTeam(id2, { name: "alpha" })).rejects.toThrow(
      'A team named "Alpha" already exists',
    );
  });

  it("allows renaming a team to its own current name (no false duplicate error)", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Gamma" }));
    await expect(store.updateCustomTeam(id, { name: "Gamma" })).resolves.toBeUndefined();
  });

  it("updates optional fields", async () => {
    const id = await store.createCustomTeam(makeInput());
    await store.updateCustomTeam(id, {
      city: "Dallas",
      nickname: "Stars",
      slug: "stars",
      statsProfile: "speed",
    });
    const team = await store.getCustomTeam(id);
    expect(team?.city).toBe("Dallas");
    expect(team?.nickname).toBe("Stars");
    expect(team?.slug).toBe("stars");
    expect(team?.statsProfile).toBe("speed");
  });

  it("updates roster lineup", async () => {
    const id = await store.createCustomTeam(makeInput());
    const newPlayer = makePlayer({ name: "New Star" });
    await store.updateCustomTeam(id, { roster: { lineup: [newPlayer] } });
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup[0].name).toBe("New Star");
  });

  it("throws when updated lineup is empty", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.updateCustomTeam(id, { roster: { lineup: [] } })).rejects.toThrow(
      "roster.lineup must have at least 1 player",
    );
  });

  it("merges metadata", async () => {
    const id = await store.createCustomTeam(
      makeInput({ metadata: { notes: "original", archived: false } }),
    );
    await store.updateCustomTeam(id, { metadata: { notes: "updated" } });
    const team = await store.getCustomTeam(id);
    expect(team?.metadata.notes).toBe("updated");
    expect(team?.metadata.archived).toBe(false);
  });

  it("can archive a team via metadata update", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "To Archive" }));
    await store.updateCustomTeam(id, { metadata: { archived: true } });
    const allTeams = await store.listCustomTeams({ includeArchived: true });
    const archived = allTeams.find((t) => t.id === id);
    expect(archived?.metadata.archived).toBe(true);
    const active = await store.listCustomTeams();
    expect(active.find((t) => t.id === id)).toBeUndefined();
  });

  it("does not mutate caller input objects", async () => {
    const id = await store.createCustomTeam(makeInput());
    const updates: UpdateCustomTeamInput = { name: "  Clean  " };
    await store.updateCustomTeam(id, updates);
    // Caller's object should not be mutated
    expect(updates.name).toBe("  Clean  ");
  });

  it("uppercases and trims abbreviation on update", async () => {
    const id = await store.createCustomTeam(makeInput({ abbreviation: "NY" }));
    await store.updateCustomTeam(id, { abbreviation: " bos " });
    const team = await store.getCustomTeam(id);
    expect(team?.abbreviation).toBe("BOS");
  });

  it("throws when abbreviation is too short on update", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.updateCustomTeam(id, { abbreviation: "A" })).rejects.toThrow(
      "abbreviation must be 2–3 characters",
    );
  });

  it("throws when abbreviation is too long on update", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.updateCustomTeam(id, { abbreviation: "ABCD" })).rejects.toThrow(
      "abbreviation must be 2–3 characters",
    );
  });
});

describe("deleteCustomTeam", () => {
  it("removes the team document", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Doomed" }));
    await store.deleteCustomTeam(id);
    const team = await store.getCustomTeam(id);
    expect(team).toBeNull();
  });

  it("does not throw when deleting a non-existent team", async () => {
    await expect(store.deleteCustomTeam("nonexistent")).resolves.not.toThrow();
  });

  it("removes team from list", async () => {
    const id1 = await store.createCustomTeam(makeInput({ name: "Keep" }));
    const id2 = await store.createCustomTeam(makeInput({ name: "Delete Me" }));
    await store.deleteCustomTeam(id2);
    const teams = await store.listCustomTeams({ includeArchived: true });
    expect(teams.map((t) => t.id)).toContain(id1);
    expect(teams.map((t) => t.id)).not.toContain(id2);
  });
});

describe("createCustomTeam — fingerprint", () => {
  it("sets a fingerprint on create", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "FP Team" }));
    const team = await store.getCustomTeam(id);
    expect(team?.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("updateCustomTeam — fingerprint", () => {
  it("recomputes fingerprint when name changes", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Before" }));
    const before = await store.getCustomTeam(id);
    await store.updateCustomTeam(id, { name: "After" });
    const after = await store.getCustomTeam(id);
    expect(after?.fingerprint).not.toBe(before?.fingerprint);
  });

  it("does not change fingerprint when only metadata changes", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Meta Only" }));
    const before = await store.getCustomTeam(id);
    await store.updateCustomTeam(id, { metadata: { notes: "new note" } });
    const after = await store.getCustomTeam(id);
    expect(after?.fingerprint).toBe(before?.fingerprint);
  });
});

describe("exportCustomTeams", () => {
  it("exports all teams when no ids given", async () => {
    await store.createCustomTeam(makeInput({ name: "Export A" }));
    await store.createCustomTeam(makeInput({ name: "Export B" }));
    const json = await store.exportCustomTeams();
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("customTeams");
    expect(parsed.payload.teams).toHaveLength(2);
  });

  it("exports only specified ids", async () => {
    const id1 = await store.createCustomTeam(makeInput({ name: "One" }));
    await store.createCustomTeam(makeInput({ name: "Two" }));
    const json = await store.exportCustomTeams([id1]);
    const parsed = JSON.parse(json);
    expect(parsed.payload.teams).toHaveLength(1);
    expect(parsed.payload.teams[0].name).toBe("One");
  });
});

describe("importCustomTeams", () => {
  it("upserts incoming teams into the DB", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const teamA = {
      id: "ct_import_a",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Import A",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p_ia",
            name: "Player",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([teamA]);
    const result = await store.importCustomTeams(json);
    expect(result.created + result.remapped).toBe(1);
    const found = await store.getCustomTeam("ct_import_a");
    expect(found?.name).toBe("Import A");
  });

  it("returns ImportCustomTeamsResult", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const teamB = {
      id: "ct_import_b",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Import B",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p_ib",
            name: "Player",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([teamB]);
    const result = await store.importCustomTeams(json);
    expect(typeof result.created).toBe("number");
    expect(typeof result.remapped).toBe("number");
    expect(typeof result.skipped).toBe("number");
    expect(Array.isArray(result.duplicateWarnings)).toBe(true);
  });

  it("preserves globalPlayerId, playerSeed, and fingerprint when importing a team into a fresh DB", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const knownGid = "pl_identity_preserved_gid";
    const knownSeed = "known-identity-seed-value";
    const knownFingerprint = "aabbccdd";
    const teamWithIdentity = {
      id: "ct_identity_test",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Identity Team",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p_id_test",
            name: "Identity Player",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
            globalPlayerId: knownGid,
            playerSeed: knownSeed,
            fingerprint: knownFingerprint,
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };

    // Export from the original team
    const json = exportFn([teamWithIdentity]);

    // Import into a fresh in-memory DB (simulates a different install)
    const { _createTestDb } = await import("@storage/db");
    const { getRxStorageMemory } = await import("rxdb/plugins/storage-memory");
    const freshDb = await _createTestDb(getRxStorageMemory());
    const freshStore = makeCustomTeamStore(() => Promise.resolve(freshDb));

    try {
      const result = await freshStore.importCustomTeams(json);
      // importCustomTeams may remap the team ID — resolve by name instead
      const importedTeam = result.teams.find((t) => t.name === "Identity Team");
      expect(importedTeam).toBeDefined();
      const importedPlayer = importedTeam!.roster.lineup[0];
      expect(importedPlayer.globalPlayerId).toBe(knownGid);
      expect(importedPlayer.playerSeed).toBe(knownSeed);
      expect(importedPlayer.fingerprint).toBe(knownFingerprint);
    } finally {
      await freshDb.close();
    }
  });
});

describe("exportPlayer", () => {
  it("returns a valid signed player JSON string", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Export Test Team",
        roster: {
          lineup: [makePlayer({ id: "p_export", name: "Jane Doe" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const json = await store.exportPlayer(id, "p_export");
    const parsed = JSON.parse(json) as { type: string; payload: { player: { name: string } } };
    expect(parsed.type).toBe("customPlayer");
    expect(parsed.payload.player.name).toBe("Jane Doe");
  });

  it("throws when team not found", async () => {
    await expect(store.exportPlayer("ct_nonexistent", "p_any")).rejects.toThrow("Team not found");
  });

  it("throws when player not found within the team", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.exportPlayer(id, "p_missing")).rejects.toThrow("Player not found");
  });
});

describe("sanitizePlayer — fingerprint storage", () => {
  it("stores a fingerprint on each player when a team is created", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        roster: {
          lineup: [makePlayer({ id: "p_fp1", name: "Fingerprint Batter" })],
          bench: [],
          pitchers: [
            makePlayer({
              id: "p_fp2",
              name: "Fingerprint Pitcher",
              role: "pitcher",
              pitching: { velocity: 55, control: 55, movement: 50 },
            }),
          ],
        },
      }),
    );
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup[0].fingerprint).toBeTruthy();
    expect(team?.roster.pitchers[0].fingerprint).toBeTruthy();
  });

  it("fingerprint matches buildPlayerSig result", async () => {
    const { buildPlayerSig } = await import("./customTeamExportImport");
    const player = makePlayer({ id: "p_sig", name: "Sig Check" });
    const id = await store.createCustomTeam(
      makeInput({ roster: { lineup: [player], bench: [], pitchers: [] } }),
    );
    const team = await store.getCustomTeam(id);
    const stored = team?.roster.lineup[0];
    expect(stored?.fingerprint).toBe(buildPlayerSig(stored!));
  });
});

describe("createCustomTeam — name uniqueness", () => {
  it("throws when creating a team with the same name as an existing team", async () => {
    await store.createCustomTeam(makeInput({ name: "Duplicate Team" }));
    await expect(store.createCustomTeam(makeInput({ name: "Duplicate Team" }))).rejects.toThrow(
      "already exists",
    );
  });

  it("is case-insensitive for duplicate name check", async () => {
    await store.createCustomTeam(makeInput({ name: "Eagles" }));
    await expect(store.createCustomTeam(makeInput({ name: "eagles" }))).rejects.toThrow(
      "already exists",
    );
    await expect(store.createCustomTeam(makeInput({ name: "EAGLES" }))).rejects.toThrow(
      "already exists",
    );
  });

  it("allows two teams with different names", async () => {
    const id1 = await store.createCustomTeam(makeInput({ name: "Hawks" }));
    const id2 = await store.createCustomTeam(makeInput({ name: "Falcons" }));
    expect(id1).not.toBe(id2);
  });
});

describe("createCustomTeam — teamSeed", () => {
  it("sets a non-empty teamSeed on create", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Seeded Team" }));
    const team = await store.getCustomTeam(id);
    expect(typeof team?.teamSeed).toBe("string");
    expect(team!.teamSeed!.length).toBeGreaterThan(0);
  });

  it("generates a unique teamSeed for each team", async () => {
    const id1 = await store.createCustomTeam(makeInput({ name: "Seed Team 1" }));
    const id2 = await store.createCustomTeam(makeInput({ name: "Seed Team 2" }));
    const t1 = await store.getCustomTeam(id1);
    const t2 = await store.getCustomTeam(id2);
    expect(t1?.teamSeed).not.toBe(t2?.teamSeed);
  });
});

describe("createCustomTeam — playerSeed", () => {
  it("sets a non-empty playerSeed on each player when team is created", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Player Seed Team",
        roster: {
          lineup: [makePlayer({ id: "p_s1", name: "Seeded Batter" })],
          bench: [],
          pitchers: [
            makePlayer({
              id: "p_s2",
              name: "Seeded Pitcher",
              role: "pitcher",
              pitching: { velocity: 55, control: 55, movement: 50 },
            }),
          ],
        },
      }),
    );
    const team = await store.getCustomTeam(id);
    const batter = team?.roster.lineup[0];
    const pitcher = team?.roster.pitchers[0];
    expect(typeof batter?.playerSeed).toBe("string");
    expect(batter!.playerSeed!.length).toBeGreaterThan(0);
    expect(typeof pitcher?.playerSeed).toBe("string");
    expect(pitcher!.playerSeed!.length).toBeGreaterThan(0);
  });
});

describe("updateCustomTeam — teamSeed preservation", () => {
  it("preserves the original teamSeed after name update", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Preserve Seed" }));
    const before = await store.getCustomTeam(id);
    const originalSeed = before?.teamSeed;
    expect(originalSeed).toBeTruthy();

    await store.updateCustomTeam(id, { name: "Preserve Seed Renamed" });
    const after = await store.getCustomTeam(id);
    expect(after?.teamSeed).toBe(originalSeed);
  });

  it("preserves the original teamSeed after metadata-only update", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Meta Seed Team" }));
    const before = await store.getCustomTeam(id);
    const originalSeed = before?.teamSeed;

    await store.updateCustomTeam(id, { metadata: { notes: "updated notes" } });
    const after = await store.getCustomTeam(id);
    expect(after?.teamSeed).toBe(originalSeed);
  });
});

describe("players collection integration", () => {
  it("creates player docs in the players collection after createCustomTeam", async () => {
    const lineup = [makePlayer({ id: "p_l1", name: "Lineup One" })];
    const bench = [makePlayer({ id: "p_b1", name: "Bench One" })];
    const pitchers = [makePlayer({ id: "p_p1", name: "Pitcher One", role: "pitcher" })];
    const id = await store.createCustomTeam(
      makeInput({ name: "Players Test Team", roster: { lineup, bench, pitchers } }),
    );
    const playerDocs = await db.players.find({ selector: { teamId: id } }).exec();
    expect(playerDocs).toHaveLength(3);
    const sections = playerDocs.map((p) => p.section).sort();
    expect(sections).toEqual(["bench", "lineup", "pitchers"]);
    const lineupDoc = playerDocs.find((p) => p.section === "lineup");
    expect(lineupDoc?.name).toBe("Lineup One");
    expect(lineupDoc?.teamId).toBe(id);
    expect(lineupDoc?.orderIndex).toBe(0);
    const benchDoc = playerDocs.find((p) => p.section === "bench");
    expect(benchDoc?.name).toBe("Bench One");
    const pitcherDoc = playerDocs.find((p) => p.section === "pitchers");
    expect(pitcherDoc?.name).toBe("Pitcher One");
  });

  it("embedded roster in customTeams doc has empty arrays after createCustomTeam", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Empty Embedded Team",
        roster: { lineup: [makePlayer()], bench: [makePlayer({ name: "Bench" })], pitchers: [] },
      }),
    );
    const rawDoc = await db.customTeams.findOne(id).exec();
    const raw = rawDoc?.toJSON() as unknown as {
      roster: { lineup: unknown[]; bench: unknown[]; pitchers: unknown[] };
    };
    expect(raw.roster.lineup).toHaveLength(0);
    expect(raw.roster.bench).toHaveLength(0);
    expect(raw.roster.pitchers).toHaveLength(0);
  });

  it("getCustomTeam assembles roster from players collection", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Assembled Team",
        roster: {
          lineup: [
            makePlayer({ id: "pa1", name: "Batter A" }),
            makePlayer({ id: "pa2", name: "Batter B" }),
          ],
          bench: [makePlayer({ id: "pa3", name: "Bench C" })],
          pitchers: [makePlayer({ id: "pa4", name: "Pitcher D", role: "pitcher" })],
        },
      }),
    );
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup).toHaveLength(2);
    expect(team?.roster.lineup[0].name).toBe("Batter A");
    expect(team?.roster.lineup[1].name).toBe("Batter B");
    expect(team?.roster.bench).toHaveLength(1);
    expect(team?.roster.bench[0].name).toBe("Bench C");
    expect(team?.roster.pitchers).toHaveLength(1);
    expect(team?.roster.pitchers[0].name).toBe("Pitcher D");
  });

  it("updateCustomTeam replaces player docs when roster changes", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Roster Update Team",
        roster: {
          lineup: [makePlayer({ id: "old1", name: "Old Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    // Verify old player doc exists
    const oldDocs = await db.players.find({ selector: { teamId: id } }).exec();
    expect(oldDocs).toHaveLength(1);
    expect(oldDocs[0].name).toBe("Old Player");

    // Update roster
    await store.updateCustomTeam(id, {
      roster: { lineup: [makePlayer({ id: "new1", name: "New Player" })] },
    });

    // Old player docs should be gone, new ones should exist
    const newDocs = await db.players.find({ selector: { teamId: id } }).exec();
    expect(newDocs).toHaveLength(1);
    expect(newDocs[0].name).toBe("New Player");

    // Embedded roster arrays in customTeams doc must remain empty after update
    const rawDoc = await db.customTeams.findOne(id).exec();
    const raw = rawDoc?.toJSON() as unknown as {
      roster: { lineup: unknown[]; bench: unknown[]; pitchers: unknown[] };
    };
    expect(raw.roster.lineup).toHaveLength(0);
    expect(raw.roster.bench).toHaveLength(0);
    expect(raw.roster.pitchers).toHaveLength(0);
  });

  it("deleteCustomTeam removes all player docs for the team", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Delete Players Team",
        roster: {
          lineup: [makePlayer({ id: "dp1" }), makePlayer({ id: "dp2" })],
          bench: [makePlayer({ id: "dp3" })],
          pitchers: [],
        },
      }),
    );
    // Verify player docs exist before delete
    const beforeDocs = await db.players.find({ selector: { teamId: id } }).exec();
    expect(beforeDocs).toHaveLength(3);

    await store.deleteCustomTeam(id);

    // All player docs should be gone
    const afterDocs = await db.players.find({ selector: { teamId: id } }).exec();
    expect(afterDocs).toHaveLength(0);
  });

  it("importCustomTeams inserts player docs into the players collection", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const teamToImport = {
      id: "ct_import_players",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Import Players Team",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "imp_p1",
            name: "Imported Batter",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
          },
        ],
        bench: [
          {
            id: "imp_p2",
            name: "Imported Bench",
            role: "batter" as const,
            batting: { contact: 60, power: 50, speed: 40 },
          },
        ],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([teamToImport]);
    await store.importCustomTeams(json);

    const playerDocs = await db.players.find({ selector: { teamId: "ct_import_players" } }).exec();
    expect(playerDocs).toHaveLength(2);
    const sections = playerDocs.map((p) => p.section).sort();
    expect(sections).toEqual(["bench", "lineup"]);
  });

  it("importCustomTeams backfills globalPlayerId for legacy bundle players that lack the field", async () => {
    // Simulate the real-world case: fixture-teams.json was created before globalPlayerId
    // was added to sanitizePlayer. Players have playerSeed+fingerprint but no globalPlayerId.
    // The v4 players schema has required: ["globalPlayerId"], so without the backfill in
    // toPlayerDoc, bulkUpsert throws a validation error and the import fails entirely.
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const legacyTeam = {
      id: "ct_legacy_no_gpid",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Legacy No GlobalPlayerId",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "lgcy_p1",
            name: "Legacy Batter",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
            // Explicitly no globalPlayerId — simulates fixture-teams.json format
            playerSeed: "seed_legacy_p1",
            fingerprint: "aabbccdd",
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([legacyTeam]);
    // Should not throw even though the bundle player lacks globalPlayerId
    await store.importCustomTeams(json);
    const playerDocs = await db.players.find({ selector: { teamId: "ct_legacy_no_gpid" } }).exec();
    expect(playerDocs).toHaveLength(1);
    // globalPlayerId must be backfilled — it should be the fnv1a of playerSeed
    expect(playerDocs[0].globalPlayerId).toMatch(/^pl_[0-9a-f]{8}$/);
  });

  it("legacy team with embedded roster is backfilled into players collection on getCustomTeam", async () => {
    // Simulate a legacy team with embedded roster (no player docs in players collection)
    const legacyTeamDoc = {
      id: "ct_legacy_backfill",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Legacy Backfill Team",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "leg_p1",
            name: "Legacy Batter",
            role: "batter" as const,
            batting: { contact: 50, power: 50, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    // Insert directly into DB (bypassing the store) to simulate legacy data
    await db.customTeams.insert(legacyTeamDoc);

    // No player docs should exist yet
    const before = await db.players.find({ selector: { teamId: "ct_legacy_backfill" } }).exec();
    expect(before).toHaveLength(0);

    // getCustomTeam should backfill and return the roster
    const team = await store.getCustomTeam("ct_legacy_backfill");
    expect(team?.roster.lineup).toHaveLength(1);
    expect(team?.roster.lineup[0].name).toBe("Legacy Batter");

    // After backfill, player docs should now exist in the players collection
    const after = await db.players.find({ selector: { teamId: "ct_legacy_backfill" } }).exec();
    expect(after).toHaveLength(1);
    expect(after[0].section).toBe("lineup");
    expect(after[0].name).toBe("Legacy Batter");
    expect(after[0].orderIndex).toBe(0);
  });

  it("orderIndex is preserved correctly across sections", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Order Index Team",
        roster: {
          lineup: [
            makePlayer({ id: "oi_l0", name: "Lineup 0" }),
            makePlayer({ id: "oi_l1", name: "Lineup 1" }),
            makePlayer({ id: "oi_l2", name: "Lineup 2" }),
          ],
          bench: [
            makePlayer({ id: "oi_b0", name: "Bench 0" }),
            makePlayer({ id: "oi_b1", name: "Bench 1" }),
          ],
          pitchers: [makePlayer({ id: "oi_p0", name: "Pitcher 0", role: "pitcher" })],
        },
      }),
    );
    const team = await store.getCustomTeam(id);
    expect(team?.roster.lineup.map((p) => p.name)).toEqual(["Lineup 0", "Lineup 1", "Lineup 2"]);
    expect(team?.roster.bench.map((p) => p.name)).toEqual(["Bench 0", "Bench 1"]);
    expect(team?.roster.pitchers.map((p) => p.name)).toEqual(["Pitcher 0"]);
  });

  it("TeamPlayer fields (no teamId/section/orderIndex) are returned by getCustomTeam", async () => {
    const player = makePlayer({
      id: "tp_check",
      name: "Field Checker",
      role: "pitcher",
      pitching: { velocity: 60, control: 55, movement: 45 },
    });
    const id = await store.createCustomTeam(
      makeInput({
        name: "Field Check Team",
        roster: { lineup: [player], bench: [], pitchers: [] },
      }),
    );
    const team = await store.getCustomTeam(id);
    const returned = team?.roster.lineup[0] as unknown as Record<string, unknown>;
    expect(returned).toBeDefined();
    expect("teamId" in returned).toBe(false);
    expect("section" in returned).toBe(false);
    expect("orderIndex" in returned).toBe(false);
    // schemaVersion is a PlayerDoc-only field and must also be stripped
    expect("schemaVersion" in returned).toBe(false);
    expect(returned["name"]).toBe("Field Checker");
    expect(returned["role"]).toBe("pitcher");
  });
});

describe("deleteCustomTeam — cascade: false (free agents)", () => {
  it("detaches player docs when cascade is false", async () => {
    const player = makePlayer({ name: "Free Agent Fred" });
    const id = await store.createCustomTeam(
      makeInput({
        name: "Cascade-Off Team",
        roster: { lineup: [player], bench: [], pitchers: [] },
      }),
    );
    await store.deleteCustomTeam(id, { cascade: false });
    const freePlayers = await store.listFreePlayers();
    expect(freePlayers.some((p) => p.name === "Free Agent Fred")).toBe(true);
    expect(freePlayers.every((p) => p.teamId == null)).toBe(true);
  });

  it("removes team doc even when cascade is false", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Cascade-Off Check" }));
    await store.deleteCustomTeam(id, { cascade: false });
    const team = await store.getCustomTeam(id);
    expect(team).toBeNull();
  });

  it("cascade true (default) deletes player docs", async () => {
    const player = makePlayer({ name: "Cascade Delete Player" });
    const id = await store.createCustomTeam(
      makeInput({
        name: "Cascade-On Team",
        roster: { lineup: [player], bench: [], pitchers: [] },
      }),
    );
    await store.deleteCustomTeam(id);
    const freePlayers = await store.listFreePlayers();
    expect(freePlayers.some((p) => p.name === "Cascade Delete Player")).toBe(false);
  });
});

describe("listFreePlayers", () => {
  it("returns empty array when there are no free agents", async () => {
    const freePlayers = await store.listFreePlayers();
    expect(freePlayers).toEqual([]);
  });

  it("does not include players belonging to active teams", async () => {
    const player = makePlayer({ name: "Active Player" });
    await store.createCustomTeam(
      makeInput({ name: "Active Team", roster: { lineup: [player], bench: [], pitchers: [] } }),
    );
    const freePlayers = await store.listFreePlayers();
    expect(freePlayers).toHaveLength(0);
  });
});

// ── exportPlayer — identity fields in export bundle ───────────────────────────

describe("exportPlayer — identity fields", () => {
  it("exported JSON includes globalPlayerId for a created player", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Identity Export Team",
        roster: {
          lineup: [makePlayer({ id: "p_gid", name: "Global ID Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const json = await store.exportPlayer(id, "p_gid");
    const parsed = JSON.parse(json) as { payload: { player: Record<string, unknown> } };
    expect(typeof parsed.payload.player["globalPlayerId"]).toBe("string");
    expect((parsed.payload.player["globalPlayerId"] as string).length).toBeGreaterThan(0);
  });

  it("exported JSON includes playerSeed for a created player", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "PlayerSeed Export Team",
        roster: {
          lineup: [makePlayer({ id: "p_seed_export", name: "Seed Export Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const json = await store.exportPlayer(id, "p_seed_export");
    const parsed = JSON.parse(json) as { payload: { player: Record<string, unknown> } };
    expect(typeof parsed.payload.player["playerSeed"]).toBe("string");
    expect((parsed.payload.player["playerSeed"] as string).length).toBeGreaterThan(0);
  });

  it("exported JSON includes fingerprint for a created player", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Fingerprint Export Team",
        roster: {
          lineup: [makePlayer({ id: "p_fp_export", name: "Fingerprint Export Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const json = await store.exportPlayer(id, "p_fp_export");
    const parsed = JSON.parse(json) as { payload: { player: Record<string, unknown> } };
    expect(typeof parsed.payload.player["fingerprint"]).toBe("string");
    expect(parsed.payload.player["fingerprint"]).toMatch(/^[0-9a-f]{8}$/);
  });

  it("globalPlayerId is stable across export round-trips", async () => {
    const id = await store.createCustomTeam(
      makeInput({
        name: "Stable GID Team",
        roster: {
          lineup: [makePlayer({ id: "p_stable_gid", name: "Stable Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const json1 = await store.exportPlayer(id, "p_stable_gid");
    const json2 = await store.exportPlayer(id, "p_stable_gid");
    const gid1 = (JSON.parse(json1) as { payload: { player: { globalPlayerId?: string } } }).payload
      .player.globalPlayerId;
    const gid2 = (JSON.parse(json2) as { payload: { player: { globalPlayerId?: string } } }).payload
      .player.globalPlayerId;
    expect(gid1).toBe(gid2);
  });
});

// ── importPlayer ──────────────────────────────────────────────────────────────

describe("importPlayer", () => {
  it("adds the player to the target team's bench and returns success", async () => {
    const targetId = await store.createCustomTeam(
      makeInput({
        name: "Target Team",
        roster: {
          lineup: [makePlayer({ id: "p_existing", name: "Existing Batter" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    // Create a player in a separate team to export
    const sourceId = await store.createCustomTeam(
      makeInput({
        name: "Source Team",
        roster: {
          lineup: [makePlayer({ id: "p_src", name: "Import Me" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const sourceTeam = await store.getCustomTeam(sourceId);
    if (!sourceTeam) throw new Error("Source team not found in test setup");
    const playerJson = exportCustomPlayer(sourceTeam.roster.lineup[0]);

    // Remove from source team first so no cross-team conflict
    await store.updateCustomTeam(sourceId, {
      roster: {
        lineup: [makePlayer({ id: "p_src_other", name: "Other Batter" })],
        bench: [],
        pitchers: [],
      },
    });

    const result = await store.importPlayer(targetId, playerJson, "bench");
    expect(result.status).toBe("success");

    const updated = await store.getCustomTeam(targetId);
    expect(updated?.roster.bench.some((p) => p.name === "Import Me")).toBe(true);
  });

  it("adds a pitcher to the pitchers section", async () => {
    const targetId = await store.createCustomTeam(
      makeInput({
        name: "Pitcher Target Team",
        roster: {
          lineup: [makePlayer({ id: "p_bat", name: "Batter" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    // Build a pitcher player JSON directly (not stored in any team)
    const pitcher: TeamPlayer = {
      id: "p_pitcher_src",
      name: "Import Pitcher",
      role: "pitcher",
      batting: { contact: 30, power: 20, speed: 25 },
      pitching: { velocity: 60, control: 55, movement: 45 },
      playerSeed: "pitcher-seed-unique",
      globalPlayerId: "pl_pitcher_unique_import",
    };
    const pitcherJson = exportCustomPlayer(pitcher);

    const result = await store.importPlayer(targetId, pitcherJson, "pitchers");
    expect(result.status).toBe("success");

    const updated = await store.getCustomTeam(targetId);
    expect(updated?.roster.pitchers.some((p) => p.name === "Import Pitcher")).toBe(true);
  });

  it("preserves globalPlayerId of imported player", async () => {
    const targetId = await store.createCustomTeam(
      makeInput({
        name: "Preserve GID Team",
        roster: {
          lineup: [makePlayer({ id: "p_preserve", name: "Existing" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    const player: TeamPlayer = {
      id: "p_gid_preserved",
      name: "GID Preserved",
      role: "batter",
      batting: { contact: 50, power: 50, speed: 50 },
      playerSeed: "preserve-gid-seed",
      globalPlayerId: "pl_preserved_gid_check",
    };
    const json = exportCustomPlayer(player);

    await store.importPlayer(targetId, json, "bench");

    const updated = await store.getCustomTeam(targetId);
    const imported = updated?.roster.bench.find((p) => p.name === "GID Preserved");
    expect(imported?.globalPlayerId).toBe("pl_preserved_gid_check");
    expect(imported?.playerSeed).toBe("preserve-gid-seed");
    expect(typeof imported?.fingerprint).toBe("string");
  });

  it("preserves playerSeed of imported player", async () => {
    const targetId = await store.createCustomTeam(
      makeInput({
        name: "Preserve Seed Team",
        roster: {
          lineup: [makePlayer({ id: "p_seed_pres", name: "Existing" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    const player: TeamPlayer = {
      id: "p_seed_check",
      name: "Seed Preserved",
      role: "batter",
      batting: { contact: 50, power: 50, speed: 50 },
      playerSeed: "my-exact-seed-value",
      globalPlayerId: "pl_seed_pres_check",
    };
    const json = exportCustomPlayer(player);

    await store.importPlayer(targetId, json, "bench");

    const updated = await store.getCustomTeam(targetId);
    const imported = updated?.roster.bench.find((p) => p.name === "Seed Preserved");
    expect(imported?.playerSeed).toBe("my-exact-seed-value");
    expect(imported?.globalPlayerId).toBe("pl_seed_pres_check");
    expect(typeof imported?.fingerprint).toBe("string");
  });

  it("blocks import when player's globalPlayerId already exists on a different team", async () => {
    // Create two teams; player starts on team A
    const teamAId = await store.createCustomTeam(
      makeInput({
        name: "Team A Block",
        roster: {
          lineup: [makePlayer({ id: "p_cross_team", name: "Cross Team Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const teamA = await store.getCustomTeam(teamAId);
    const playerOnTeamA = teamA!.roster.lineup[0];
    // Export player from team A (has globalPlayerId)
    const playerJson = exportCustomPlayer(playerOnTeamA);

    const teamBId = await store.createCustomTeam(
      makeInput({
        name: "Team B Block",
        roster: {
          lineup: [makePlayer({ id: "p_other", name: "Other Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    // Attempt to import into Team B — must be blocked
    const result = await store.importPlayer(teamBId, playerJson, "lineup");
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.conflictingTeamId).toBe(teamAId);
      expect(result.conflictingTeamName).toBe("Team A Block");
    }

    // Team B roster must be unchanged
    const teamB = await store.getCustomTeam(teamBId);
    expect(teamB?.roster.lineup.some((p) => p.name === "Cross Team Player")).toBe(false);
  });

  it("returns alreadyOnThisTeam when player's globalPlayerId exists on the target team", async () => {
    const teamId = await store.createCustomTeam(
      makeInput({
        name: "Same Team Check",
        roster: {
          lineup: [makePlayer({ id: "p_same_team", name: "Same Team Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );
    const team = await store.getCustomTeam(teamId);
    const existingPlayer = team!.roster.lineup[0];
    const playerJson = exportCustomPlayer(existingPlayer);

    const result = await store.importPlayer(teamId, playerJson, "bench");
    expect(result.status).toBe("alreadyOnThisTeam");

    // Roster must be unchanged
    const after = await store.getCustomTeam(teamId);
    expect(after?.roster.bench).toHaveLength(0);
  });

  it("throws when target team does not exist", async () => {
    const player: TeamPlayer = {
      id: "p_no_team",
      name: "No Team Player",
      role: "batter",
      batting: { contact: 50, power: 50, speed: 50 },
      playerSeed: "no-team-seed",
      globalPlayerId: "pl_no_team_gid",
    };
    const json = exportCustomPlayer(player);
    await expect(store.importPlayer("ct_nonexistent", json, "lineup")).rejects.toThrow(
      "Custom team not found",
    );
  });

  it("throws when player bundle lacks globalPlayerId", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "No GID Team" }));
    // exportCustomPlayer does not add globalPlayerId when the player object omits it,
    // so this bundle will pass signature verification but fail the store guard.
    const player: TeamPlayer = {
      id: "p_no_gid",
      name: "No GID Player",
      role: "batter",
      batting: { contact: 50, power: 50, speed: 50 },
      playerSeed: "no-gid-seed",
      // globalPlayerId intentionally omitted
    };
    const bundleWithoutGid = exportCustomPlayer(player);
    await expect(store.importPlayer(id, bundleWithoutGid, "lineup")).rejects.toThrow(
      "globalPlayerId",
    );
  });

  it("throws on invalid player JSON", async () => {
    const id = await store.createCustomTeam(makeInput({ name: "Bad JSON Team" }));
    await expect(store.importPlayer(id, "not valid json", "lineup")).rejects.toThrow();
  });

  it("remaps player.id when the incoming id already exists in the target roster", async () => {
    const sharedId = "p_collision_id";
    const targetId = await store.createCustomTeam(
      makeInput({
        name: "Collision Target Team",
        roster: {
          lineup: [makePlayer({ id: sharedId, name: "Existing Player" })],
          bench: [],
          pitchers: [],
        },
      }),
    );

    // Create a different player that happens to have the same local id
    const incomingPlayer: TeamPlayer = {
      id: sharedId, // same local id as existing player
      name: "Incoming Collision Player",
      role: "batter",
      batting: { contact: 50, power: 45, speed: 55 },
      playerSeed: "collision-import-seed",
      globalPlayerId: "pl_collision_unique_gid",
    };
    const json = exportCustomPlayer(incomingPlayer);

    const result = await store.importPlayer(targetId, json, "bench");
    expect(result.status).toBe("success");

    const updated = await store.getCustomTeam(targetId);
    const importedPlayer = updated?.roster.bench.find(
      (p) => p.name === "Incoming Collision Player",
    );
    expect(importedPlayer).toBeDefined();
    // Local id must have been remapped — must not collide with the existing lineup player
    expect(importedPlayer?.id).not.toBe(sharedId);
    // Identity fields must be preserved despite the id remap
    expect(importedPlayer?.globalPlayerId).toBe("pl_collision_unique_gid");
    expect(importedPlayer?.playerSeed).toBe("collision-import-seed");
  });
});


describe("importCustomTeams — stat cap enforcement", () => {
  it("rejects a bundle with over-cap batting stats and does not persist the team", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const overCapTeam = {
      id: "ct_overcap_bat_test",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Over Cap Bat Import",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p_overcap_bat",
            name: "Over Cap Batter",
            role: "batter" as const,
            batting: { contact: 60, power: 55, speed: 50 }, // 165 > 150
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([overCapTeam]);
    await expect(store.importCustomTeams(json)).rejects.toThrow(/stat cap/i);
    // The team must not have been persisted
    const found = await store.getCustomTeam("ct_overcap_bat_test");
    expect(found).toBeNull();
  });

  it("rejects a bundle with over-cap pitching stats", async () => {
    const { exportCustomTeams: exportFn } = await import("./customTeamExportImport");
    const overCapTeam = {
      id: "ct_overcap_pitch_test",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Over Cap Pitch Import",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p_overcap_pitch",
            name: "Over Cap Pitcher",
            role: "pitcher" as const,
            batting: { contact: 30, power: 20, speed: 25 },
            pitching: { velocity: 70, control: 60, movement: 55 }, // 185 > 160
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const json = exportFn([overCapTeam]);
    await expect(store.importCustomTeams(json)).rejects.toThrow(/stat cap/i);
  });
});
