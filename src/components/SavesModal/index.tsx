import * as React from "react";

import type { Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { getSeed } from "@utils/rng";
import {
  deleteSave,
  exportSave,
  importSave,
  loadSaves,
  saveGame,
  type SaveSlot,
} from "@utils/saves";

import {
  CloseButton,
  DangerButton,
  Dialog,
  DialogTitle,
  EmptyMsg,
  ErrorMsg,
  FileInput,
  ImportArea,
  Row,
  SavesButton,
  SectionHeading,
  SlotDate,
  SlotItem,
  SlotList,
  SlotName,
  SmallButton,
} from "./styles";

interface Props {
  strategy: Strategy;
  managedTeam: 0 | 1;
  currentSaveId: string | null;
  onSaveIdChange: (id: string | null) => void;
}

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const SavesModal: React.FunctionComponent<Props> = ({
  strategy,
  managedTeam,
  currentSaveId,
  onSaveIdChange,
}) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const { dispatch, dispatchLog, teams, inning, pitchKey, decisionLog, ...gameState } =
    useGameContext();
  const [saves, setSaves] = React.useState<SaveSlot[]>([]);
  const [importText, setImportText] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);

  const log = (msg: string) => dispatchLog({ type: "log", payload: msg });

  const refresh = () => setSaves(loadSaves());

  const open = () => {
    refresh();
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const handleSave = () => {
    const seed = getSeed()?.toString(36) ?? "0";
    const name = `${teams[0]} vs ${teams[1]} · Inning ${inning}`;
    const fullState = { ...gameState, teams, inning, pitchKey, decisionLog };
    const slot = saveGame({
      id: currentSaveId ?? undefined,
      name,
      seed,
      progress: pitchKey,
      managerActions: decisionLog,
      setup: { homeTeam: teams[1], awayTeam: teams[0], strategy, managedTeam },
      state: fullState,
    });
    onSaveIdChange(slot.id);
    refresh();
    log("Game saved!");
  };

  const handleLoad = (slot: SaveSlot) => {
    dispatch({ type: "restore_game", payload: slot.state });
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
    a.download = `ballgame-save-${slot.id}.json`;
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
    reader.onload = (ev) => applyImport(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) close();
  };

  return (
    <>
      <SavesButton onClick={open} aria-label="Open saves panel">
        💾 Saves
      </SavesButton>

      <Dialog ref={ref} onClick={handleClick}>
        <DialogTitle>💾 Saves</DialogTitle>

        <SmallButton onClick={handleSave}>
          {currentSaveId ? "Update save" : "Save current game"}
        </SmallButton>

        <SectionHeading>Saved games</SectionHeading>
        {saves.length === 0 ? (
          <EmptyMsg>No saves yet.</EmptyMsg>
        ) : (
          <SlotList>
            {saves.map((s) => (
              <SlotItem key={s.id}>
                <SlotName title={s.name}>{s.name}</SlotName>
                <SlotDate>{formatDate(s.updatedAt)}</SlotDate>
                <SmallButton onClick={() => handleLoad(s)}>Load</SmallButton>
                <SmallButton onClick={() => handleExport(s)}>Export</SmallButton>
                <DangerButton onClick={() => handleDelete(s.id)}>✕</DangerButton>
              </SlotItem>
            ))}
          </SlotList>
        )}

        <SectionHeading>Import save</SectionHeading>
        <Row>
          <FileInput type="file" accept=".json,application/json" onChange={handleFileImport} />
        </Row>
        <ImportArea
          rows={4}
          placeholder="…or paste exported JSON here"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          aria-label="Import save JSON"
        />
        {importError && <ErrorMsg>{importError}</ErrorMsg>}
        <Row>
          <SmallButton onClick={handleImportPaste} disabled={!importText.trim()}>
            Import from text
          </SmallButton>
        </Row>

        <CloseButton onClick={close}>Close</CloseButton>
      </Dialog>
    </>
  );
};

export default SavesModal;
