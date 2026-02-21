import { type BallgameDb, getDb } from "./db";
import type {
  EventDoc,
  GameEvent,
  GameSetup,
  ProgressSummary,
  RxdbExportedSave,
  SaveDoc,
} from "./types";

const SCHEMA_VERSION = 1;
const RXDB_EXPORT_VERSION = 1 as const;
const RXDB_EXPORT_KEY = "ballgame:rxdb:v1";

// FNV-1a 32-bit checksum — fast and deterministic, used here for integrity
// verification only (tamper/corruption detection, not cryptographic security).
const fnv1a = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

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
      const id = `save_${now}_${Math.random().toString(36).slice(2, 8)}`;
      const doc: SaveDoc = {
        id,
        name: meta?.name ?? `${setup.homeTeamId} vs ${setup.awayTeamId}`,
        seed: setup.seed,
        matchupMode: setup.matchupMode,
        homeTeamId: setup.homeTeamId,
        awayTeamId: setup.awayTeamId,
        createdAt: now,
        updatedAt: now,
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
      const db = await getDbFn();
      const headerDoc = await db.saves.findOne(saveId).exec();
      if (headerDoc) await headerDoc.remove();
      const eventDocs = await db.events.find({ selector: { saveId } }).exec();
      await Promise.all(eventDocs.map((d) => d.remove()));
      // Purge in-memory state so a future save reusing the same id starts fresh.
      nextIdxMap.delete(saveId);
      appendQueues.delete(saveId);
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
     * @returns The restored saveId.
     */
    async importRxdbSave(json: string): Promise<string> {
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
      const db = await getDbFn();
      await db.saves.upsert(header);
      if (Array.isArray(events) && events.length > 0) {
        await db.events.bulkUpsert(events);
      }
      // Force counter re-initialization on next append so it reads the imported
      // event count rather than using a stale in-memory value.
      nextIdxMap.delete(header.id);
      appendQueues.delete(header.id);
      return header.id;
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
