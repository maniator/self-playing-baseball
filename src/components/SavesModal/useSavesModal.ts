import * as React from "react";

import type { State, Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { useSaveStore } from "@hooks/useSaveStore";
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
    managedTeam: 0 | 1;
    managerMode: boolean;
  }) => void;
}

export interface SavesModalState {
  ref: React.RefObject<HTMLDialogElement | null>;
  saves: SaveDoc[];
  importText: string;
  importError: string | null;
  setImportText: (v: string) => void;
  open: () => void;
  close: () => void;
  handleSave: () => void;
  handleLoad: (slot: SaveDoc) => void;
  handleDelete: (id: string) => void;
  handleExport: (slot: SaveDoc) => void;
  handleImportPaste: () => void;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useSavesModal = ({
  strategy,
  managedTeam,
  managerMode,
  currentSaveId,
  onSaveIdChange,
  onSetupRestore,
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

  const [importText, setImportText] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);

  const log = (msg: string) => dispatchLog({ type: "log", payload: msg });

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  const handleSave = () => {
    const name = `${teams[0]} vs ${teams[1]} · Inning ${inning}`;
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
        .catch(() => {});
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
        .catch(() => {});
    }
  };

  const handleLoad = (slot: SaveDoc) => {
    const snap = slot.stateSnapshot;
    if (snap) {
      if (snap.rngState !== null) restoreRng(snap.rngState);
      dispatch({ type: "restore_game", payload: snap.state });
    }
    if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
      const url = new URL(window.location.href);
      url.searchParams.set("seed", slot.seed);
      window.history.replaceState(null, "", url.toString());
    }
    const { setup } = slot;
    onSetupRestore?.({
      strategy: setup.strategy,
      managedTeam: setup.managedTeam ?? 0,
      managerMode: setup.managerMode,
    });
    onSaveIdChange(slot.id);
    log(`Loaded: ${slot.name}`);
    close();
  };

  const handleDelete = (id: string) => {
    deleteSave(id)
      .then(() => {
        if (currentSaveId === id) onSaveIdChange(null);
      })
      .catch(() => {});
  };

  const handleExport = (slot: SaveDoc) => {
    exportRxdbSave(slot.id)
      .then((json) => {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ballgame-${slot.name
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  const applyImport = (json: string) => {
    importRxdbSave(json)
      .then(() => {
        setImportText("");
        setImportError(null);
        log("Save imported!");
      })
      .catch((e: Error) => {
        setImportError(e.message);
      });
  };

  const handleImportPaste = () => applyImport(importText);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") applyImport(result);
    };
    reader.onerror = () => setImportError("Failed to read file");
    reader.readAsText(file);
    e.target.value = "";
  };

  return {
    ref,
    saves,
    importText,
    importError,
    setImportText,
    open,
    close,
    handleSave,
    handleLoad,
    handleDelete,
    handleExport,
    handleImportPaste,
    handleFileImport,
  };
};
