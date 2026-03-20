/**
 * PlayerCareerPage — /stats/:teamId/players/:playerId
 *
 * Route shell: delegates data-loading to `usePlayerCareerData` and
 * renders layout + tab-panel subcomponents.
 */
import * as React from "react";

import { BackBtn, PageHeader } from "@shared/components/PageLayout/styles";
import { useNavigate, useParams } from "react-router";

import PlayerCareerBattingTab from "./PlayerCareerBattingTab";
import PlayerCareerPitchingTab from "./PlayerCareerPitchingTab";
import {
  NavBtn,
  NavRow,
  PlayerCareerContainer,
  PlayerName,
  PlayerRoleLabel,
  TabBar,
  TabBtn,
} from "./styles";
import { usePlayerCareerData } from "./usePlayerCareerData";

type Tab = "batting" | "pitching";

const PlayerCareerPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { teamId, playerId } = useParams<{ teamId?: string; playerId?: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab>("batting");

  const {
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
  } = usePlayerCareerData(playerId);

  // Determine which tabs are available.
  // Priority: game history rows → roster role → show both (unknown).
  const hasBatting = battingRows.length > 0;
  const hasPitching = pitchingRows.length > 0;
  const hasAnyHistory = hasBatting || hasPitching;
  // When loading, show both tabs as placeholders to avoid layout shift.
  // Once loaded: use history rows when available, else fall back to roster role.
  // If role is unknown (no team context), show both tabs.
  const showBattingTab = loading || hasBatting || (!hasAnyHistory && rosterRole !== "pitcher");
  const showPitchingTab = loading || hasPitching || (!hasAnyHistory && rosterRole !== "batter");

  // Derive the effective tab synchronously so the correct panel renders on the very
  // first frame after loading completes — no transient wrong-panel flash from useEffect.
  const effectiveActiveTab: Tab =
    !loading && activeTab === "batting" && !showBattingTab
      ? "pitching"
      : !loading && activeTab === "pitching" && !showPitchingTab
        ? "batting"
        : activeTab;

  // Keep activeTab state in sync so subsequent user clicks remain correct.
  React.useEffect(() => {
    if (effectiveActiveTab !== activeTab) {
      setActiveTab(effectiveActiveTab);
    }
  }, [effectiveActiveTab, activeTab]);

  return (
    <PlayerCareerContainer data-testid="player-career-page">
      <PageHeader>
        <BackBtn
          type="button"
          onClick={() => navigate(teamId ? `/stats/${encodeURIComponent(teamId)}` : "/stats")}
          aria-label="Go back"
        >
          ← Back
        </BackBtn>
      </PageHeader>

      {rosterPlayerKeys.length > 0 && (
        <NavRow>
          <NavBtn
            type="button"
            disabled={prevKey === null}
            onClick={() => prevKey && navigateToPlayer(prevKey)}
            data-testid="player-career-prev"
            aria-label="Previous player"
          >
            ← Prev
          </NavBtn>
          <NavBtn
            type="button"
            disabled={nextKey === null}
            onClick={() => nextKey && navigateToPlayer(nextKey)}
            data-testid="player-career-next"
            aria-label="Next player"
          >
            Next →
          </NavBtn>
        </NavRow>
      )}

      {!loading && (
        <>
          <PlayerName>{playerName}</PlayerName>
          {roleLabel && <PlayerRoleLabel>{roleLabel}</PlayerRoleLabel>}
        </>
      )}

      <TabBar aria-label="Player stats tabs">
        {showBattingTab && (
          <TabBtn
            type="button"
            $active={effectiveActiveTab === "batting"}
            onClick={() => setActiveTab("batting")}
          >
            Batting
          </TabBtn>
        )}
        {showPitchingTab && (
          <TabBtn
            type="button"
            $active={effectiveActiveTab === "pitching"}
            onClick={() => setActiveTab("pitching")}
          >
            Pitching
          </TabBtn>
        )}
      </TabBar>

      {!loading && effectiveActiveTab === "batting" && (
        <PlayerCareerBattingTab battingRows={battingRows} battingTotals={battingTotals} />
      )}

      {!loading && effectiveActiveTab === "pitching" && (
        <PlayerCareerPitchingTab pitchingRows={pitchingRows} pitchingTotals={pitchingTotals} />
      )}
    </PlayerCareerContainer>
  );
};

export default PlayerCareerPage;
