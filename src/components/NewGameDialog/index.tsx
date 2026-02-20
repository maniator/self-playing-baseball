import * as React from "react";

import { AL_FALLBACK, fetchMlbTeams, NL_FALLBACK } from "@utils/mlbTeams";

import { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
export { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
import {
  Dialog,
  FieldGroup,
  FieldLabel,
  PlayBallButton,
  RadioLabel,
  SectionLabel,
  Select,
  Title,
} from "./styles";

type ManagedTeam = 0 | 1 | null;
type MatchupMode = "al" | "nl" | "interleague";

type Props = {
  onStart: (homeTeam: string, awayTeam: string, managedTeam: ManagedTeam) => void;
};

const NewGameDialog: React.FunctionComponent<Props> = ({ onStart }) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [teams, setTeams] = React.useState({ al: AL_FALLBACK, nl: NL_FALLBACK });
  const [mode, setMode] = React.useState<MatchupMode>("interleague");
  const [homeLeague, setHomeLeague] = React.useState<"al" | "nl">("al");
  const [home, setHome] = React.useState(DEFAULT_AL_TEAM);
  const [away, setAway] = React.useState(DEFAULT_NL_TEAM);
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");

  React.useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
    fetchMlbTeams()
      .then(setTeams)
      .catch(() => {});
  }, []);

  const homeList = mode === "nl" ? teams.nl : teams.al;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeList]);

  React.useEffect(() => {
    if (awayList.length > 0 && !awayList.some((t) => t.name === away)) {
      setAway(awayList[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awayList]);

  const handleModeChange = (m: MatchupMode) => {
    setMode(m);
    if (m === "al") {
      setHome(teams.al[0]?.name ?? "");
      setAway(teams.al[1]?.name ?? teams.al[0]?.name ?? "");
    } else if (m === "nl") {
      setHome(teams.nl[0]?.name ?? "");
      setAway(teams.nl[1]?.name ?? teams.nl[0]?.name ?? "");
    } else {
      setHome(homeLeague === "al" ? (teams.al[0]?.name ?? "") : (teams.nl[0]?.name ?? ""));
      setAway(homeLeague === "al" ? (teams.nl[0]?.name ?? "") : (teams.al[0]?.name ?? ""));
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
    onStart(home, away, mt);
    ref.current?.close();
  };

  return (
    <Dialog ref={ref} onCancel={(e) => e.preventDefault()}>
      <Title>⚾ New Game</Title>
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
        <PlayBallButton type="submit">Play Ball!</PlayBallButton>
      </form>
    </Dialog>
  );
};

export default NewGameDialog;
