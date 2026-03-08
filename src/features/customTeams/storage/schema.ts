import type { RxJsonSchema } from "rxdb";

import { fnv1a } from "@storage/hash";
import type { CustomTeamDoc } from "@storage/types";

const customTeamsSchema: RxJsonSchema<CustomTeamDoc> = {
  // Version 1: formally declares `abbreviation` (was already stored as an additional
  // property) and `fingerprint` (new in the import/export stage — computed via FNV-1a
  // over name+abbreviation (case-insensitive), used for duplicate detection on import).
  // Both fields are optional so the identity migration is safe for all existing docs.
  //
  // Version 2: adds `fingerprint` to every player embedded in the roster.
  // Each player's fingerprint is a FNV-1a hash of {name, role, batting, pitching},
  // enabling O(1) global duplicate detection without re-reading all teams on every
  // check. Migration backfills fingerprints for all players in existing documents.
  //
  // Version 3: adds `teamSeed` and per-player `playerSeed` for instance-unique fingerprints.
  // Migration backfills random seeds for all existing docs and recomputes fingerprints.
  //
  // Version 4: adds `globalPlayerId` to every embedded roster player (for legacy teams
  // that haven't yet been migrated to the `players` collection and still carry roster arrays).
  // New teams store empty embedded arrays (players live in the `players` collection), so
  // this migration is mostly a safe no-op for them.
  version: 4,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
    // ISO 8601 timestamps — 32 chars is safe ("2024-01-01T00:00:00.000Z" = 24).
    createdAt: { type: "string", maxLength: 32 },
    updatedAt: { type: "string", maxLength: 32 },
    name: { type: "string", maxLength: 256 },
    /** 2–3 char compact label used by line score / scoreboard contexts (max 8 chars). */
    abbreviation: { type: "string", maxLength: 8 },
    nickname: { type: "string", maxLength: 256 },
    city: { type: "string", maxLength: 256 },
    slug: { type: "string", maxLength: 256 },
    source: { type: "string", enum: ["custom", "generated"], maxLength: 16 },
    roster: { type: "object", additionalProperties: true },
    metadata: { type: "object", additionalProperties: true },
    statsProfile: { type: "string", maxLength: 64 },
    /**
     * FNV-1a content fingerprint (8 hex chars) — used only for duplicate detection
     * on import.  NOT the primary identity key; `id` remains the primary key.
     * Computed by `buildTeamFingerprint` from `customTeamExportImport.ts`.
     */
    fingerprint: { type: "string", maxLength: 8 },
    /**
     * Random seed generated once at team creation. Stored permanently so the
     * fingerprint (fnv1a(teamSeed + name + abbreviation)) can be re-verified.
     * Absent on documents created before schema v3 — backfilled by v2→v3 migration.
     */
    teamSeed: { type: "string", maxLength: 32 },
  },
  required: [
    "id",
    "schemaVersion",
    "createdAt",
    "updatedAt",
    "name",
    "source",
    "roster",
    "metadata",
  ],
  indexes: ["updatedAt", "source"],
};

