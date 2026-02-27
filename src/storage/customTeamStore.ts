import {
  buildPlayerSig,
  buildTeamFingerprint,
  exportCustomPlayer as exportCustomPlayerJson,
  exportCustomTeams as exportCustomTeamsJson,
  importCustomTeams as importCustomTeamsParser,
  type ImportCustomTeamsOptions,
  type ImportCustomTeamsResult,
} from "./customTeamExportImport";
import { type BallgameDb, getDb } from "./db";
import { generateSeed, generateTeamId } from "./generateId";
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

/**
 * Sanitizes an abbreviation: trims, uppercases, and enforces 2–3 characters.
 * Throws if the result is outside that range so stored docs are always valid.
 */
function sanitizeAbbreviation(value: string): string {
  const abbr = value.trim().toUpperCase();
  if (abbr.length < 2 || abbr.length > 3) {
    throw new Error(`abbreviation must be 2–3 characters (got "${abbr}")`);
  }
  return abbr;
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
  const sanitized: TeamPlayer = {
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
  // Preserve the existing playerSeed or generate a new one at creation time.
  // The seed is stored permanently so the fingerprint can be re-verified.
  const playerSeed = player.playerSeed ?? generateSeed();
  // Always persist a content fingerprint so global duplicate detection works
  // without re-reading all teams. The fingerprint covers the immutable identity
  // fields (name, role, batting, pitching) plus the per-player seed.
  const fingerprint = buildPlayerSig({ ...sanitized, playerSeed });
  return { ...sanitized, playerSeed, fingerprint };
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
     * Throws if a team with the same name (case-insensitive) already exists
     * to ensure team names remain unique within the local install.
     * @returns The generated team id.
     */
    async createCustomTeam(input: CreateCustomTeamInput, meta?: { id?: string }): Promise<string> {
      const name = requireNonEmpty(input.name, "name");

      // Enforce unique team names (case-insensitive) across the local install.
      const existing = await this.listCustomTeams({ includeArchived: true });
      const nameLower = name.toLowerCase();
      const duplicate = existing.find((t) => t.name.toLowerCase() === nameLower);
      if (duplicate) {
        throw new Error(
          `A team named "${duplicate.name}" already exists. Team names must be unique.`,
        );
      }
      const roster = buildRoster(input.roster);
      const now = new Date().toISOString();
      const id = meta?.id ?? generateTeamId();
      const teamSeed = generateSeed();
      const sanitizedAbbrev =
        input.abbreviation !== undefined ? sanitizeAbbreviation(input.abbreviation) : undefined;
      const doc: CustomTeamDoc = {
        id,
        schemaVersion: SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now,
        name,
        ...(sanitizedAbbrev !== undefined && { abbreviation: sanitizedAbbrev }),
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
        teamSeed,
      };
      doc.fingerprint = buildTeamFingerprint(doc);
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
      if (updates.abbreviation !== undefined)
        patch.abbreviation = sanitizeAbbreviation(updates.abbreviation);
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

      // Recompute fingerprint if any identity field changed.
      if (
        updates.name !== undefined ||
        updates.abbreviation !== undefined ||
        updates.roster !== undefined
      ) {
        const currentDoc = doc.toJSON() as unknown as CustomTeamDoc;
        // Merge currentDoc with all effective changes so fingerprint uses final values.
        const merged: CustomTeamDoc = {
          ...currentDoc,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.abbreviation !== undefined && { abbreviation: patch.abbreviation }),
          ...(patch.roster !== undefined && { roster: patch.roster }),
        };
        patch.fingerprint = buildTeamFingerprint(merged);
      }

      await doc.patch(patch);
    },

    /** Permanently removes a custom team. */
    async deleteCustomTeam(id: string): Promise<void> {
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      if (doc) await doc.remove();
    },

    /**
     * Exports the specified teams (by id) as a portable JSON string.
     * If `ids` is omitted, all non-archived teams are exported.
     */
    async exportCustomTeams(ids?: string[]): Promise<string> {
      const all = await this.listCustomTeams(ids ? { includeArchived: true } : undefined);
      const toExport = ids ? all.filter((t) => ids.includes(t.id)) : all;
      return exportCustomTeamsJson(toExport);
    },

    /**
     * Exports a single player from a team as a portable signed JSON string.
     * @param teamId  The team the player belongs to.
     * @param playerId  The player's id within that team.
     * @throws If the team or player is not found.
     */
    async exportPlayer(teamId: string, playerId: string): Promise<string> {
      const team = await this.getCustomTeam(teamId);
      if (!team) throw new Error(`Team not found: ${teamId}`);
      const allPlayers = [...team.roster.lineup, ...team.roster.bench, ...team.roster.pitchers];
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) throw new Error(`Player not found: ${playerId} in team ${teamId}`);
      return exportCustomPlayerJson(player);
    },

    /**
     * Imports teams from a JSON string produced by `exportCustomTeams`.
     * Remaps IDs on collision and upserts all resulting teams into the DB.
     * When duplicate players are detected and `options.allowDuplicatePlayers` is
     * not true, returns `requiresDuplicateConfirmation: true` without importing
     * anything — the caller should prompt the user and retry with the flag set.
     * @returns A summary of created/remapped counts and duplicate warnings.
     */
    async importCustomTeams(
      json: string,
      options?: ImportCustomTeamsOptions,
    ): Promise<ImportCustomTeamsResult> {
      const existing = await this.listCustomTeams({ includeArchived: true });
      const result = importCustomTeamsParser(json, existing, undefined, options);
      if (!result.requiresDuplicateConfirmation) {
        const db = await getDbFn();
        for (const team of result.teams) {
          await db.customTeams.upsert(team);
        }
      }
      return result;
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
