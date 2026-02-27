import * as React from "react";

import type { EditorPlayer } from "./editorState";
import {
  HITTER_STAT_CAP,
  hitterRemaining,
  hitterStatTotal,
  PITCHER_STAT_CAP,
  pitcherRemaining,
  pitcherStatTotal,
} from "./statBudget";
import {
  IdentityLockHint,
  StatBudgetRow,
  StatInput,
  StatLabel,
  StatRow,
  StatsGrid,
  StatValue,
} from "./styles";

type Props = {
  player: EditorPlayer;
  isPitcher: boolean;
  /** When true, stat sliders are disabled — stats are immutable after player creation. */
  isExistingPlayer?: boolean;
  onChange: (patch: Partial<EditorPlayer>) => void;
};

const PlayerStatFields: React.FunctionComponent<Props> = ({
  player,
  isPitcher,
  isExistingPlayer = false,
  onChange,
}) => {
  const vel = player.velocity ?? 0;
  const ctrl = player.control ?? 0;
  const mov = player.movement ?? 0;
  const pitcherTotal = pitcherStatTotal(vel, ctrl, mov);
  const pitcherRem = pitcherRemaining(vel, ctrl, mov);
  const pitcherOverCap = pitcherRem < 0;

  const hitterTotal = hitterStatTotal(player.contact, player.power, player.speed);
  const hitterRem = hitterRemaining(player.contact, player.power, player.speed);
  const hitterOverCap = hitterRem < 0;

  const overCap = isPitcher ? pitcherOverCap : hitterOverCap;
  const total = isPitcher ? pitcherTotal : hitterTotal;
  const rem = isPitcher ? pitcherRem : hitterRem;
  const cap = isPitcher ? PITCHER_STAT_CAP : HITTER_STAT_CAP;
  const shouldShowOverCapWarning = !isExistingPlayer && overCap;

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
          disabled={isExistingPlayer}
          onChange={(e) => {
            // Guard in addition to `disabled` — jsdom fires change events on disabled
            // elements via fireEvent, so the explicit check keeps tests meaningful.
            if (!isExistingPlayer) onChange({ [key]: Number(e.target.value) });
          }}
        />
        <StatValue>{val}</StatValue>
      </StatRow>
    );
  };

  return (
    <>
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
      <StatBudgetRow $overCap={shouldShowOverCapWarning}>
        {shouldShowOverCapWarning
          ? `⚠ ${total} / ${cap} — ${Math.abs(rem)} over cap`
          : `Total: ${total} / ${cap}`}
      </StatBudgetRow>
      {isExistingPlayer && <IdentityLockHint>Stats are locked after creation.</IdentityLockHint>}
    </>
  );
};

export default PlayerStatFields;
