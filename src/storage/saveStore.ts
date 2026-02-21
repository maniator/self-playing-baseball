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
      return id;
    },

    /**
     * Appends a batch of events for a save.
     * Events are stored as individual documents with a deterministic
     * `${saveId}:${idx}` primary key. The starting index is derived from
     * the current highest idx stored for this save.
     */
    async appendEvents(saveId: string, events: GameEvent[]): Promise<void> {
      if (events.length === 0) return;
      const db = await getDbFn();

      // Determine the current highest idx for this save.
      const existing = await db.events
        .find({
          selector: { saveId },
          sort: [{ idx: "desc" }],
          limit: 1,
        })
        .exec();

      const startIdx = existing.length > 0 ? existing[0].idx + 1 : 0;
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

      await db.events.bulkInsert(docs);
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
