import * as React from "react";

import { formatOutsAsIP, formatRPG, formatWinPct } from "@feat/careerStats/hooks/careerStatsShared";
import {
  LeaderCard,
  LeaderCardPlaceholder,
  LeaderCardsRow,
  LeaderName,
  LeaderPlaceholderText,
  LeadersGroupLabel,
  LeaderStatLabel,
  LeaderValue,
  SummaryCell,
  SummaryCellLabel,
  SummaryCellValue,
  SummaryGrid,
  SummaryHeading,
  TeamSummarySection,
} from "@feat/careerStats/pages/CareerStatsPage/styles";
import {
  MIN_AB_FOR_AVG_LEADER,
  MIN_OUTS_FOR_ERA_LEADER,
} from "@feat/careerStats/storage/gameHistoryStore";

import type { BattingLeader, PitchingLeader, TeamCareerSummary } from "@storage/types";

type Props = {
  dataLoading: boolean;
  teamSummary: TeamCareerSummary | null;
  hrLeader: BattingLeader | null;
  avgLeader: BattingLeader | null;
  rbiLeader: BattingLeader | null;
  eraLeader: PitchingLeader | null;
  savesLeader: PitchingLeader | null;
  strikeoutsLeader: PitchingLeader | null;
  onOpenPlayer: (playerId: string) => void;
};

const CareerStatsSummaryPanel: React.FunctionComponent<Props> = ({
  dataLoading,
  teamSummary,
  hrLeader,
  avgLeader,
  rbiLeader,
  eraLeader,
  savesLeader,
  strikeoutsLeader,
  onOpenPlayer,
}) => {
  if (dataLoading || !teamSummary) {
    return null;
  }

  return (
    <TeamSummarySection data-testid="team-summary-section">
      <SummaryHeading>Team Summary</SummaryHeading>
      <SummaryGrid data-testid="team-summary-grid">
        <SummaryCell>
          <SummaryCellLabel>GP</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-gp">{teamSummary.gamesPlayed}</SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>W-L</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-wl">
            {teamSummary.wins}-{teamSummary.losses}
            {teamSummary.ties > 0 ? `-${teamSummary.ties}` : ""}
          </SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>WIN%</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-winpct">
            {formatWinPct(teamSummary.winPct)}
          </SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>RS</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-rs">{teamSummary.runsScored}</SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>RA</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-ra">{teamSummary.runsAllowed}</SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>DIFF</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-diff">
            {teamSummary.runDiff > 0 ? "+" : ""}
            {teamSummary.runDiff}
          </SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>RS/G</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-rspg">
            {formatRPG(teamSummary.rsPerGame)}
          </SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>RA/G</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-rapg">
            {formatRPG(teamSummary.raPerGame)}
          </SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>STREAK</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-streak">{teamSummary.streak}</SummaryCellValue>
        </SummaryCell>
        <SummaryCell>
          <SummaryCellLabel>LAST 10</SummaryCellLabel>
          <SummaryCellValue data-testid="summary-last10">
            {teamSummary.last10.wins}-{teamSummary.last10.losses}
            {teamSummary.last10.ties > 0 ? `-${teamSummary.last10.ties}` : ""}
          </SummaryCellValue>
        </SummaryCell>
      </SummaryGrid>

      <LeadersGroupLabel>Batting Leaders</LeadersGroupLabel>
      <LeaderCardsRow data-testid="batting-leaders-row">
        {hrLeader ? (
          <LeaderCard
            type="button"
            data-testid="hr-leader-card"
            onClick={() => onOpenPlayer(hrLeader.playerId)}
          >
            <LeaderStatLabel>HR</LeaderStatLabel>
            <LeaderValue>{hrLeader.value}</LeaderValue>
            <LeaderName>{hrLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>HR — no data</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
        {avgLeader ? (
          <LeaderCard
            type="button"
            data-testid="avg-leader-card"
            onClick={() => onOpenPlayer(avgLeader.playerId)}
          >
            <LeaderStatLabel>
              AVG{" "}
              <span aria-label={`minimum ${MIN_AB_FOR_AVG_LEADER} at-bats required`}>
                (min {MIN_AB_FOR_AVG_LEADER} AB)
              </span>
            </LeaderStatLabel>
            <LeaderValue>{avgLeader.value.toFixed(3).replace(/^0/, "")}</LeaderValue>
            <LeaderName>{avgLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>AVG — no qualifier</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
        {rbiLeader ? (
          <LeaderCard
            type="button"
            data-testid="rbi-leader-card"
            onClick={() => onOpenPlayer(rbiLeader.playerId)}
          >
            <LeaderStatLabel>RBI</LeaderStatLabel>
            <LeaderValue>{rbiLeader.value}</LeaderValue>
            <LeaderName>{rbiLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>RBI — no data</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
      </LeaderCardsRow>

      <LeadersGroupLabel>Pitching Leaders</LeadersGroupLabel>
      <LeaderCardsRow data-testid="pitching-leaders-row">
        {eraLeader ? (
          <LeaderCard
            type="button"
            data-testid="era-leader-card"
            onClick={() => onOpenPlayer(eraLeader.playerId)}
          >
            <LeaderStatLabel>
              ERA (min {formatOutsAsIP(MIN_OUTS_FOR_ERA_LEADER)} IP)
            </LeaderStatLabel>
            <LeaderValue>{eraLeader.value.toFixed(2)}</LeaderValue>
            <LeaderName>{eraLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>ERA — no qualifier</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
        {savesLeader && savesLeader.value > 0 ? (
          <LeaderCard
            type="button"
            data-testid="saves-leader-card"
            onClick={() => onOpenPlayer(savesLeader.playerId)}
          >
            <LeaderStatLabel>SV</LeaderStatLabel>
            <LeaderValue>{savesLeader.value}</LeaderValue>
            <LeaderName>{savesLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>SV — no data</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
        {strikeoutsLeader ? (
          <LeaderCard
            type="button"
            data-testid="k-leader-card"
            onClick={() => onOpenPlayer(strikeoutsLeader.playerId)}
          >
            <LeaderStatLabel>K</LeaderStatLabel>
            <LeaderValue>{strikeoutsLeader.value}</LeaderValue>
            <LeaderName>{strikeoutsLeader.nameAtGameTime}</LeaderName>
          </LeaderCard>
        ) : (
          <LeaderCardPlaceholder>
            <LeaderPlaceholderText>K — no data</LeaderPlaceholderText>
          </LeaderCardPlaceholder>
        )}
      </LeaderCardsRow>
    </TeamSummarySection>
  );
};

export default CareerStatsSummaryPanel;
