import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeCustomTeamStore } from "./customTeamStore";
import { _createTestDb, type BallgameDb } from "./db";
import type { CreateCustomTeamInput, TeamPlayer } from "./types";

const makePlayer = (overrides: Partial<TeamPlayer> = {}): TeamPlayer => ({
  id: `player_${Math.random().toString(36).slice(2, 8)}`,
  name: "Test Player",
  role: "batter",
  batting: { contact: 70, power: 60, speed: 50 },
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
    const doc = await db.customTeams.findOne(id).exec();
    const stored = doc?.toJSON() as unknown as { roster: { lineup: TeamPlayer[] } };
    expect(stored.roster.lineup[0].batting.contact).toBe(100);
    expect(stored.roster.lineup[0].batting.power).toBe(0);
    expect(stored.roster.lineup[0].batting.speed).toBe(50);
  });

  it("clamps pitching stats to 0–100", async () => {
    const player = makePlayer({
      role: "pitcher",
      pitching: { velocity: 200, control: -5, movement: 80 },
    });
    const id = await store.createCustomTeam(makeInput({ roster: { lineup: [player] } }));
    const doc = await db.customTeams.findOne(id).exec();
    const stored = doc?.toJSON() as unknown as { roster: { lineup: TeamPlayer[] } };
    expect(stored.roster.lineup[0].pitching?.velocity).toBe(100);
    expect(stored.roster.lineup[0].pitching?.control).toBe(0);
    expect(stored.roster.lineup[0].pitching?.movement).toBe(80);
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
    const doc = await db.customTeams.findOne(id).exec();
    const stored = doc?.toJSON() as unknown as {
      roster: { bench: TeamPlayer[]; pitchers: TeamPlayer[] };
    };
    expect(stored.roster.bench).toHaveLength(1);
    expect(stored.roster.bench[0].name).toBe("Bench Guy");
    expect(stored.roster.pitchers).toHaveLength(1);
    expect(stored.roster.pitchers[0].name).toBe("Pitcher Joe");
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

  it("throws on empty updated name", async () => {
    const id = await store.createCustomTeam(makeInput());
    await expect(store.updateCustomTeam(id, { name: "" })).rejects.toThrow(
      "name must be a non-empty string",
    );
  });

  it("throws when team not found", async () => {
    await expect(store.updateCustomTeam("ghost", { name: "x" })).rejects.toThrow(
      "Custom team not found: ghost",
    );
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
            batting: { contact: 70, power: 60, speed: 50 },
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
            batting: { contact: 70, power: 60, speed: 50 },
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
              pitching: { velocity: 85, control: 70, movement: 65 },
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
