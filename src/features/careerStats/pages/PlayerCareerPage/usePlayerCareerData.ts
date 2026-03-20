/**
 * usePlayerCareerData — data-loading hook for PlayerCareerPage.
 *
 * Fetches batting/pitching game rows, computes career totals, and derives
 * the prev/next roster navigation keys from the :teamId URL parameter
 * (route: /stats/:teamId/players/:playerId).
 */
import * as React from "react";

import { GameHistoryStore } from "@feat/careerStats/storage/gameHistoryStore";
import { computeERA, computeWHIP } from "@feat/careerStats/utils/computePitcherGameStats";
import { useTeamWithRoster } from "@shared/hooks/useTeamWithRoster";
import { useNavigate, useParams } from "react-router";

import type { BatterGameStatRecord, PitcherGameStatRecord, TeamPlayer } from "@storage/types";

// ─── Formatters ──────────────────────────────────────────────────────────────

/** Formats batting average: H/AB to 3 decimal places, or ".---" when AB=0. */
export function formatAVG(hits: number, atBats: number): string {
  if (atBats === 0) return ".---";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

/** Formats ERA: "0.00" or "—" when 0 IP. */
export function formatERA(earnedRuns: number, outsPitched: number): string {
  const era = computeERA(earnedRuns, outsPitched);
  if (era === null) return "—";
  return era.toFixed(2);
}

/** Formats WHIP: "0.00" or "—" when 0 IP. */
export function formatWHIP(walksAllowed: number, hitsAllowed: number, outsPitched: number): string {
  const whip = computeWHIP(walksAllowed, hitsAllowed, outsPitched);
  if (whip === null) return "—";
  return whip.toFixed(2);
}

/** Formats a createdAt timestamp as a short date string (YYYY-MM-DD). */
export function formatDate(createdAt: number): string {
  return new Date(createdAt).toISOString().slice(0, 10);
}

// ─── Totals types ─────────────────────────────────────────────────────────────

export type BattingTotals = {
  atBats: number;
  hits: number;
  walks: number;
  strikeouts: number;
  rbi: number;
  singles: number;
  doubles: number;
  triples: number;
  homers: number;
};

export type PitchingTotals = {
  outsPitched: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsRecorded: number;
  homersAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  saves: number;
  holds: number;
  blownSaves: number;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlayerCareerData(playerId: string | undefined) {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId?: string }>();

  // Fetch the team doc directly from DB by its ID — no array scan needed.
  const teamDoc = useTeamWithRoster(teamId || undefined);

  const [loading, setLoading] = React.useState(true);
  const [battingRows, setBattingRows] = React.useState<BatterGameStatRecord[]>([]);
  const [pitchingRows, setPitchingRows] = React.useState<PitcherGameStatRecord[]>([]);

  // Build the ordered list of player keys from the team's roster for prev/next nav.
  const rosterPlayerKeys = React.useMemo<string[]>(() => {
    if (!teamDoc) return [];
    const allPlayers = [
      ...(teamDoc.roster.lineup ?? []),
      ...(teamDoc.roster.bench ?? []),
      ...(teamDoc.roster.pitchers ?? []),
    ];
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const p of allPlayers as TeamPlayer[]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        keys.push(p.id);
      }
    }
    return keys;
  }, [teamDoc]);

  const currentIdx = rosterPlayerKeys.indexOf(playerId ?? "");
  const prevKey = currentIdx > 0 ? rosterPlayerKeys[currentIdx - 1] : null;
  const nextKey =
    currentIdx >= 0 && currentIdx < rosterPlayerKeys.length - 1
      ? rosterPlayerKeys[currentIdx + 1]
      : null;

  const navigateToPlayer = React.useCallback(
    (id: string) => {
      if (teamId) {
        navigate(`/stats/${encodeURIComponent(teamId)}/players/${encodeURIComponent(id)}`);
        return;
      }
      navigate(`/stats/players/${encodeURIComponent(id)}`);
    },
    [navigate, teamId],
  );

  React.useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    async function loadData() {
      try {
        const [batting, pitching] = await Promise.all([
          GameHistoryStore.getPlayerCareerBatting(playerId!),
          GameHistoryStore.getPlayerCareerPitching(playerId!),
        ]);
        if (cancelled) return;
        setBattingRows(batting);
        setPitchingRows(pitching);
      } catch {
        if (!cancelled) {
          setBattingRows([]);
          setPitchingRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const playerName = React.useMemo<string>(() => {
    if (battingRows.length > 0) return battingRows[battingRows.length - 1].nameAtGameTime;
    if (pitchingRows.length > 0) return pitchingRows[pitchingRows.length - 1].nameAtGameTime;
    // No game history yet — look up the player's name directly from the DB-fetched team doc.
    if (playerId && teamDoc) {
      const allPlayers = [
        ...(teamDoc.roster.lineup ?? []),
        ...(teamDoc.roster.bench ?? []),
        ...(teamDoc.roster.pitchers ?? []),
      ] as TeamPlayer[];
      const player = allPlayers.find((p) => p.id === playerId);
      if (player?.name) return player.name;
    }
    return "Unknown Player";
  }, [battingRows, pitchingRows, playerId, teamDoc]);

  /**
   * The player's declared role from the team roster, if known.
   * Used to determine which stat tabs to show when no game history exists yet.
   */
  const rosterRole = React.useMemo<TeamPlayer["role"] | null>(() => {
    if (!playerId || !teamDoc) return null;
    const allPlayers = [
      ...(teamDoc.roster.lineup ?? []),
      ...(teamDoc.roster.bench ?? []),
      ...(teamDoc.roster.pitchers ?? []),
    ] as TeamPlayer[];
    return allPlayers.find((p) => p.id === playerId)?.role ?? null;
  }, [playerId, teamDoc]);

  const roleLabel = React.useMemo<string>(() => {
    const hasBatting = battingRows.length > 0;
    const hasPitching = pitchingRows.length > 0;
    if (hasBatting && hasPitching) return "Batter / Pitcher";
    if (hasPitching) return "Pitcher";
    if (hasBatting) return "Batter";
    return "";
  }, [battingRows, pitchingRows]);

  const battingTotals = React.useMemo<BattingTotals>(
    () =>
      battingRows.reduce(
        (acc, row) => ({
          atBats: acc.atBats + row.batting.atBats,
          hits: acc.hits + row.batting.hits,
          walks: acc.walks + row.batting.walks,
          strikeouts: acc.strikeouts + row.batting.strikeouts,
          rbi: acc.rbi + row.batting.rbi,
          singles: acc.singles + row.batting.singles,
          doubles: acc.doubles + row.batting.doubles,
          triples: acc.triples + row.batting.triples,
          homers: acc.homers + row.batting.homers,
        }),
        {
          atBats: 0,
          hits: 0,
          walks: 0,
          strikeouts: 0,
          rbi: 0,
          singles: 0,
          doubles: 0,
          triples: 0,
          homers: 0,
        },
      ),
    [battingRows],
  );

  const pitchingTotals = React.useMemo<PitchingTotals>(
    () =>
      pitchingRows.reduce(
        (acc, row) => ({
          outsPitched: acc.outsPitched + row.outsPitched,
          hitsAllowed: acc.hitsAllowed + row.hitsAllowed,
          walksAllowed: acc.walksAllowed + row.walksAllowed,
          strikeoutsRecorded: acc.strikeoutsRecorded + row.strikeoutsRecorded,
          homersAllowed: acc.homersAllowed + row.homersAllowed,
          runsAllowed: acc.runsAllowed + row.runsAllowed,
          earnedRuns: acc.earnedRuns + row.earnedRuns,
          saves: acc.saves + row.saves,
          holds: acc.holds + row.holds,
          blownSaves: acc.blownSaves + row.blownSaves,
        }),
        {
          outsPitched: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          strikeoutsRecorded: 0,
          homersAllowed: 0,
          runsAllowed: 0,
          earnedRuns: 0,
          saves: 0,
          holds: 0,
          blownSaves: 0,
        },
      ),
    [pitchingRows],
  );

  return {
    loading,
    battingRows,
    pitchingRows,
    playerName,
    roleLabel,
    battingTotals,
    pitchingTotals,
    rosterPlayerKeys,
    rosterRole,
    prevKey,
    nextKey,
    navigateToPlayer,
  };
}
