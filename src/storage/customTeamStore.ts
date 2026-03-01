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
  PlayerDoc,
  TeamPlayer,
  TeamRoster,
  UpdateCustomTeamInput,
} from "./types";

const SCHEMA_VERSION = 1;
const ROSTER_SCHEMA_VERSION = 1;
const PLAYER_SCHEMA_VERSION = 1;

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

/** Converts a sanitized TeamPlayer into a PlayerDoc for a given team/section/index. */
function toPlayerDoc(
  player: TeamPlayer,
  teamId: string,
  section: "lineup" | "bench" | "pitchers",
  orderIndex: number,
): PlayerDoc {
  return {
    ...player,
    teamId,
    section,
    orderIndex,
    schemaVersion: PLAYER_SCHEMA_VERSION,
  };
}

/** Returns all PlayerDocs for a team, sorted by section and orderIndex. */
async function fetchPlayerDocs(db: BallgameDb, teamId: string): Promise<PlayerDoc[]> {
  const docs = await db.players.find({ selector: { teamId } }).exec();
  return docs.map((d) => d.toJSON() as unknown as PlayerDoc);
}

/** Assembles a TeamRoster from a list of PlayerDocs for a team. */
function assembleRoster(playerDocs: PlayerDoc[], existingRoster: TeamRoster): TeamRoster {
  const lineup = playerDocs
    .filter((p) => p.section === "lineup")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(
      ({ teamId: _t, section: _s, orderIndex: _o, schemaVersion: _v, ...player }) =>
        player as TeamPlayer,
    );
  const bench = playerDocs
    .filter((p) => p.section === "bench")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(
      ({ teamId: _t, section: _s, orderIndex: _o, schemaVersion: _v, ...player }) =>
        player as TeamPlayer,
    );
  const pitchers = playerDocs
    .filter((p) => p.section === "pitchers")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(
      ({ teamId: _t, section: _s, orderIndex: _o, schemaVersion: _v, ...player }) =>
        player as TeamPlayer,
    );
  return {
    schemaVersion: existingRoster.schemaVersion,
    lineup,
    bench,
    pitchers,
  };
}

/**
 * Writes all players from a roster into the `players` collection using bulkInsert.
 * Assumes any existing player docs for this team have already been removed.
 */
async function writePlayerDocs(db: BallgameDb, teamId: string, roster: TeamRoster): Promise<void> {
  const allDocs = [
    ...roster.lineup.map((p, i) => toPlayerDoc(p, teamId, "lineup", i)),
    ...roster.bench.map((p, i) => toPlayerDoc(p, teamId, "bench", i)),
    ...roster.pitchers.map((p, i) => toPlayerDoc(p, teamId, "pitchers", i)),
  ];
  if (allDocs.length > 0) {
    await db.players.bulkInsert(allDocs);
  }
}

/**
 * Removes all player docs for a given team from the `players` collection.
 */
async function removePlayerDocs(db: BallgameDb, teamId: string): Promise<void> {
  const existing = await db.players.find({ selector: { teamId } }).exec();
  await Promise.all(existing.map((p) => p.remove()));
}

/**
 * Populates the roster of a team from the `players` collection.
 * If no player docs exist yet (legacy team), falls back to the embedded roster
 * and backfills the `players` collection for future reads.
 */
