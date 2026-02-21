import * as React from "react";

import { savesCollection } from "@storage/db";
import { SaveStore } from "@storage/saveStore";
import type { GameEvent, GameSetup, ProgressSummary, SaveDoc } from "@storage/types";

export interface SaveStoreHook {
  /** Reactively-updated list of all saves, sorted by most recently updated. */
  saves: SaveDoc[];
  /** True until the RxDB subscription has emitted its first result. */
  savesLoading: boolean;
  createSave: (setup: GameSetup, meta?: { name?: string }) => Promise<string>;
  appendEvents: (saveId: string, events: GameEvent[]) => Promise<void>;
  updateProgress: (saveId: string, progressIdx: number, summary?: ProgressSummary) => Promise<void>;
  deleteSave: (saveId: string) => Promise<void>;
  exportRxdbSave: (saveId: string) => Promise<string>;
  importRxdbSave: (json: string) => Promise<string>;
}

/**
 * React hook for accessing RxDB saves.
 *
 * Subscribes to the `saves` collection via RxDB's built-in `find().$`
 * observable so the returned `saves` list re-renders automatically whenever
 * any save is created, updated, or deleted — no manual `refresh()` needed.
 *
 * All write operations are stable `useCallback` wrappers around `SaveStore`.
 */
export const useSaveStore = (): SaveStoreHook => {
  const [saves, setSaves] = React.useState<SaveDoc[]>([]);
  const [savesLoading, setSavesLoading] = React.useState(true);

  React.useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;

    savesCollection()
      .then((col) => {
        sub = col.find({ sort: [{ updatedAt: "desc" }] }).$.subscribe((docs) => {
          setSaves(docs.map((d) => d.toJSON() as unknown as SaveDoc));
          setSavesLoading(false);
        });
      })
      .catch(() => {
        setSavesLoading(false);
      });

    return () => sub?.unsubscribe();
  }, []);

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
    savesLoading,
    createSave,
    appendEvents,
    updateProgress,
    deleteSave,
    exportRxdbSave,
    importRxdbSave,
  };
};
