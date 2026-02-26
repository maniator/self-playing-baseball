import * as React from "react";

import PlayerCustomizationPanel from "@components/NewGameDialog/PlayerCustomizationPanel";
import {
  FieldGroup,
  FieldLabel,
  RadioLabel,
  SectionLabel,
  Select,
} from "@components/NewGameDialog/styles";
import type { UsePlayerCustomizationReturn } from "@components/NewGameDialog/usePlayerCustomization";
import type {
  MatchupMode,
  UseTeamSelectionReturn,
} from "@components/NewGameDialog/useTeamSelection";
import type { MlbTeam } from "@utils/mlbTeams";

type Props = {
  mode: MatchupMode;
  homeLeague: "al" | "nl";
  home: string;
  setHome: (v: string) => void;
  away: string;
  setAway: (v: string) => void;
  homeList: MlbTeam[];
  awayList: MlbTeam[];
  handleModeChange: UseTeamSelectionReturn["handleModeChange"];
  handleHomeLeagueChange: UseTeamSelectionReturn["handleHomeLeagueChange"];
} & UsePlayerCustomizationReturn;

/** MLB-specific form fields for the Exhibition Setup page (matchup, team selects, customization). */
const MlbTeamsSection: React.FunctionComponent<Props> = ({
  mode,
  homeLeague,
  home,
  setHome,
  away,
  setAway,
  homeList,
  awayList,
  handleModeChange,
  handleHomeLeagueChange,
  awayOverrides,
  homeOverrides,
  setAwayOverrides,
  setHomeOverrides,
  awayOrder,
  homeOrder,
  setAwayOrder,
  setHomeOrder,
}) => (
  <>
    <FieldGroup data-testid="matchup-mode-select">
      <SectionLabel>Matchup</SectionLabel>
      {(
        [
          ["al", "AL vs AL"],
          ["nl", "NL vs NL"],
          ["interleague", "Interleague"],
        ] as const
      ).map(([v, label]) => (
        <RadioLabel key={v}>
          <input
            type="radio"
            name="mode"
            value={v}
            checked={mode === v}
            onChange={() => handleModeChange(v)}
          />
          {label}
        </RadioLabel>
      ))}
    </FieldGroup>

    {mode === "interleague" && (
      <FieldGroup>
        <SectionLabel>Home team league</SectionLabel>
        {(
          [
            ["al", "AL"],
            ["nl", "NL"],
          ] as const
        ).map(([v, label]) => (
          <RadioLabel key={v}>
            <input
              type="radio"
              name="homeLeague"
              value={v}
              checked={homeLeague === v}
              onChange={() => handleHomeLeagueChange(v)}
            />
            {label}
          </RadioLabel>
        ))}
      </FieldGroup>
    )}

    <FieldGroup>
      <FieldLabel htmlFor="esp-home">Home team</FieldLabel>
      <Select
        id="esp-home"
        data-testid="home-team-select"
        value={home}
        onChange={(e) => setHome(e.target.value)}
      >
        {homeList.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </Select>
    </FieldGroup>

    <FieldGroup>
      <FieldLabel htmlFor="esp-away">Away team</FieldLabel>
      <Select
        id="esp-away"
        data-testid="away-team-select"
        value={away}
        onChange={(e) => setAway(e.target.value)}
      >
        {awayList.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </Select>
    </FieldGroup>

    <PlayerCustomizationPanel
      awayTeam={away}
      homeTeam={home}
      awayOverrides={awayOverrides}
      homeOverrides={homeOverrides}
      onAwayChange={setAwayOverrides}
      onHomeChange={setHomeOverrides}
      awayOrder={awayOrder}
      homeOrder={homeOrder}
      onAwayOrderChange={setAwayOrder}
      onHomeOrderChange={setHomeOrder}
    />
  </>
);

export default MlbTeamsSection;
