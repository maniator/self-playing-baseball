import * as React from "react";

import type { EditorPlayer } from "./editorState";
import {
  PlayerCard,
  PlayerHeader,
  RemoveBtn,
  SmallIconBtn,
  StatInput,
  StatLabel,
  StatRow,
  StatValue,
  TextInput,
} from "./styles";

type Props = {
  player: EditorPlayer;
  index: number;
  total: number;
  isPitcher?: boolean;
  onChange: (patch: Partial<EditorPlayer>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

const PlayerRow: React.FunctionComponent<Props> = ({
  player,
  index,
  total,
  isPitcher = false,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const stat = (label: string, key: keyof EditorPlayer, htmlFor: string) => {
    const val = (player[key] as number | undefined) ?? 0;
    return (
      <StatRow>
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
    <PlayerCard>
      <PlayerHeader>
        <TextInput
          value={player.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Player name"
          aria-label="Player name"
          aria-invalid={!player.name.trim() ? "true" : undefined}
          style={{ flex: 1 }}
        />
        <SmallIconBtn
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          title="Move up"
        >
          ↑
        </SmallIconBtn>
        <SmallIconBtn
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          title="Move down"
        >
          ↓
        </SmallIconBtn>
        <RemoveBtn type="button" onClick={onRemove} aria-label="Remove player">
          ✕
        </RemoveBtn>
      </PlayerHeader>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {stat("Contact", "contact", `contact-${player.id}`)}
        {stat("Power", "power", `power-${player.id}`)}
        {stat("Speed", "speed", `speed-${player.id}`)}
        {isPitcher && stat("Velocity", "velocity", `velocity-${player.id}`)}
        {isPitcher && stat("Control", "control", `control-${player.id}`)}
        {isPitcher && stat("Movement", "movement", `movement-${player.id}`)}
      </div>
    </PlayerCard>
  );
};

export default PlayerRow;
