import * as React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { PlayerCustomization, TeamCustomPlayerOverrides } from "@context/index";
import type { Player } from "@utils/roster";

import { BATTER_MOD_FIELDS, BATTER_STAT_LABELS, MOD_OPTIONS } from "./constants";
import {
  BaseStat,
  DragHandle,
  ModLabel,
  ModSelect,
  NicknameInput,
  PlayerRow,
  PosTag,
} from "./PlayerCustomizationPanel.styles";

const BATTER_BASE_KEYS = ["contact", "power", "speed"] as const;

type Props = {
  player: Player;
  overrides: TeamCustomPlayerOverrides;
  onFieldChange: (id: string, field: keyof PlayerCustomization, raw: string) => void;
};

const SortableBatterRow: React.FunctionComponent<Props> = ({
  player,
  overrides,
  onFieldChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const nick = (overrides[player.id]?.nickname as string | undefined) ?? "";
  const getMod = (field: keyof PlayerCustomization) => {
    const v = overrides[player.id]?.[field];
    return v === undefined ? "0" : String(v);
  };
  return (
    <PlayerRow ref={setNodeRef} style={style}>
      <DragHandle {...attributes} {...listeners} aria-label={`Drag ${player.position}`}>
        ⠿
      </DragHandle>
      <PosTag>{player.position}</PosTag>
      <NicknameInput
        type="text"
        placeholder="Nickname"
        maxLength={20}
        value={nick}
        onChange={(e) => onFieldChange(player.id, "nickname", e.target.value)}
        aria-label={`${player.position} nickname`}
      />
      {BATTER_MOD_FIELDS.map((field, i) => (
        <ModLabel key={field}>
          {BATTER_STAT_LABELS[i]}
          <BaseStat>{player.baseStats[BATTER_BASE_KEYS[i]]}</BaseStat>
          <ModSelect
            value={getMod(field)}
            onChange={(e) => onFieldChange(player.id, field, e.target.value)}
            aria-label={`${player.position} ${BATTER_STAT_LABELS[i]}`}
          >
            {MOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ModSelect>
        </ModLabel>
      ))}
    </PlayerRow>
  );
};

export default SortableBatterRow;
