import { type BallgameDb, getDb } from "./db";
import type {
  CreateCustomTeamInput,
  CustomTeamDoc,
  CustomTeamMetadata,
  TeamPlayer,
  TeamRoster,
  UpdateCustomTeamInput,
} from "./types";

const SCHEMA_VERSION = 1;
const ROSTER_SCHEMA_VERSION = 1;

const STAT_MIN = 0;
const STAT_MAX = 100;

type GetDb = () => Promise<BallgameDb>;

function requireNonEmpty(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldPath} must be a non-empty string`);
  }
  return value.trim();
}

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

function sanitizePlayer(player: TeamPlayer, index: number): TeamPlayer {
  const name = requireNonEmpty(player.name, `roster player[${index}].name`);
  if (!["batter", "pitcher", "two-way"].includes(player.role)) {
    throw new Error(`roster player[${index}].role must be "batter", "pitcher", or "two-way"`);
  }
  if (!player.batting || typeof player.batting !== "object") {
    throw new Error(`roster player[${index}].batting is required`);
  }
  return {
    ...player,
    name,
    batting: {
      contact: clampStat(Number(player.batting.contact) || 0),
      power: clampStat(Number(player.batting.power) || 0),
      speed: clampStat(Number(player.batting.speed) || 0),
    },
    ...(player.pitching && {
      pitching: {
        ...(player.pitching.velocity !== undefined && {
          velocity: clampStat(Number(player.pitching.velocity)),
        }),
        ...(player.pitching.control !== undefined && {
          control: clampStat(Number(player.pitching.control)),
        }),
        ...(player.pitching.movement !== undefined && {
          movement: clampStat(Number(player.pitching.movement)),
        }),
      },
    }),
  };
}

function buildRoster(input: CreateCustomTeamInput["roster"]): TeamRoster {
  if (!Array.isArray(input.lineup) || input.lineup.length < 1) {
    throw new Error("roster.lineup must have at least 1 player");
  }
  return {
    schemaVersion: ROSTER_SCHEMA_VERSION,
    lineup: input.lineup.map((p, i) => sanitizePlayer(p, i)),
    bench: (input.bench ?? []).map((p, i) => sanitizePlayer(p, i)),
    pitchers: (input.pitchers ?? []).map((p, i) => sanitizePlayer(p, i)),
  };
}

function buildStore(getDbFn: GetDb) {
  return {
    /**
     * Returns all custom teams ordered by most recently updated.
     * Archived teams are excluded unless `includeArchived` is true.
     */
    async listCustomTeams(filter?: { includeArchived?: boolean }): Promise<CustomTeamDoc[]> {
      const db = await getDbFn();
      const docs = await db.customTeams.find({ sort: [{ updatedAt: "desc" }] }).exec();
      const teams = docs.map((d) => d.toJSON() as unknown as CustomTeamDoc);
      if (filter?.includeArchived) return teams;
      return teams.filter((t) => !t.metadata?.archived);
    },

    /** Returns a single custom team by id, or null if not found. */
    async getCustomTeam(id: string): Promise<CustomTeamDoc | null> {
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      return doc ? (doc.toJSON() as unknown as CustomTeamDoc) : null;
    },

    /**
     * Creates a new custom team.
     * @returns The generated team id.
     */
    async createCustomTeam(input: CreateCustomTeamInput, meta?: { id?: string }): Promise<string> {
      const name = requireNonEmpty(input.name, "name");
      const roster = buildRoster(input.roster);
      const now = new Date().toISOString();
      const id = meta?.id ?? `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const doc: CustomTeamDoc = {
        id,
        schemaVersion: SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now,
        name,
        ...(input.abbreviation !== undefined && { abbreviation: input.abbreviation }),
        ...(input.nickname !== undefined && { nickname: input.nickname }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.slug !== undefined && { slug: input.slug }),
        source: input.source ?? "custom",
        roster,
        metadata: {
          ...(input.metadata?.notes !== undefined && { notes: input.metadata.notes }),
          ...(input.metadata?.tags !== undefined && { tags: input.metadata.tags }),
          archived: input.metadata?.archived ?? false,
        },
        ...(input.statsProfile !== undefined && { statsProfile: input.statsProfile }),
      };
      const db = await getDbFn();
      await db.customTeams.insert(doc);
      return id;
    },

    /**
     * Updates an existing custom team.
     * Only provided fields are changed; omitted fields keep their current values.
     */
    async updateCustomTeam(id: string, updates: UpdateCustomTeamInput): Promise<void> {
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      if (!doc) throw new Error(`Custom team not found: ${id}`);

      const patch: Partial<CustomTeamDoc> = {
        updatedAt: new Date().toISOString(),
      };

      if (updates.name !== undefined) patch.name = requireNonEmpty(updates.name, "name");
      if (updates.abbreviation !== undefined) patch.abbreviation = updates.abbreviation;
      if (updates.nickname !== undefined) patch.nickname = updates.nickname;
      if (updates.city !== undefined) patch.city = updates.city;
      if (updates.slug !== undefined) patch.slug = updates.slug;
      if (updates.statsProfile !== undefined) patch.statsProfile = updates.statsProfile;

      if (updates.roster !== undefined) {
        const current = doc.toJSON() as unknown as CustomTeamDoc;
        patch.roster = buildRoster({
          lineup: updates.roster.lineup ?? current.roster.lineup,
          bench: updates.roster.bench ?? current.roster.bench,
          pitchers: updates.roster.pitchers ?? current.roster.pitchers,
        });
      }

      if (updates.metadata !== undefined) {
        const currentMeta = (doc.toJSON() as unknown as CustomTeamDoc).metadata;
        patch.metadata = { ...currentMeta, ...updates.metadata } as CustomTeamMetadata;
      }

      await doc.patch(patch);
    },

    /** Permanently removes a custom team. */
    async deleteCustomTeam(id: string): Promise<void> {
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      if (doc) await doc.remove();
    },
  };
}

/** Default CustomTeamStore backed by the IndexedDB singleton. */
export const CustomTeamStore = buildStore(getDb);

/**
 * Factory for creating a CustomTeamStore with a custom db getter —
 * useful for tests where a fresh in-memory database should be injected.
 */
export const makeCustomTeamStore = (getDbFn: GetDb) => buildStore(getDbFn);
