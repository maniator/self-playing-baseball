import * as React from "react";

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
  SmallIconBtn,
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
          <FieldLabel htmlFor={`hand-${player.id}`}>{isPitcher ? "Throws" : "Bats"}</FieldLabel>
          <SelectInput
            id={`hand-${player.id}`}
            value={player.handedness}
            onChange={(e) => onChange({ handedness: e.target.value as "R" | "L" | "S" })}
            aria-label={isPitcher ? "Throwing handedness" : "Batting handedness"}
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
            const total = pitcherStatTotal(vel, ctrl, mov);
            const remaining = pitcherRemaining(vel, ctrl, mov);
            const overCap = remaining < 0;
            return (
              <StatBudgetRow $overCap={overCap}>
                {overCap
                  ? `⚠ ${total} / ${PITCHER_STAT_CAP} — ${Math.abs(remaining)} over cap`
                  : `Total: ${total} / ${PITCHER_STAT_CAP} (${remaining} remaining)`}
              </StatBudgetRow>
            );
          })()
        : (() => {
            const total = hitterStatTotal(player.contact, player.power, player.speed);
            const remaining = hitterRemaining(player.contact, player.power, player.speed);
            const overCap = remaining < 0;
            return (
              <StatBudgetRow $overCap={overCap}>
                {overCap
                  ? `⚠ ${total} / ${HITTER_STAT_CAP} — ${Math.abs(remaining)} over cap`
                  : `Total: ${total} / ${HITTER_STAT_CAP} (${remaining} remaining)`}
              </StatBudgetRow>
            );
          })()}
    </PlayerCard>
  );
};

export default PlayerRow;
