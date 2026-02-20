import * as React from "react";

import type { Strategy } from "@context/index";
import type { SaveSetup } from "@utils/saves";

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
import { useSavesModal } from "./useSavesModal";

interface Props {
  strategy: Strategy;
  managedTeam: 0 | 1;
  managerMode: boolean;
  currentSaveId: string | null;
  onSaveIdChange: (id: string | null) => void;
  onSetupRestore?: (setup: SaveSetup) => void;
}

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const SavesModal: React.FunctionComponent<Props> = (props) => {
  const {
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
  } = useSavesModal(props);

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
          {props.currentSaveId ? "Update save" : "Save current game"}
        </SmallButton>

        {autoSave && (
          <>
            <SectionHeading>Auto-save</SectionHeading>
            <SlotList>
              <SlotItem>
                <SlotName title={autoSave.name}>{autoSave.name}</SlotName>
                <SlotDate>{formatDate(autoSave.updatedAt)}</SlotDate>
                <SmallButton onClick={() => handleLoad(autoSave)}>Load</SmallButton>
                <SmallButton onClick={() => handleExport(autoSave)}>Export</SmallButton>
              </SlotItem>
            </SlotList>
          </>
        )}

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
                <DangerButton onClick={() => handleDelete(s.id)} aria-label="Delete save">
                  ✕
                </DangerButton>
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
