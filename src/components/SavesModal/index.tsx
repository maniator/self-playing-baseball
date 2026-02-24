import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";

import type { Strategy } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
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
  /**
   * When provided, overrides the modal's built-in close action.
   * Called instead of closing the dialog when the user clicks Close,
   * the backdrop, or presses Escape. Used to route Home when no game
   * has been started yet (Load Saved Game entry path).
   */
  onRequestClose?: () => void;
  /** Label for the close button. Defaults to "Close". */
  closeLabel?: string;
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

  // Resolve custom team IDs to human-readable labels for the saves list display.
  const { teams: customTeams } = useCustomTeams();
  /** Replace any `custom:ct_...` fragment in a save name with the resolved team name. */
  const resolveSaveName = (name: string): string =>
    name.replace(/custom:[a-zA-Z0-9_]+/g, (id) => resolveTeamLabel(id, customTeams));

  // When onRequestClose is provided it overrides the built-in close so the
  // caller can intercept close attempts (e.g. route back to Home).
  const handleClose = props.onRequestClose ?? close;

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

        <SmallButton onClick={handleSave} data-testid="save-game-button">
          {props.currentSaveId ? "Update save" : "Save current game"}
        </SmallButton>

        <SectionHeading>Saved games</SectionHeading>
        {saves.length === 0 ? (
          <EmptyMsg>No saves yet.</EmptyMsg>
        ) : (
          <SlotList>
            {saves.map((s: SaveDoc) => {
              const displayName = resolveSaveName(s.name);
              return (
                <SlotItem key={s.id}>
                  <SlotName title={displayName}>{displayName}</SlotName>
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
              );
            })}
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

        <CloseButton onClick={handleClose} data-testid="saves-modal-close-button">
          {props.closeLabel ?? "Close"}
        </CloseButton>
      </Dialog>
    </>
  );
};

export default SavesModal;
