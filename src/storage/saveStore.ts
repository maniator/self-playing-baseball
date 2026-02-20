import { type BallgameDb, getDb } from "./db";
import type { EventDoc, GameEvent, GameSetup, ProgressSummary, SaveDoc } from "./types";

const SCHEMA_VERSION = 1;

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
      });
    },

    /** Returns all save headers ordered by most recently updated. */
    async listSaves(): Promise<SaveDoc[]> {
      const db = await getDbFn();
      const docs = await db.saves.find({ sort: [{ updatedAt: "desc" }] }).exec();
      return docs.map((d) => d.toJSON() as unknown as SaveDoc);
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
