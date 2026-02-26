import * as React from "react";

import SaveSlotList from "@components/SaveSlotList";
import type { Strategy } from "@context/index";

import {
  CloseButton,
  Dialog,
  DialogTitle,
  EmptyMsg,
  ErrorMsg,
  FileInput,
  ImportArea,
  Row,
  SavesButton,
  SectionHeading,
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
  /** When true a real game session is active and "Save current game" is shown. */
  gameStarted?: boolean;
}

const SavesModal: React.FunctionComponent<Props> = (props) => {
  const {
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
  } = useSavesModal(props);

  // When onRequestClose is provided it overrides the built-in close so the
  // caller can intercept close attempts (e.g. route back to Home).
  const handleClose = close;

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Guard: if the dialog was already closed (e.g. by a programmatic close()
    // inside a child button handler), the click event still bubbles here.
    // getBoundingClientRect() returns all-zeros on a closed dialog, so every
    // screen coordinate would be "outside" — falsely triggering handleClose.
    if (!ref.current?.open) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) handleClose();
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

      <Dialog
        ref={ref}
        onClick={handleClick}
        onCancel={(e) => {
          e.preventDefault();
          handleClose();
        }}
        data-testid="saves-modal"
      >
        <DialogTitle>💾 Saves</DialogTitle>

        {props.gameStarted && (
          <SmallButton onClick={handleSave} data-testid="save-game-button">
            {props.currentSaveId ? "Update save" : "Save current game"}
          </SmallButton>
        )}

        <SectionHeading>Saved games</SectionHeading>
        {saves.length === 0 ? (
          <EmptyMsg>No saves yet.</EmptyMsg>
        ) : (
          <SaveSlotList
            saves={saves}
            resolveName={resolveSaveName}
            onLoad={handleLoad}
            onExport={handleExport}
            onDelete={handleDelete}
            listTestId="saves-modal-list"
          />
        )}

        <SectionHeading>Import save</SectionHeading>
        <Row>
          <FileInput
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            disabled={importing}
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
            disabled={!importText.trim() || importing}
            data-testid="import-save-button"
          >
            {importing ? "Importing…" : "Import from text"}
          </SmallButton>
        </Row>

        <CloseButton onClick={handleClose} data-testid="saves-modal-close-button">
          Close
        </CloseButton>
      </Dialog>
    </>
  );
};

export default SavesModal;
