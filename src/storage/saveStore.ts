import { type BallgameDb, getDb } from "./db";
import { generateSaveId } from "./generateId";
import { fnv1a } from "./hash";
import type {
  EventDoc,
  GameEvent,
  GameSetup,
  ProgressSummary,
  RxdbExportedSave,
  SaveDoc,
} from "./types";

const SCHEMA_VERSION = 1;
const MAX_SAVES = 3;
const RXDB_EXPORT_VERSION = 1 as const;
const RXDB_EXPORT_KEY = "ballgame:rxdb:v1";

type GetDb = () => Promise<BallgameDb>;

function buildStore(getDbFn: GetDb) {
  // Per-save promise chain: serializes all appendEvents calls for the same save
  // so index allocation never races even under rapid fire-and-forget writes.
  const appendQueues = new Map<string, Promise<void>>();

  // Per-save monotonic next-index counter.  Set to 0 on createSave (new save
  // has no events yet) and incremented synchronously inside the queue chain so
  // overlapping batches always get distinct, gapless indices.  Cleared on
  // deleteSave / importRxdbSave to force a DB-query re-initialization if the
  // save is ever reused from a different store instance (e.g. after import).
  const nextIdxMap = new Map<string, number>();

  return {
    /**
     * Creates a new save header document.
     * @returns The generated saveId.
     */
    async createSave(setup: GameSetup, meta?: { name?: string }): Promise<string> {
      const db = await getDbFn();
      const now = Date.now();
      const id = generateSaveId();

      // Enforce max-saves rule: evict the oldest save before inserting a new one.
      const allSaves = await db.saves.find({ sort: [{ updatedAt: "asc" }] }).exec();
      if (allSaves.length >= MAX_SAVES) {
        const oldest = allSaves[0];
        nextIdxMap.delete(oldest.id);
        appendQueues.delete(oldest.id);
        await oldest.remove();
        const staleEvents = await db.events.find({ selector: { saveId: oldest.id } }).exec();
        await Promise.all(staleEvents.map((d) => d.remove()));
      }
      const doc: SaveDoc = {
        id,
        name: meta?.name ?? `${setup.homeTeamId} vs ${setup.awayTeamId}`,
        seed: setup.seed,
        homeTeamId: setup.homeTeamId,
        awayTeamId: setup.awayTeamId,
        createdAt: now,
        updatedAt: now,
        // -1 is the sentinel for "not started" (no pitches persisted yet).
        progressIdx: -1,
        setup: setup.setup,
        schemaVersion: SCHEMA_VERSION,
      };
      await db.saves.insert(doc);
      // New save has no events — seed counter at 0 to skip the DB-query path.
      nextIdxMap.set(id, 0);
      return id;
    },

    /**
     * Appends a batch of events for a save.
     * Calls are serialized per saveId via a promise queue so concurrent
     * fire-and-forget writes never produce colliding `${saveId}:${idx}` keys.
     * The in-memory counter is incremented synchronously inside the queue, so
     * the next queued batch always starts at the correct index.
     */
    async appendEvents(saveId: string, events: GameEvent[]): Promise<void> {
      if (events.length === 0) return;

      // Chain this write behind any in-progress append for the same save.
      const prev = appendQueues.get(saveId) ?? Promise.resolve();
      const thisWrite = prev.then(async () => {
        const db = await getDbFn();

        // Initialise the counter from DB only the very first time (e.g. when
        // loading a save created by a different store instance after import).
        if (!nextIdxMap.has(saveId)) {
          const existing = await db.events
            .find({ selector: { saveId }, sort: [{ idx: "desc" }], limit: 1 })
            .exec();
          nextIdxMap.set(saveId, existing.length > 0 ? existing[0].idx + 1 : 0);
        }

        const startIdx = nextIdxMap.get(saveId)!;
        // Optimistically advance the counter so the next queued batch sees the
        // updated value immediately (writes are serialized by the queue).
        nextIdxMap.set(saveId, startIdx + events.length);

        const now = Date.now();
        const docs: EventDoc[] = events.map((ev, i) => ({
          id: `${saveId}:${startIdx + i}`,
          saveId,
          idx: startIdx + i,
          at: ev.at,
          type: ev.type,
          payload: ev.payload,
          ts: now,
          schemaVersion: SCHEMA_VERSION,
        }));

        try {
          await db.events.bulkInsert(docs);
        } catch (err) {
          // Roll back the counter so the next batch retries from the correct idx.
          nextIdxMap.set(saveId, startIdx);
          throw err;
        }
      });

      // Keep the chain alive; swallow errors so one failed batch doesn't
      // permanently break subsequent appends for this save.
      appendQueues.set(
        saveId,
        thisWrite.catch(() => {}),
      );
      return thisWrite;
    },

    /**
     * Updates the progress cursor and optional snapshot fields on a save header.
     */
    async updateProgress(
      saveId: string,
      progressIdx: number,
      summary?: ProgressSummary,
    ): Promise<void> {
      const db = await getDbFn();
      const doc = await db.saves.findOne(saveId).exec();
      if (!doc) throw new Error(`Save not found: ${saveId}`);
      await doc.patch({
        progressIdx,
        updatedAt: Date.now(),
        ...(summary?.scoreSnapshot !== undefined && { scoreSnapshot: summary.scoreSnapshot }),
        ...(summary?.inningSnapshot !== undefined && { inningSnapshot: summary.inningSnapshot }),
        ...(summary?.stateSnapshot !== undefined && { stateSnapshot: summary.stateSnapshot }),
      });
    },

    /**
     * Permanently removes a save header and all its associated event documents.
     */
    async deleteSave(saveId: string): Promise<void> {
      // Clear in-memory state first so any concurrent appendEvents call that
      // starts after this point will not resurrect a zombie event stream for
      // the deleted save.
      nextIdxMap.delete(saveId);
      appendQueues.delete(saveId);
      const db = await getDbFn();
      const headerDoc = await db.saves.findOne(saveId).exec();
      if (headerDoc) await headerDoc.remove();
      const eventDocs = await db.events.find({ selector: { saveId } }).exec();
      await Promise.all(eventDocs.map((d) => d.remove()));
    },

    /** Returns all save headers ordered by most recently updated. */
    async listSaves(): Promise<SaveDoc[]> {
      const db = await getDbFn();
      const docs = await db.saves.find({ sort: [{ updatedAt: "desc" }] }).exec();
      return docs.map((d) => d.toJSON() as unknown as SaveDoc);
    },

    /**
     * Exports a save as a self-contained signed JSON string bundling the save
     * header and all its event documents.  The result can be shared and later
     * restored with `importRxdbSave`.
     */
    async exportRxdbSave(saveId: string): Promise<string> {
      const db = await getDbFn();
      const headerDoc = await db.saves.findOne(saveId).exec();
      if (!headerDoc) throw new Error(`Save not found: ${saveId}`);
      const header = headerDoc.toJSON() as unknown as SaveDoc;
      const eventDocs = await db.events
        .find({ selector: { saveId }, sort: [{ idx: "asc" }] })
        .exec();
      const events = eventDocs.map((d) => d.toJSON() as unknown as EventDoc);
      const sig = fnv1a(RXDB_EXPORT_KEY + JSON.stringify({ header, events }));
      const payload: RxdbExportedSave = { version: RXDB_EXPORT_VERSION, header, events, sig };
      return JSON.stringify(payload, null, 2);
    },

    /**
     * Imports a save from a JSON string produced by `exportRxdbSave`.
     * Verifies the signature, upserts the header, and bulk-upserts the events.
     * @returns The restored SaveDoc.
     */
    async importRxdbSave(json: string): Promise<SaveDoc> {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error("Invalid JSON");
      }
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid save file");
      const { version, header, events, sig } = parsed as RxdbExportedSave;
      if (version !== RXDB_EXPORT_VERSION) throw new Error(`Unsupported save version: ${version}`);
      if (!header || typeof header !== "object" || typeof header.id !== "string")
        throw new Error("Invalid save data");
      const expectedSig = fnv1a(RXDB_EXPORT_KEY + JSON.stringify({ header, events }));
      if (sig !== expectedSig)
        throw new Error("Save signature mismatch — file may be corrupted or from a different app");

      // Reject saves that reference custom teams that don't exist locally.
      const customTeamIds: string[] = [];
      for (const field of [header.homeTeamId, header.awayTeamId]) {
        if (field.startsWith("ct_") || field.startsWith("custom:")) {
          const id = field.startsWith("custom:") ? field.slice("custom:".length) : field;
          customTeamIds.push(id);
        }
      }
      const db = await getDbFn();
      if (customTeamIds.length > 0) {
        const missingCount = (
          await Promise.all(customTeamIds.map((id) => db.customTeams.findOne(id).exec()))
        ).filter((doc) => doc === null).length;
        if (missingCount > 0) {
          const teamWord = missingCount === 1 ? "team" : "teams";
          throw new Error(
            `Cannot import save: ${missingCount} custom ${teamWord} used by this save ${missingCount === 1 ? "is" : "are"} not installed on this device. Import the missing ${teamWord} first via the Teams page, then retry the save import.`,
          );
        }
      }
      // Strip legacy fields that were removed from the schema (e.g. matchupMode
      // dropped in v2). Without this, old save bundles persist obsolete fields.
      const { matchupMode: _drop, ...cleanHeader } = header as Record<string, unknown>;
      await db.saves.upsert(cleanHeader as SaveDoc);
      if (Array.isArray(events) && events.length > 0) {
        await db.events.bulkUpsert(events);
      }
      // Force counter re-initialization on next append so it reads the imported
      // event count rather than using a stale in-memory value.
      nextIdxMap.delete(cleanHeader.id as string);
      appendQueues.delete(cleanHeader.id as string);
      return cleanHeader as SaveDoc;
    },
  };
}

/** Default SaveStore backed by the IndexedDB singleton. */
export const SaveStore = buildStore(getDb);

/**
 * Factory for creating a SaveStore with a custom db getter — useful for tests
 * where a fresh in-memory database should be injected.
 */
export const makeSaveStore = (getDbFn: GetDb) => buildStore(getDbFn);
