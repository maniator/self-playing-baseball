import type { RxJsonSchema } from "rxdb";

import type { EventDoc, SaveDoc } from "@storage/types";

const savesSchema: RxJsonSchema<SaveDoc> = {
  // Version 0: original schema with plain additionalProperties objects.
  // Version 1: explicit nested properties definitions for setup/snapshots.
  // Version 2: removed matchupMode (legacy field, never used for game restore).
  //   Migration drops the field; all other fields remain unchanged.
  version: 2,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    seed: { type: "string" },
    homeTeamId: { type: "string" },
    awayTeamId: { type: "string" },
    createdAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    updatedAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    progressIdx: { type: "number", minimum: -1, maximum: 9_999_999, multipleOf: 1 },
    setup: {
      type: "object",
      additionalProperties: true,
      properties: {
        strategy: { type: "string" },
        managerMode: { type: "boolean" },
        homeTeam: { type: "string" },
        awayTeam: { type: "string" },
        playerOverrides: { type: "array" },
        lineupOrder: { type: "array" },
      },
    },
    scoreSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        away: { type: "number" },
        home: { type: "number" },
      },
    },
    inningSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        inning: { type: "number" },
        atBat: { type: "number" },
      },
    },
    /**
     * stateSnapshot: full game State blob + seeded PRNG state.
     * `state` is stored as an opaque object and backfilled via
     * `backfillRestoredState` on load to handle schema evolution.
     * `rngState` is null for saves predating PRNG persistence.
     */
    stateSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        state: { type: "object", additionalProperties: true },
        rngState: { type: ["number", "null"] },
      },
    },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "name",
    "seed",
    "homeTeamId",
    "awayTeamId",
    "createdAt",
    "updatedAt",
    "progressIdx",
    "setup",
    "schemaVersion",
  ],
  indexes: ["updatedAt"],
};

const eventsSchema: RxJsonSchema<EventDoc> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 256 },
    saveId: { type: "string", maxLength: 128 },
    idx: { type: "number", minimum: 0, maximum: 9_999_999, multipleOf: 1 },
    at: { type: "number", minimum: 0, maximum: 9_999_999, multipleOf: 1 },
    type: { type: "string" },
    payload: { type: "object", additionalProperties: true },
    ts: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: ["id", "saveId", "idx", "at", "type", "payload", "ts", "schemaVersion"],
  indexes: ["saveId", ["saveId", "idx"]],
};

export const savesCollectionConfig = {
  schema: savesSchema,
  migrationStrategies: {
    // Identity migration: all new schema fields were optional; existing
    // docs are already valid against the new schema.
    1: (oldDoc: Record<string, unknown>) => oldDoc,
    // Drop matchupMode (legacy field removed in v2). All other fields unchanged.
    2: (oldDoc: Record<string, unknown>) => {
      const { matchupMode: _drop, ...rest } = oldDoc;
      return rest;
    },
  },
};

export const eventsCollectionConfig = {
  schema: eventsSchema,
};
