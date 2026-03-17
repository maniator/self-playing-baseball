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

describe("exportPlayer — identity fields", () => {
  it("exported JSON includes player id (stable identity in v1)", async () => {
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
    // In v1, player.id is the stable identity (globalPlayerId concept is merged into id)
    expect(typeof parsed.payload.player["id"]).toBe("string");
    expect((parsed.payload.player["id"] as string).length).toBeGreaterThan(0);
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

  it("player id is stable across export round-trips", async () => {
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
    const pid1 = (JSON.parse(json1) as { payload: { player: { id: string } } }).payload.player.id;
    const pid2 = (JSON.parse(json2) as { payload: { player: { id: string } } }).payload.player.id;
    expect(pid1).toBe(pid2);
  });
});
