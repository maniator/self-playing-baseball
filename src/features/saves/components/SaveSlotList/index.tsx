import * as React from "react";

import { formatSaveDate } from "@storage/saveIO";
import type { SaveDoc } from "@storage/types";

import { ActionBtn, SaveActions, SaveCard, SaveDate, SaveInfo, SaveList, SaveName } from "./styles";

interface Props {
  saves: SaveDoc[];
  /** Optional: transform a save name before display (e.g. resolve custom: IDs). Defaults to identity. */
  resolveName?: (name: string) => string;
  onLoad: (slot: SaveDoc) => void;
  onExport: (slot: SaveDoc) => void;
  onDelete: (id: string) => void;
  /** data-testid for the <ul> element. Default: "saves-list" */
  listTestId?: string;
}

const SaveSlotList: React.FunctionComponent<Props> = ({
  saves,
  resolveName,
  onLoad,
  onExport,
  onDelete,
  listTestId = "saves-list",
}) => {
  return (
    <SaveList data-testid={listTestId}>
      {saves.map((s) => {
        const displayName = resolveName?.(s.name) ?? s.name;
        return (
          <SaveCard key={s.id} data-testid="saves-list-item">
            <SaveInfo>
              <SaveName title={displayName}>{displayName}</SaveName>
              <SaveDate data-testid="slot-date">{formatSaveDate(s.updatedAt)}</SaveDate>
            </SaveInfo>
            <SaveActions>
              <ActionBtn
                type="button"
                $variant="primary"
                onClick={() => onLoad(s)}
                data-testid="load-save-button"
              >
                Load
              </ActionBtn>
              <ActionBtn type="button" onClick={() => onExport(s)} data-testid="export-save-button">
                Export
              </ActionBtn>
              <ActionBtn
                type="button"
                $variant="danger"
                onClick={() => onDelete(s.id)}
                aria-label="Delete save"
                data-testid="delete-save-button"
              >
                ✕
              </ActionBtn>
            </SaveActions>
          </SaveCard>
        );
      })}
    </SaveList>
  );
};

export default SaveSlotList;
