import * as React from "react";

import type { TeamCustomPlayerOverrides } from "@context/index";
import { AL_FALLBACK, fetchMlbTeams, NL_FALLBACK } from "@utils/mlbTeams";
import { generateRoster } from "@utils/roster";

import { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
export { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
import PlayerCustomizationPanel from "./PlayerCustomizationPanel";
import {
  Dialog,
  Divider,
  FieldGroup,
  FieldLabel,
  PlayBallButton,
  RadioLabel,
  ResumeButton,
  SectionLabel,
  Select,
  Title,
} from "./styles";

type ManagedTeam = 0 | 1 | null;
type MatchupMode = "al" | "nl" | "interleague";

export type PlayerOverrides = {
  away: TeamCustomPlayerOverrides;
  home: TeamCustomPlayerOverrides;
  awayOrder: string[];
  homeOrder: string[];
};

type Props = {
  onStart: (
    homeTeam: string,
    awayTeam: string,
    managedTeam: ManagedTeam,
    playerOverrides: PlayerOverrides,
  ) => void;
  autoSaveName?: string;
  onResume?: () => void;
};

const defaultOrder = (teamName: string) => generateRoster(teamName).batters.map((b) => b.id);

const NewGameDialog: React.FunctionComponent<Props> = ({ onStart, autoSaveName, onResume }) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [teams, setTeams] = React.useState({ al: AL_FALLBACK, nl: NL_FALLBACK });
  const [mode, setMode] = React.useState<MatchupMode>("interleague");
  const [homeLeague, setHomeLeague] = React.useState<"al" | "nl">("al");
  const [home, setHome] = React.useState(DEFAULT_AL_TEAM);
  const [away, setAway] = React.useState(DEFAULT_NL_TEAM);
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");
  const [homeOverrides, setHomeOverrides] = React.useState<TeamCustomPlayerOverrides>({});
  const [awayOverrides, setAwayOverrides] = React.useState<TeamCustomPlayerOverrides>({});
  const [homeOrder, setHomeOrder] = React.useState<string[]>(() => defaultOrder(DEFAULT_AL_TEAM));
  const [awayOrder, setAwayOrder] = React.useState<string[]>(() => defaultOrder(DEFAULT_NL_TEAM));

  React.useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
    fetchMlbTeams()
      .then(setTeams)
      .catch(() => {});
  }, []);

  const homeList =
    mode === "interleague"
      ? homeLeague === "al"
        ? teams.al
        : teams.nl
      : mode === "nl"
        ? teams.nl
        : teams.al;
  const awayList =
    mode === "interleague"
      ? homeLeague === "al"
        ? teams.nl
        : teams.al
      : homeList.filter((t) => t.name !== home);

  // Keep selections valid if team lists change after fetch
  React.useEffect(() => {
    if (homeList.length > 0 && !homeList.some((t) => t.name === home)) {
      setHome(homeList[0].name);
    }
  }, [homeList, home]);

  React.useEffect(() => {
    if (awayList.length > 0 && !awayList.some((t) => t.name === away)) {
      setAway(awayList[0].name);
    }
  }, [awayList, away]);

  // Reset player overrides and lineup order when the selected team changes
  const prevHome = React.useRef(home);
  const prevAway = React.useRef(away);
  React.useEffect(() => {
    if (prevHome.current !== home) {
      setHomeOverrides({});
      setHomeOrder(defaultOrder(home));
      prevHome.current = home;
    }
  }, [home]);
  React.useEffect(() => {
    if (prevAway.current !== away) {
      setAwayOverrides({});
      setAwayOrder(defaultOrder(away));
      prevAway.current = away;
    }
  }, [away]);

  const handleModeChange = (m: MatchupMode) => {
    setMode(m);
    if (m === "al") {
      setHome(teams.al[0]?.name ?? "");
      setAway(teams.al[1]?.name ?? teams.al[0]?.name ?? "");
    } else if (m === "nl") {
      setHome(teams.nl[0]?.name ?? "");
      setAway(teams.nl[1]?.name ?? teams.nl[0]?.name ?? "");
    } else {
      const homeLeagueList = homeLeague === "al" ? teams.al : teams.nl;
      const awayLeagueList = homeLeague === "al" ? teams.nl : teams.al;
      const homeIsValid = homeLeagueList.some((t) => t.name === home);
      const awayIsValid = awayLeagueList.some((t) => t.name === away);
      const nextHome = homeIsValid ? home : (homeLeagueList[0]?.name ?? "");
      const nextAway = awayIsValid ? away : (awayLeagueList[0]?.name ?? "");
      setHome(nextHome);
      setAway(nextAway);
    }
  };

  const handleHomeLeagueChange = (league: "al" | "nl") => {
    setHomeLeague(league);
    setHome(league === "al" ? (teams.al[0]?.name ?? "") : (teams.nl[0]?.name ?? ""));
    setAway(league === "al" ? (teams.nl[0]?.name ?? "") : (teams.al[0]?.name ?? ""));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);
    onStart(home, away, mt, {
      away: awayOverrides,
      home: homeOverrides,
      awayOrder,
      homeOrder,
    });
    ref.current?.close();
  };

  return (
    <Dialog ref={ref} onCancel={(e) => e.preventDefault()}>
      <Title>⚾ New Game</Title>
      {onResume && autoSaveName && (
        <>
          <ResumeButton type="button" onClick={onResume}>
            ▶ Resume: {autoSaveName}
          </ResumeButton>
          <Divider>— or start a new game —</Divider>
        </>
      )}
      <form onSubmit={handleSubmit}>
        <FieldGroup>
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
          <FieldLabel htmlFor="ng-home">Home team</FieldLabel>
          <Select id="ng-home" value={home} onChange={(e) => setHome(e.target.value)}>
            {homeList.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="ng-away">Away team</FieldLabel>
          <Select id="ng-away" value={away} onChange={(e) => setAway(e.target.value)}>
            {awayList.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <SectionLabel>Manage a team?</SectionLabel>
          {(["none", "0", "1"] as const).map((v) => (
            <RadioLabel key={v}>
              <input
                type="radio"
                name="managed"
                value={v}
                checked={managed === v}
                onChange={() => setManaged(v)}
              />
              {v === "none" ? "None — just watch" : v === "0" ? `Away (${away})` : `Home (${home})`}
            </RadioLabel>
          ))}
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
        <PlayBallButton type="submit">Play Ball!</PlayBallButton>
      </form>
    </Dialog>
  );
};

export default NewGameDialog;
