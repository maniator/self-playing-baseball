import * as React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { EditorPlayer } from "./editorState";
import {
  BATTER_POSITION_OPTIONS,
  HANDEDNESS_OPTIONS,
  PITCHER_POSITION_OPTIONS,
} from "./playerConstants";
import {
  HITTER_STAT_CAP,
  hitterRemaining,
  hitterStatTotal,
  PITCHER_STAT_CAP,
  pitcherRemaining,
  pitcherStatTotal,
} from "./statBudget";
import {
  FieldLabel,
  MetaGroup,
  PlayerCard,
  PlayerHeader,
  PlayerMeta,
  RemoveBtn,
  SelectInput,
  StatBudgetRow,
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

  const positionOptions = isPitcher ? PITCHER_POSITION_OPTIONS : BATTER_POSITION_OPTIONS;

  const stat = (label: string, key: keyof EditorPlayer, htmlFor: string) => {
    const val = (player[key] as number | undefined) ?? 0;
    return (
      <StatRow key={`stat-${key}`}>
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
      <PlayerMeta>
        <MetaGroup>
          <FieldLabel htmlFor={`pos-${player.id}`}>Position</FieldLabel>
          <SelectInput
            id={`pos-${player.id}`}
            value={player.position}
            onChange={(e) => onChange({ position: e.target.value })}
            aria-label="Position"
            data-testid="custom-team-player-position-select"
          >
            <option value="">— select —</option>
            {positionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </MetaGroup>
        <MetaGroup>
          <FieldLabel htmlFor={`hand-${player.id}`}>Bats</FieldLabel>
          <SelectInput
            id={`hand-${player.id}`}
            value={player.handedness}
            onChange={(e) => onChange({ handedness: e.target.value as "R" | "L" | "S" })}
            aria-label="Batting handedness"
            data-testid="custom-team-player-handedness-select"
          >
            {HANDEDNESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </MetaGroup>
      </PlayerMeta>
      <StatsGrid>
        {isPitcher ? (
          <>
            {stat("Velocity", "velocity", `velocity-${player.id}`)}
            {stat("Control", "control", `control-${player.id}`)}
            {stat("Movement", "movement", `movement-${player.id}`)}
          </>
        ) : (
          <>
            {stat("Contact", "contact", `contact-${player.id}`)}
            {stat("Power", "power", `power-${player.id}`)}
            {stat("Speed", "speed", `speed-${player.id}`)}
          </>
        )}
      </StatsGrid>
      {isPitcher
        ? (() => {
            const vel = player.velocity ?? 0;
            const ctrl = player.control ?? 0;
            const mov = player.movement ?? 0;
            const pitcherTotal = pitcherStatTotal(vel, ctrl, mov);
            const pitcherRem = pitcherRemaining(vel, ctrl, mov);
            const overCap = pitcherRem < 0;
            return (
              <StatBudgetRow $overCap={overCap}>
                {overCap
                  ? `⚠ ${pitcherTotal} / ${PITCHER_STAT_CAP} — ${Math.abs(pitcherRem)} over cap`
                  : `Total: ${pitcherTotal} / ${PITCHER_STAT_CAP} (${pitcherRem} remaining)`}
              </StatBudgetRow>
            );
          })()
        : (() => {
            const hitterTotal = hitterStatTotal(player.contact, player.power, player.speed);
            const hitterRem = hitterRemaining(player.contact, player.power, player.speed);
            const overCap = hitterRem < 0;
            return (
              <StatBudgetRow $overCap={overCap}>
                {overCap
                  ? `⚠ ${hitterTotal} / ${HITTER_STAT_CAP} — ${Math.abs(hitterRem)} over cap`
                  : `Total: ${hitterTotal} / ${HITTER_STAT_CAP} (${hitterRem} remaining)`}
              </StatBudgetRow>
            );
          })()}
    </PlayerCard>
  );
};

export default SortablePlayerRow;
