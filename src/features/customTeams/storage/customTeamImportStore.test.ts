import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "@storage/db";
import type { CreateCustomTeamInput } from "@storage/types";
import { makePlayer } from "@test/helpers/customTeams";

import { makeCustomTeamStore } from "./customTeamStore";

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
    const { _createTestDb: createTestDb } = await import("@storage/db");
    const { getRxStorageMemory: getMemStorage } = await import("rxdb/plugins/storage-memory");
    const freshDb = await createTestDb(getMemStorage());
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
