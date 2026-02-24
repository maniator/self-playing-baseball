import * as React from "react";

import type { Strategy } from "@context/index";
import type { SaveDoc } from "@storage/types";

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
  onSetupRestore?: (setup: {
    strategy: Strategy;
    managedTeam: 0 | 1 | null;
    managerMode: boolean;
  }) => void;
  onLoadActivate?: (saveId: string) => void;
  autoOpen?: boolean;
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
      <SavesButton
        $variant="saves"
        onClick={open}
        aria-label="Open saves panel"
        data-testid="saves-button"
      >
        💾 Saves
      </SavesButton>

      <Dialog ref={ref} onClick={handleClick} data-testid="saves-modal">
        <DialogTitle>💾 Saves</DialogTitle>

        <SmallButton onClick={handleSave} data-testid="save-game-button">
          {props.currentSaveId ? "Update save" : "Save current game"}
        </SmallButton>

        <SectionHeading>Saved games</SectionHeading>
        {saves.length === 0 ? (
          <EmptyMsg>No saves yet.</EmptyMsg>
        ) : (
          <SlotList>
            {saves.map((s: SaveDoc) => (
              <SlotItem key={s.id}>
                <SlotName title={s.name}>{s.name}</SlotName>
                <SlotDate data-testid="slot-date">{formatDate(s.updatedAt)}</SlotDate>
                <SmallButton onClick={() => handleLoad(s)} data-testid="load-save-button">
                  Load
                </SmallButton>
                <SmallButton onClick={() => handleExport(s)} data-testid="export-save-button">
                  Export
                </SmallButton>
                <DangerButton onClick={() => handleDelete(s.id)} aria-label="Delete save">
                  ✕
                </DangerButton>
              </SlotItem>
            ))}
          </SlotList>
        )}

        <SectionHeading>Import save</SectionHeading>
        <Row>
          <FileInput
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            data-testid="import-save-file-input"
          />
        </Row>
        <ImportArea
          rows={4}
          placeholder="…or paste exported JSON here"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          aria-label="Import save JSON"
          data-testid="import-save-textarea"
        />
        {importError && <ErrorMsg data-testid="import-error">{importError}</ErrorMsg>}
        <Row>
          <SmallButton
            onClick={handleImportPaste}
            disabled={!importText.trim()}
            data-testid="import-save-button"
          >
            Import from text
          </SmallButton>
        </Row>

        <CloseButton onClick={close}>Close</CloseButton>
      </Dialog>
    </>
  );
};

export default SavesModal;
