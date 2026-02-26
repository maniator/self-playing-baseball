import * as React from "react";

import {
  resolveCustomIdsInString,
  resolveTeamLabel,
} from "@features/customTeams/adapters/customTeamAdapter";

import type { State, Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { useImportSave } from "@hooks/useImportSave";
import { useSaveStore } from "@hooks/useSaveStore";
import { downloadJson, saveFilename } from "@storage/saveIO";
import type { GameSaveSetup, SaveDoc } from "@storage/types";
import { getRngState, restoreRng } from "@utils/rng";
import { currentSeedStr } from "@utils/saves";

interface Params {
  strategy: Strategy;
  managedTeam: 0 | 1;
  managerMode: boolean;
  currentSaveId: string | null;
  onSaveIdChange: (id: string | null) => void;
  onSetupRestore?: (setup: {
    strategy: Strategy;
    managedTeam: 0 | 1 | null;
    managerMode: boolean;
  }) => void;
  onLoadActivate?: (saveId: string) => void;
}

export interface SavesModalState {
  ref: React.RefObject<HTMLDialogElement | null>;
  saves: SaveDoc[];
  /** Current paste-JSON textarea value (alias: pasteJson from useImportSave). */
  importText: string;
  importError: string | null;
  setImportText: (v: string) => void;
  /** True while an import is in-flight — use to disable the import button. */
  importing: boolean;
  open: () => void;
  close: () => void;
  handleSave: () => void;
  handleLoad: (slot: SaveDoc) => void;
  handleDelete: (id: string) => void;
  handleExport: (slot: SaveDoc) => void;
  handleImportPaste: () => void;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Replaces any `custom:<id>` fragment in a save name with the resolved display label. */
  resolveSaveName: (name: string) => string;
}

export const useSavesModal = ({
  strategy,
  managedTeam,
  managerMode,
  currentSaveId,
  onSaveIdChange,
  onSetupRestore,
  onLoadActivate,
}: Params): SavesModalState => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const {
    dispatch,
    dispatchLog,
    log: _log,
    teams,
    inning,
    pitchKey,
    ...gameStateRest
  } = useGameContext();
  void _log;

  // Reactive saves list — auto-updates when any save is mutated in RxDB.
  const { saves, createSave, updateProgress, deleteSave, exportRxdbSave, importRxdbSave } =
    useSaveStore();

  // Custom team docs for resolving human-readable labels on save names.
  const { teams: customTeams } = useCustomTeams();

  const log = (msg: string) => dispatchLog({ type: "log", payload: msg });

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  const handleSave = () => {
    const teamLabel = (id: string) => resolveTeamLabel(id, customTeams);
    const name = `${teamLabel(teams[0])} vs ${teamLabel(teams[1])} · Inning ${inning}`;
    const fullState: State = { ...gameStateRest, teams, inning, pitchKey } as State;
    const setup: GameSaveSetup = {
      strategy,
      managedTeam,
      managerMode,
      homeTeam: teams[1],
      awayTeam: teams[0],
      playerOverrides: [fullState.playerOverrides[0], fullState.playerOverrides[1]],
      lineupOrder: [fullState.lineupOrder[0], fullState.lineupOrder[1]],
    };

    if (currentSaveId) {
      // Update the existing save with a fresh state snapshot.
      updateProgress(currentSaveId, pitchKey, {
        scoreSnapshot: { away: fullState.score[0], home: fullState.score[1] },
        inningSnapshot: { inning: fullState.inning, atBat: fullState.atBat },
        stateSnapshot: { state: fullState, rngState: getRngState() },
      })
        .then(() => {
          log("Game saved!");
        })
        .catch((err: unknown) => {
          log(`Failed to save game: ${err instanceof Error ? err.message : String(err)}`);
        });
    } else {
      // Create a new explicit snapshot save.
      createSave(
        {
          matchupMode: "manual",
          homeTeamId: teams[1],
          awayTeamId: teams[0],
          seed: currentSeedStr(),
          setup,
        },
        { name },
      )
        .then(async (id) => {
          await updateProgress(id, pitchKey, {
            scoreSnapshot: { away: fullState.score[0], home: fullState.score[1] },
            inningSnapshot: { inning: fullState.inning, atBat: fullState.atBat },
            stateSnapshot: { state: fullState, rngState: getRngState() },
          });
          onSaveIdChange(id);
          log("Game saved!");
        })
        .catch((err: unknown) => {
          log(`Failed to save game: ${err instanceof Error ? err.message : String(err)}`);
        });
    }
  };

  const handleLoad = (slot: SaveDoc) => {
    // Use the slot's own snapshot if available; otherwise fall back to the
    // most recently-updated save that has a snapshot for the same seed.
    // This lets a manual save (which always snapshots immediately) rescue an
    // auto-save that hasn't yet crossed a half-inning boundary.
    const snap =
      slot.stateSnapshot ??
      saves
        .filter((s) => s.seed === slot.seed && s.stateSnapshot != null)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.stateSnapshot;

    if (!snap) {
      log(`Unable to load save "${slot.name}" — no state snapshot available yet.`);
      return;
    }
    if (snap.rngState !== null) restoreRng(snap.rngState);
    dispatch({ type: "restore_game", payload: snap.state });
    if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
      const url = new URL(window.location.href);
      url.searchParams.set("seed", slot.seed);
      window.history.replaceState(null, "", url.toString());
    }
    const { setup } = slot;
    onSetupRestore?.({
      strategy: setup.strategy,
      managedTeam: setup.managedTeam,
      managerMode: setup.managerMode,
    });
    onSaveIdChange(slot.id);
    onLoadActivate?.(slot.id);
    log(`Loaded: ${slot.name}`);
    close();
  };

  const handleDelete = (id: string) => {
    deleteSave(id)
      .then(() => {
        if (currentSaveId === id) onSaveIdChange(null);
      })
      .catch((err: unknown) => {
        log(`Failed to delete save: ${err instanceof Error ? err.message : String(err)}`);
      });
  };

  const handleExport = (slot: SaveDoc) => {
    exportRxdbSave(slot.id)
      .then((json) => {
        downloadJson(json, saveFilename(slot.name));
      })
      .catch((err: unknown) => {
        log(`Failed to export save: ${err instanceof Error ? err.message : String(err)}`);
      });
  };

  // Use the shared import hook; pass raw error messages (modal consumers are
  // in-game and can tolerate technical wording; friendlyImportError is default
  // for the full-page SavesPage).
  const {
    pasteJson: importText,
    setPasteJson: setImportText,
    importError,
    importing,
    handleFileImport,
    handlePasteImport: handleImportPaste,
  } = useImportSave({
    importFn: importRxdbSave,
    onSuccess: (importedSave) => {
      log("Save imported!");
      handleLoad(importedSave);
    },
    formatError: (raw) => raw,
  });

  /**
   * Replaces any `custom:<id>` fragment in a save name with the resolved
   * display label. Uses a broad token pattern so hyphenated or otherwise
   * non-alphanumeric-underscore IDs are also matched correctly.
   */
  const resolveSaveName = (name: string): string => resolveCustomIdsInString(name, customTeams);

  return {
    ref,
    saves,
    importText,
    importError,
    setImportText,
    importing,
    open,
    close,
    handleSave,
    handleLoad,
    handleDelete,
    handleExport,
    handleImportPaste,
    handleFileImport,
    resolveSaveName,
  };
};
