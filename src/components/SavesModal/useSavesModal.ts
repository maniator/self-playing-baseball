import * as React from "react";

import type { Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import {
  buildSlotFields,
  deleteSave,
  exportSave,
  importSave,
  loadAutoSave,
  loadSaves,
  restoreSaveRng,
  saveGame,
  type SaveSetup,
  type SaveSlot,
} from "@utils/saves";

interface Params {
  strategy: Strategy;
  managedTeam: 0 | 1;
  managerMode: boolean;
  currentSaveId: string | null;
  onSaveIdChange: (id: string | null) => void;
  onSetupRestore?: (setup: SaveSetup) => void;
}

export interface SavesModalState {
  ref: React.RefObject<HTMLDialogElement | null>;
  saves: SaveSlot[];
  autoSave: SaveSlot | null;
  importText: string;
  importError: string | null;
  setImportText: (v: string) => void;
  open: () => void;
  close: () => void;
  handleSave: () => void;
  handleLoad: (slot: SaveSlot) => void;
  handleDelete: (id: string) => void;
  handleExport: (slot: SaveSlot) => void;
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
  const { dispatch, dispatchLog, teams, inning, pitchKey, decisionLog, ...rest } = useGameContext();
  const [saves, setSaves] = React.useState<SaveSlot[]>([]);
  const [autoSave, setAutoSave] = React.useState<SaveSlot | null>(null);
  const [importText, setImportText] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);

  const log = (msg: string) => dispatchLog({ type: "log", payload: msg });

  const refresh = () => {
    setSaves(loadSaves());
    setAutoSave(loadAutoSave());
  };

  const open = () => {
    refresh();
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const handleSave = () => {
    const name = `${teams[0]} vs ${teams[1]} · Inning ${inning}`;
    // Only pass State fields (strip dispatch/dispatchLog/log from ContextValue).
    const { log: _log, ...gameState } = rest;
    void _log;
    const fullState = { ...gameState, teams, inning, pitchKey, decisionLog };
    const setup: SaveSetup = {
      homeTeam: teams[1],
      awayTeam: teams[0],
      strategy,
      managedTeam,
      managerMode,
    };
    const slot = saveGame({
      id: currentSaveId ?? undefined,
      name,
      ...buildSlotFields(fullState, setup),
    });
    onSaveIdChange(slot.id);
    refresh();
    log("Game saved!");
  };

  const handleLoad = (slot: SaveSlot) => {
    restoreSaveRng(slot);
    if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
      const url = new URL(window.location.href);
      url.searchParams.set("seed", slot.seed);
      window.history.replaceState(null, "", url.toString());
    }
    dispatch({ type: "restore_game", payload: slot.state });
    onSetupRestore?.(slot.setup);
    onSaveIdChange(slot.id);
    log(`Loaded: ${slot.name}`);
    close();
  };

  const handleDelete = (id: string) => {
    deleteSave(id);
    if (currentSaveId === id) onSaveIdChange(null);
    refresh();
  };

  const handleExport = (slot: SaveSlot) => {
    const json = exportSave(slot);
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
  };

  const applyImport = (json: string) => {
    try {
      const slot = importSave(json);
      saveGame(slot);
      refresh();
      setImportText("");
      setImportError(null);
      log("Save imported!");
    } catch (e) {
      setImportError((e as Error).message);
    }
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
    autoSave,
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