export const customTeamsCollectionConfig = {
  schema: customTeamsSchema,
  migrationStrategies: {
    // Identity migration: `abbreviation` and `fingerprint` are optional fields.
    // Existing docs without them remain valid; `fingerprint` will be computed
    // and stored on the next write (team update or import). No data loss.
    1: (oldDoc: Record<string, unknown>) => oldDoc,
    // Backfill player fingerprints: each player gets a persistent FNV-1a hash
    // covering {name, role, batting, pitching} so global duplicate detection
    // works without re-reading all teams on every query.
    // `fnv1a` is imported from `@storage/hash` (already a db.ts dependency) so
    // the migration has no additional module dependencies.
    2: (oldDoc: Record<string, unknown>) => {
      try {
        const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
        if (!roster || typeof roster !== "object") return oldDoc;

        const addFp = (player: unknown): unknown => {
          if (!player || typeof player !== "object") return player;
          const p = player as Record<string, unknown>;
          // Already fingerprinted — skip.
          if (p["fingerprint"]) return p;
          const fp = fnv1a(
            JSON.stringify({
              name: p["name"],
              role: p["role"],
              batting: p["batting"],
              pitching: p["pitching"],
            }),
          );
          return { ...p, fingerprint: fp };
        };

        return {
          ...oldDoc,
          roster: {
            ...roster,
            // Only fingerprint when the slot is an array; preserve any
            // existing non-array value to avoid accidental data loss.
            lineup: Array.isArray(roster["lineup"])
              ? roster["lineup"].map(addFp)
              : roster["lineup"],
            bench: Array.isArray(roster["bench"]) ? roster["bench"].map(addFp) : roster["bench"],
            pitchers: Array.isArray(roster["pitchers"])
              ? roster["pitchers"].map(addFp)
              : roster["pitchers"],
          },
        };
      } catch {
        // Migration must never throw — return unchanged doc as a safe fallback.
        return oldDoc;
      }
    },
    // Backfill teamSeed and per-player playerSeed for seed-based instance fingerprints.
    // Uses Math.random()-derived seeds (~83 bits of entropy) because migration
    // strategies must be pure synchronous functions — they cannot `import` other
    // modules or call async APIs, so `generateSeed()` from `generateId.ts` (which
    // relies on `nanoid`) cannot be used here.
    3: (oldDoc: Record<string, unknown>) => {
      try {
        // Inline fallback seed generator — synchronous, no module dependencies.
        // Two Math.random() calls give ~18 base-36 chars: 12 chars (~62 bits)
        // plus 4 chars (~21 bits) ≈ 83 bits of entropy total,
        // which is sufficient for a migration backfill where CSPRNG is unavailable.
        const fallbackSeed = (): string =>
          Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 6);

        // Backfill teamSeed and recompute team fingerprint.
        const teamSeed = (oldDoc["teamSeed"] as string | undefined) ?? fallbackSeed();
        const teamFingerprint = fnv1a(
          teamSeed +
            ((oldDoc["name"] as string | undefined) ?? "").toLowerCase() +
            "|" +
            ((oldDoc["abbreviation"] as string | undefined) ?? "").toLowerCase(),
        );

        // Backfill playerSeed and recompute each player's fingerprint.
        const addSeed = (player: unknown): unknown => {
          if (!player || typeof player !== "object") return player;
          const p = player as Record<string, unknown>;
          const playerSeed = (p["playerSeed"] as string | undefined) ?? fallbackSeed();
          const { name, role, batting, pitching } = p as {
            name?: string;
            role?: string;
            batting?: Record<string, number>;
            pitching?: Record<string, number>;
          };
          const fingerprint = fnv1a(playerSeed + JSON.stringify({ name, role, batting, pitching }));
          return { ...p, playerSeed, fingerprint };
        };

        const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
        if (!roster || typeof roster !== "object") {
          return { ...oldDoc, teamSeed, fingerprint: teamFingerprint };
        }

        return {
          ...oldDoc,
          teamSeed,
          fingerprint: teamFingerprint,
          roster: {
            ...roster,
            lineup: Array.isArray(roster["lineup"])
              ? roster["lineup"].map(addSeed)
              : roster["lineup"],
            bench: Array.isArray(roster["bench"]) ? roster["bench"].map(addSeed) : roster["bench"],
            pitchers: Array.isArray(roster["pitchers"])
              ? roster["pitchers"].map(addSeed)
              : roster["pitchers"],
          },
        };
      } catch {
        // Migration must never throw — return unchanged doc as a safe fallback.
        return oldDoc;
      }
    },
    // v3→v4: backfill globalPlayerId in embedded roster players.
    // New teams have empty embedded arrays so this is mostly a no-op; for
    // legacy teams whose rosters haven't yet migrated to the players collection
    // this ensures every player gets a stable globalPlayerId.
    4: (oldDoc: Record<string, unknown>) => {
      try {
        const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
        if (!roster || typeof roster !== "object") return oldDoc;

        const addGlobalId = (player: unknown): unknown => {
          if (!player || typeof player !== "object") return player;
          const p = player as Record<string, unknown>;
          if (p["globalPlayerId"]) return p; // already has one
          const playerSeed = p["playerSeed"] as string | undefined;
          // Derive a deterministic fallback from stable fields so the same legacy
          // document always migrates to the same globalPlayerId on every device/run.
          const id = p["id"] as string | undefined;
          const fingerprint = p["fingerprint"] as string | undefined;
          const deterministicBasis = `${id ?? ""}|${fingerprint ?? ""}`;
          const seed = playerSeed ?? fnv1a(deterministicBasis);
          const globalPlayerId = `pl_${fnv1a(seed)}`;
          return { ...p, globalPlayerId };
        };

        const hasAnyPlayers =
          (Array.isArray(roster["lineup"]) && roster["lineup"].length > 0) ||
          (Array.isArray(roster["bench"]) && roster["bench"].length > 0) ||
          (Array.isArray(roster["pitchers"]) && roster["pitchers"].length > 0);

        if (!hasAnyPlayers) return oldDoc;

        return {
          ...oldDoc,
          roster: {
            ...roster,
            lineup: Array.isArray(roster["lineup"])
              ? roster["lineup"].map(addGlobalId)
              : roster["lineup"],
            bench: Array.isArray(roster["bench"])
              ? roster["bench"].map(addGlobalId)
              : roster["bench"],
            pitchers: Array.isArray(roster["pitchers"])
              ? roster["pitchers"].map(addGlobalId)
              : roster["pitchers"],
          },
        };
      } catch {
        return oldDoc;
      }
    },
  },
};
