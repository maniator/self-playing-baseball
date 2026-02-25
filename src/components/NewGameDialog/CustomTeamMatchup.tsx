import * as React from "react";

import { customTeamToDisplayName } from "@features/customTeams/adapters/customTeamAdapter";

import type { CustomTeamDoc } from "@storage/types";

import { FieldGroup, FieldLabel, SectionLabel, Select } from "./styles";

type Props = {
  teams: CustomTeamDoc[];
  awayTeamId: string;
  homeTeamId: string;
  onAwayChange: (id: string) => void;
  onHomeChange: (id: string) => void;
  onManageTeams?: () => void;
};

const CustomTeamMatchup: React.FunctionComponent<Props> = ({
  teams,
  awayTeamId,
  homeTeamId,
  onAwayChange,
  onHomeChange,
  onManageTeams,
}) => {
  if (teams.length === 0) {
    return (
      <FieldGroup>
        <SectionLabel>Custom Teams</SectionLabel>
        <p style={{ color: "#6680aa", fontSize: "13px", margin: "4px 0 8px" }}>
          No custom teams yet.{" "}
          {onManageTeams && (
            <button
              type="button"
              onClick={onManageTeams}
              style={{
                background: "none",
                border: "none",
                color: "aquamarine",
                cursor: "pointer",
                fontSize: "13px",
                padding: 0,
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              Go to Manage Teams
            </button>
          )}{" "}
          to create one.
        </p>
      </FieldGroup>
    );
  }

  return (
    <>
      <FieldGroup>
        <FieldLabel htmlFor="ng-custom-away">Away team</FieldLabel>
        <Select
          id="ng-custom-away"
          data-testid="new-game-custom-away-team-select"
          value={awayTeamId}
          onChange={(e) => onAwayChange(e.target.value)}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {customTeamToDisplayName(t)}
            </option>
          ))}
        </Select>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel htmlFor="ng-custom-home">Home team</FieldLabel>
        <Select
          id="ng-custom-home"
          data-testid="new-game-custom-home-team-select"
          value={homeTeamId}
          onChange={(e) => onHomeChange(e.target.value)}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {customTeamToDisplayName(t)}
            </option>
          ))}
        </Select>
      </FieldGroup>
    </>
  );
};

export default CustomTeamMatchup;