async function populateRoster(db: BallgameDb, team: CustomTeamDoc): Promise<CustomTeamDoc> {
  const playerDocs = await fetchPlayerDocs(db, team.id);
  if (playerDocs.length > 0) {
    return { ...team, roster: assembleRoster(playerDocs, team.roster) };
  }
  // Legacy team: no player docs yet — backfill from embedded roster.
  if (
    team.roster.lineup.length > 0 ||
    team.roster.bench.length > 0 ||
    team.roster.pitchers.length > 0
  ) {
    await writePlayerDocs(db, team.id, team.roster);
  }
  return team;
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
      const filtered = filter?.includeArchived ? teams : teams.filter((t) => !t.metadata?.archived);
      return Promise.all(filtered.map((t) => populateRoster(db, t)));
    },

    /** Returns a single custom team by id, or null if not found. */
    async getCustomTeam(id: string): Promise<CustomTeamDoc | null> {
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      if (!doc) return null;
      const team = doc.toJSON() as unknown as CustomTeamDoc;
      return populateRoster(db, team);
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
        // Store empty embedded arrays — players live in the `players` collection.
        roster: { schemaVersion: ROSTER_SCHEMA_VERSION, lineup: [], bench: [], pitchers: [] },
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
      // Write player docs into the dedicated players collection.
      await writePlayerDocs(db, id, roster);
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

      if (updates.name !== undefined) {
        const newName = requireNonEmpty(updates.name, "name");
        // Enforce unique team names (case-insensitive), excluding the current team.
        const existing = await this.listCustomTeams({ includeArchived: true });
        const nameLower = newName.toLowerCase();
        const duplicate = existing.find((t) => t.id !== id && t.name.toLowerCase() === nameLower);
        if (duplicate) {
          throw new Error(
            `A team named "${duplicate.name}" already exists. Team names must be unique.`,
          );
        }
        patch.name = newName;
      }
      if (updates.abbreviation !== undefined)
        patch.abbreviation = sanitizeAbbreviation(updates.abbreviation);
      if (updates.nickname !== undefined) patch.nickname = updates.nickname;
      if (updates.city !== undefined) patch.city = updates.city;
      if (updates.slug !== undefined) patch.slug = updates.slug;
      if (updates.statsProfile !== undefined) patch.statsProfile = updates.statsProfile;

      if (updates.roster !== undefined) {
        const current = await populateRoster(db, doc.toJSON() as unknown as CustomTeamDoc);
        const newRoster = buildRoster({
          lineup: updates.roster.lineup ?? current.roster.lineup,
          bench: updates.roster.bench ?? current.roster.bench,
          pitchers: updates.roster.pitchers ?? current.roster.pitchers,
        });
        // Keep embedded arrays empty — players live in the `players` collection.
        patch.roster = {
          schemaVersion: ROSTER_SCHEMA_VERSION,
          lineup: [],
          bench: [],
          pitchers: [],
        };
        // Replace player docs: remove old ones, insert new ones.
        await removePlayerDocs(db, id);
        await writePlayerDocs(db, id, newRoster);
      }

      if (updates.metadata !== undefined) {
        const currentMeta = (doc.toJSON() as unknown as CustomTeamDoc).metadata;
        patch.metadata = { ...currentMeta, ...updates.metadata } as CustomTeamMetadata;
      }

      // Recompute fingerprint only when identity fields (name or abbreviation) change.
      // roster changes do not affect the fingerprint. teamSeed is never part of
      // UpdateCustomTeamInput and therefore never triggers a recomputation here.
      if (updates.name !== undefined || updates.abbreviation !== undefined) {
        const currentDoc = doc.toJSON() as unknown as CustomTeamDoc;
        // Merge currentDoc with all effective changes so fingerprint uses final values.
        const merged: CustomTeamDoc = {
          ...currentDoc,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.abbreviation !== undefined && { abbreviation: patch.abbreviation }),
        };
        patch.fingerprint = buildTeamFingerprint(merged);
      }

      await doc.patch(patch);
    },

    /** Permanently removes a custom team. */
    /**
     * Deletes a custom team.
     * @param id  The team id to delete.
     * @param options.cascade  When `true` (default), also deletes all player docs belonging to this
     *   team. When `false`, player docs are detached (their `teamId` is set to `null`) so they
     *   become free agents and can be re-assigned or listed via `listFreePlayers()`.
     */
    async deleteCustomTeam(id: string, options?: { cascade?: boolean }): Promise<void> {
      const cascade = options?.cascade ?? true;
      const db = await getDbFn();
      const doc = await db.customTeams.findOne(id).exec();
      if (doc) {
        await doc.remove();
        if (cascade) {
          await removePlayerDocs(db, id);
        } else {
          const existing = await db.players.find({ selector: { teamId: id } }).exec();
          await Promise.all(existing.map((p) => p.patch({ teamId: null })));
        }
      }
    },

    /**
     * Returns all player docs that are not assigned to any team (free agents).
     * These are players whose `teamId` is `null` — created when a team is deleted
     * with `{ cascade: false }`.
     */
    async listFreePlayers(): Promise<PlayerDoc[]> {
      const db = await getDbFn();
      const docs = await db.players.find({ selector: { teamId: null } }).exec();
      return docs.map((d) => d.toJSON() as unknown as PlayerDoc);
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
     * @note Name-uniqueness is NOT enforced on import. A team imported with the
     * same name as an existing team (but a different `teamSeed`) will be upserted
     * as a separate team. This is a known limitation of the fingerprint-based
     * deduplication strategy: fingerprints are seed-scoped, so only the exact
     * same team (same seed) is detected as a duplicate.
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
          // Store the imported team doc with empty embedded arrays.
          const teamDoc: CustomTeamDoc = {
            ...team,
            roster: { schemaVersion: ROSTER_SCHEMA_VERSION, lineup: [], bench: [], pitchers: [] },
          };
          await db.customTeams.upsert(teamDoc);
          // Replace player docs for this team.
          await removePlayerDocs(db, team.id);
          await writePlayerDocs(db, team.id, team.roster);
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
