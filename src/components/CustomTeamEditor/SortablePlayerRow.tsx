import * as React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { EditorPlayer } from "./editorState";
import {
  PlayerCard,
  PlayerHeader,
  RemoveBtn,
  StatInput,
  StatLabel,
  StatRow,
  StatsGrid,
  StatValue,
  TextInput,
} from "./styles";

type Props = {
  player: EditorPlayer;
  isPitcher?: boolean;
  onChange: (patch: Partial<EditorPlayer>) => void;
  onRemove: () => void;
};

/**
 * Drag-and-drop sortable player row using @dnd-kit/sortable.
 * Used for the lineup section of the Custom Team Editor.
 * The drag handle is the player name input row area.
 */
const SortablePlayerRow: React.FunctionComponent<Props> = ({
  player,
  isPitcher = false,
  onChange,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stat = (label: string, key: keyof EditorPlayer, htmlFor: string) => {
    const val = (player[key] as number | undefined) ?? 0;
    return (
      <StatRow key={key}>
        <StatLabel htmlFor={htmlFor}>{label}</StatLabel>
        <StatInput
          id={htmlFor}
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={(e) => onChange({ [key]: Number(e.target.value) })}
        />
        <StatValue>{val}</StatValue>
      </StatRow>
    );
  };

  return (
    <PlayerCard ref={setNodeRef} style={style}>
      <PlayerHeader>
        {/* Drag handle via grip icon on the header */}
        <span
          {...attributes}
          {...listeners}
          aria-label={`Drag ${player.name || "player"} to reorder`}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            color: "#4a6090",
            fontSize: "16px",
            flexShrink: 0,
            lineHeight: 1,
            padding: "0 4px",
            touchAction: "none",
          }}
        >
          ⠿
        </span>
        <TextInput
          value={player.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Player name"
          aria-label="Player name"
          aria-invalid={!player.name.trim() ? "true" : undefined}
          style={{ flex: 1 }}
        />
        <RemoveBtn type="button" onClick={onRemove} aria-label="Remove player">
          ✕
        </RemoveBtn>
      </PlayerHeader>
      <StatsGrid>
        {stat("Contact", "contact", `contact-${player.id}`)}
        {stat("Power", "power", `power-${player.id}`)}
        {stat("Speed", "speed", `speed-${player.id}`)}
        {isPitcher && stat("Velocity", "velocity", `velocity-${player.id}`)}
        {isPitcher && stat("Control", "control", `control-${player.id}`)}
        {isPitcher && stat("Movement", "movement", `movement-${player.id}`)}
      </StatsGrid>
    </PlayerCard>
  );
};

export default SortablePlayerRow;
