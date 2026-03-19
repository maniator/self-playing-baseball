import * as React from "react";

import { GameHistoryStore } from "@feat/careerStats/storage/gameHistoryStore";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";
import { useSearchParams } from "react-router";

import { getDb } from "@storage/db";
import type { TeamCareerSummary } from "@storage/types";

import type { BattingRow, PitchingRow } from "./careerStatsShared";

export function useCareerStatsData() {
  const [searchParams] = useSearchParams();
  const { teams: customTeams, loading: teamsLoading } = useCustomTeams();

  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("");
  const [teamsWithHistory, setTeamsWithHistory] = React.useState<string[]>([]);
  const [battingRows, setBattingRows] = React.useState<BattingRow[]>([]);
  const [pitchingRows, setPitchingRows] = React.useState<PitchingRow[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [teamSummary, setTeamSummary] = React.useState<TeamCareerSummary | null>(null);
  const [hrLeader, setHrLeader] =
    React.useState<Awaited<ReturnType<typeof GameHistoryStore.getTeamBattingLeaders>>["hrLeader"]>(
      null,
    );
  const [avgLeader, setAvgLeader] =
    React.useState<Awaited<ReturnType<typeof GameHistoryStore.getTeamBattingLeaders>>["avgLeader"]>(
      null,
    );
  const [rbiLeader, setRbiLeader] =
    React.useState<Awaited<ReturnType<typeof GameHistoryStore.getTeamBattingLeaders>>["rbiLeader"]>(
      null,
    );
  const [eraLeader, setEraLeader] =
    React.useState<
      Awaited<ReturnType<typeof GameHistoryStore.getTeamPitchingLeaders>>["eraLeader"]
    >(null);
  const [savesLeader, setSavesLeader] =
    React.useState<
      Awaited<ReturnType<typeof GameHistoryStore.getTeamPitchingLeaders>>["savesLeader"]
    >(null);
  const [strikeoutsLeader, setStrikeoutsLeader] =
    React.useState<
      Awaited<ReturnType<typeof GameHistoryStore.getTeamPitchingLeaders>>["strikeoutsLeader"]
    >(null);

  const requestedTeamId = searchParams.get("team") ?? "";

  const selectableTeamIds = React.useMemo<string[]>(() => {
    const customIds = customTeams.map((team) => team.id);
    return Array.from(new Set([...customIds, ...teamsWithHistory]));
  }, [customTeams, teamsWithHistory]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTeamIds() {
      try {
        const db = await getDb();
        const [batting, pitching] = await Promise.all([
          db.batterGameStats.find().exec(),
          db.pitcherGameStats.find().exec(),
        ]);
        if (cancelled) return;

        const ids = new Set<string>();
        for (const row of batting) ids.add(row.toJSON().teamId);
        for (const row of pitching) ids.add(row.toJSON().teamId);
        setTeamsWithHistory(Array.from(ids));
      } catch {
        // Silently degrade — history just won't include non-custom teams.
      }
    }

    void loadTeamIds();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (teamsLoading || selectableTeamIds.length === 0) {
      return;
    }

    if (requestedTeamId && selectableTeamIds.includes(requestedTeamId)) {
      if (selectedTeamId !== requestedTeamId) {
        setSelectedTeamId(requestedTeamId);
      }
      return;
    }

    if (selectedTeamId === "") {
      setSelectedTeamId(selectableTeamIds[0]);
    }
  }, [requestedTeamId, selectableTeamIds, selectedTeamId, teamsLoading]);

  React.useEffect(() => {
    if (!selectedTeamId) {
      setBattingRows([]);
      setPitchingRows([]);
      setTeamSummary(null);
      setHrLeader(null);
      setAvgLeader(null);
      setRbiLeader(null);
      setEraLeader(null);
      setSavesLeader(null);
      setStrikeoutsLeader(null);
      return;
    }

    let cancelled = false;
    setDataLoading(true);

    async function loadStats() {
      try {
        const [batting, pitching, summary] = await Promise.all([
          GameHistoryStore.getTeamCareerBattingStats(selectedTeamId),
          GameHistoryStore.getTeamCareerPitchingStats(selectedTeamId),
          GameHistoryStore.getTeamCareerSummary(selectedTeamId),
        ]);
        const [battingLeaders, pitchingLeaders] = await Promise.all([
          GameHistoryStore.getTeamBattingLeaders(selectedTeamId, { rows: batting }),
          GameHistoryStore.getTeamPitchingLeaders(selectedTeamId, { rows: pitching }),
        ]);
        if (cancelled) return;

        setBattingRows(batting);
        setPitchingRows(pitching);
        setTeamSummary(summary);
        setHrLeader(battingLeaders.hrLeader);
        setAvgLeader(battingLeaders.avgLeader);
        setRbiLeader(battingLeaders.rbiLeader);
        setEraLeader(pitchingLeaders.eraLeader);
        setSavesLeader(pitchingLeaders.savesLeader);
        setStrikeoutsLeader(pitchingLeaders.strikeoutsLeader);
      } catch {
        if (!cancelled) {
          setBattingRows([]);
          setPitchingRows([]);
          setTeamSummary(null);
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const isEmpty =
    !dataLoading && selectedTeamId !== "" && battingRows.length === 0 && pitchingRows.length === 0;

  const selectedCustomTeam = React.useMemo(
    () => customTeams.find((team) => team.id === selectedTeamId),
    [customTeams, selectedTeamId],
  );

  const noTeams = !teamsLoading && selectableTeamIds.length === 0;

  return {
    avgLeader,
    battingRows,
    customTeams,
    dataLoading,
    eraLeader,
    hrLeader,
    isEmpty,
    noTeams,
    pitchingRows,
    rbiLeader,
    savesLeader,
    selectableTeamIds,
    selectedCustomTeam,
    selectedTeamId,
    setSelectedTeamId,
    strikeoutsLeader,
    teamSummary,
  };
}
