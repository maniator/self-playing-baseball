import * as React from "react";

import { useLiveRxQuery } from "rxdb/plugins/react";

import { SaveStore } from "@storage/saveStore";
import type { GameEvent, GameSetup, ProgressSummary, SaveDoc } from "@storage/types";

export interface SaveStoreHook {
  /** Reactively-updated list of all saves, sorted by most recently updated. */
  saves: SaveDoc[];
  createSave: (setup: GameSetup, meta?: { name?: string }) => Promise<string>;
  appendEvents: (saveId: string, events: GameEvent[]) => Promise<void>;
  updateProgress: (saveId: string, progressIdx: number, summary?: ProgressSummary) => Promise<void>;
  deleteSave: (saveId: string) => Promise<void>;
  exportRxdbSave: (saveId: string) => Promise<string>;
  importRxdbSave: (json: string) => Promise<SaveDoc>;
}

const SAVES_QUERY = { selector: {}, sort: [{ updatedAt: "desc" as const }] };

/**
 * React hook for accessing RxDB saves.
 *
 * Uses RxDB's built-in `useLiveRxQuery` (from `rxdb/plugins/react`) so the
 * returned `saves` list re-renders automatically whenever any save is created,
 * updated, or deleted — no manual refresh needed.
 *
 * Requires `<RxDatabaseProvider>` to be present in the component tree.
 * All write operations are stable `useCallback` wrappers around `SaveStore`.
 */
export const useSaveStore = (): SaveStoreHook => {
  const { results } = useLiveRxQuery<SaveDoc>({
    collection: "saves",
    query: SAVES_QUERY,
  });

  const saves = React.useMemo(
    () => results.map((d) => d.toJSON() as unknown as SaveDoc),
    [results],
  );

  const createSave = React.useCallback(
    (setup: GameSetup, meta?: { name?: string }) => SaveStore.createSave(setup, meta),
    [],
  );

  const appendEvents = React.useCallback(
    (saveId: string, events: GameEvent[]) => SaveStore.appendEvents(saveId, events),
    [],
  );

  const updateProgress = React.useCallback(
    (saveId: string, progressIdx: number, summary?: ProgressSummary) =>
      SaveStore.updateProgress(saveId, progressIdx, summary),
    [],
  );

  const deleteSave = React.useCallback((saveId: string) => SaveStore.deleteSave(saveId), []);

  const exportRxdbSave = React.useCallback(
    (saveId: string) => SaveStore.exportRxdbSave(saveId),
    [],
  );

  const importRxdbSave = React.useCallback((json: string) => SaveStore.importRxdbSave(json), []);

  return {
    saves,
    createSave,
    appendEvents,
    updateProgress,
    deleteSave,
    exportRxdbSave,
    importRxdbSave,
  };
};
