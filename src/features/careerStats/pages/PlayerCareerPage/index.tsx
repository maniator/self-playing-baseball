/**
 * PlayerCareerPage — /players/:playerKey
 *
 * Route shell: delegates data-loading to `usePlayerCareerData` and
 * renders layout + tab-panel subcomponents.
 */
import * as React from "react";

import { BackBtn, PageHeader } from "@shared/components/PageLayout/styles";
import { createSearchParams, useNavigate, useParams, useSearchParams } from "react-router";

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
  const [searchParams] = useSearchParams();
  const teamParam = searchParams.get("team");
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
          onClick={() =>
            navigate(
              teamParam
                ? { pathname: "/stats", search: createSearchParams({ team: teamParam }).toString() }
                : "/stats",
            )
          }
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
        <PlayerCareerBattingTab
          battingRows={battingRows}
          battingTotals={battingTotals}
          customTeams={customTeams}
        />
      )}

      {!loading && effectiveActiveTab === "pitching" && (
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
