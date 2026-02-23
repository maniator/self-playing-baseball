import type { BallgameDb } from "./db";

/**
 * A summary produced by `inspectSave` — useful for debugging persistence
 * issues in development and tests without touching the application UI.
 */
export interface SaveInspection {
  /** Save document ID. */
  id: string;
  /** Human-readable save name. */
  name: string;
  /** RNG seed string used for the game. */
  seed: string;
  /** Last known progress index (-1 = not yet started). */
  progressIdx: number;
  /** Total number of event documents for this save. */
  eventCount: number;
  /** Idx value of the first event, or null when there are no events. */
  firstIdx: number | null;
  /** Idx value of the last event, or null when there are no events. */
  lastIdx: number | null;
  /**
   * Missing idx values that break the monotonic sequence.
   * E.g. if events have idx [0, 1, 3] this will be [2].
   * An empty array means no gaps — the sequence is contiguous.
   */
  idxGaps: number[];
  /** Count of events grouped by their `type` field. */
  countByType: Record<string, number>;
  /**
   * True if progressIdx is within a valid range:
   *   - −1 (sentinel for "not started"), OR
   *   - 0 ≤ progressIdx ≤ lastIdx.
   * False when progressIdx exceeds the highest stored event idx, which would
   * indicate a sync bug between the progress pointer and the event log.
   */
  progressIdxValid: boolean;
}

/**
 * Inspects a save and returns a summary for debugging / test assertions.
 * Reads the save header and all associated events from the database.
 *
 * @param db      An open BallgameDb instance.
 * @param saveId  The ID of the save document to inspect.
 * @throws        If the save document does not exist.
 */
export async function inspectSave(db: BallgameDb, saveId: string): Promise<SaveInspection> {
  const header = await db.saves.findOne(saveId).exec();
  if (!header) throw new Error(`inspectSave: save not found: ${saveId}`);

  const events = await db.events.find({ selector: { saveId }, sort: [{ idx: "asc" }] }).exec();

  const eventCount = events.length;
  const firstIdx = eventCount > 0 ? events[0].idx : null;
  const lastIdx = eventCount > 0 ? events[eventCount - 1].idx : null;

  // Detect gaps in the monotonically increasing idx sequence.
  const idxGaps: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const expected = events[i].idx + 1;
    if (events[i + 1].idx !== expected) {
      // Record every missing value between the two adjacent events.
      for (let missing = expected; missing < events[i + 1].idx; missing++) {
        idxGaps.push(missing);
      }
    }
  }

  // Count events by type.
  const countByType: Record<string, number> = {};
  for (const e of events) {
    countByType[e.type] = (countByType[e.type] ?? 0) + 1;
  }

  // Validate that progressIdx does not point past the last persisted event.
  const progressIdxValid =
    header.progressIdx === -1 || (lastIdx !== null && header.progressIdx <= lastIdx);

  return {
    id: header.id,
    name: header.name,
    seed: header.seed,
    progressIdx: header.progressIdx,
    eventCount,
    firstIdx,
    lastIdx,
    idxGaps,
    countByType,
    progressIdxValid,
  };
}
