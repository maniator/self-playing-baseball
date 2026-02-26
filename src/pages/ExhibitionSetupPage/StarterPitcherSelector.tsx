import * as React from "react";

import { FieldGroup, FieldLabel, Select } from "@components/NewGameDialog/styles";

export type SpPitcher = {
  id: string;
  idx: number;
  name: string;
  pitchingRole?: "SP" | "RP" | "SP/RP";
};

type Props = {
  /** Display label for the managed team (shown as "{teamLabel} starting pitcher"). */
  teamLabel: string;
  /** Currently selected pitcher roster index. */
  startIdx: number;
  /** SP-eligible pitchers for the managed team. */
  pitchers: SpPitcher[];
  /** Called when the user picks a different starter. */
  onSelect: (idx: number) => void;
};

/**
 * Dropdown that lets the manager pick a starting pitcher for their team.
 * Extracted from ExhibitionSetupPage to make it independently testable.
 */
const StarterPitcherSelector: React.FunctionComponent<Props> = ({
  teamLabel,
  startIdx,
  pitchers,
  onSelect,
}) => (
  <FieldGroup>
    <FieldLabel htmlFor="esp-starter">{teamLabel} starting pitcher</FieldLabel>
    <Select
      id="esp-starter"
      data-testid="starting-pitcher-select"
      value={startIdx}
      onChange={(e) => onSelect(Number(e.target.value))}
    >
      {pitchers.map((p) => (
        <option key={p.id} value={p.idx}>
          {p.name}
          {p.pitchingRole ? ` (${p.pitchingRole})` : ""}
        </option>
      ))}
    </Select>
  </FieldGroup>
);

export default StarterPitcherSelector;
