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
        <TabBtn
          type="button"
          $active={activeTab === "batting"}
          onClick={() => setActiveTab("batting")}
        >
          Batting
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === "pitching"}
          onClick={() => setActiveTab("pitching")}
        >
          Pitching
        </TabBtn>
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
