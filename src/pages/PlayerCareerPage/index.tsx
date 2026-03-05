/**
 * PlayerCareerPage — /players/:playerKey
 *
 * Route shell: delegates data-loading to `usePlayerCareerData` and
 * renders layout + tab-panel subcomponents.
 */
import * as React from "react";

import { useNavigate, useParams } from "react-router";

import { BackBtn, PageHeader } from "@components/PageLayout/styles";

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
  const { playerKey } = useParams<{ playerKey: string }>();
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
    prevKey,
    nextKey,
    navigateToPlayer,
    customTeams,
  } = usePlayerCareerData(playerKey);

  // Determine which tabs are available based on history rows.
  const hasBatting = battingRows.length > 0;
  const hasPitching = pitchingRows.length > 0;
  // Show batting tab when: loading (unknown yet), has batting rows, or neither has rows (empty state).
  const showBattingTab = loading || hasBatting || (!hasBatting && !hasPitching);
  // Show pitching tab when: loading (unknown yet), has pitching rows, or neither has rows (empty state).
  const showPitchingTab = loading || hasPitching || (!hasBatting && !hasPitching);

  // Auto-switch to valid tab once data loads.
  React.useEffect(() => {
    if (loading) return;
    if (activeTab === "batting" && !showBattingTab) setActiveTab("pitching");
    if (activeTab === "pitching" && !showPitchingTab) setActiveTab("batting");
  }, [loading, showBattingTab, showPitchingTab, activeTab]);

  return (
    <PlayerCareerContainer data-testid="player-career-page">
      <PageHeader>
        <BackBtn type="button" onClick={() => navigate(-1)} aria-label="Go back">
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

      <TabBar>
        {showBattingTab && (
          <TabBtn
            type="button"
            $active={activeTab === "batting"}
            onClick={() => setActiveTab("batting")}
          >
            Batting
          </TabBtn>
        )}
        {showPitchingTab && (
          <TabBtn
            type="button"
            $active={activeTab === "pitching"}
            onClick={() => setActiveTab("pitching")}
          >
            Pitching
          </TabBtn>
        )}
      </TabBar>

      {!loading && activeTab === "batting" && (
        <PlayerCareerBattingTab
          battingRows={battingRows}
          battingTotals={battingTotals}
          customTeams={customTeams}
        />
      )}

      {!loading && activeTab === "pitching" && (
        <PlayerCareerPitchingTab
          pitchingRows={pitchingRows}
          pitchingTotals={pitchingTotals}
          customTeams={customTeams}
        />
      )}
    </PlayerCareerContainer>
  );
};

export default PlayerCareerPage;
