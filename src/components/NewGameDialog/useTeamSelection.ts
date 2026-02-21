import * as React from "react";

import type { MlbTeam } from "@utils/mlbTeams";
import { AL_FALLBACK, fetchMlbTeams, NL_FALLBACK } from "@utils/mlbTeams";

import { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";

export type MatchupMode = "al" | "nl" | "interleague";

export type UseTeamSelectionReturn = {
  teams: { al: MlbTeam[]; nl: MlbTeam[] };
  mode: MatchupMode;
  homeLeague: "al" | "nl";
  home: string;
  setHome: React.Dispatch<React.SetStateAction<string>>;
  away: string;
  setAway: React.Dispatch<React.SetStateAction<string>>;
  homeList: MlbTeam[];
  awayList: MlbTeam[];
  handleModeChange: (m: MatchupMode) => void;
  handleHomeLeagueChange: (league: "al" | "nl") => void;
};

export function useTeamSelection(): UseTeamSelectionReturn {
  const [teams, setTeams] = React.useState({ al: AL_FALLBACK, nl: NL_FALLBACK });
  const [mode, setMode] = React.useState<MatchupMode>("interleague");
  const [homeLeague, setHomeLeague] = React.useState<"al" | "nl">("al");
  const [home, setHome] = React.useState(DEFAULT_AL_TEAM);
  const [away, setAway] = React.useState(DEFAULT_NL_TEAM);

  React.useEffect(() => {
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
      setHome(homeIsValid ? home : (homeLeagueList[0]?.name ?? ""));
      setAway(awayIsValid ? away : (awayLeagueList[0]?.name ?? ""));
    }
  };

  const handleHomeLeagueChange = (league: "al" | "nl") => {
    setHomeLeague(league);
    setHome(league === "al" ? (teams.al[0]?.name ?? "") : (teams.nl[0]?.name ?? ""));
    setAway(league === "al" ? (teams.nl[0]?.name ?? "") : (teams.al[0]?.name ?? ""));
  };

  return {
    teams,
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
  };
}
