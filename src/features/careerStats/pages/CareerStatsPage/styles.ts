import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export {
  EmptyState,
  PlayerLink,
  StatsTable,
  TabBar,
  TabBtn,
  TableWrapper,
  Td,
  Th,
} from "../../styles";

/** Wider page container for the career stats tables (up to 900px). */
export const CareerContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  padding-bottom: calc(24px + 80px);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    padding-bottom: calc(16px + 80px);
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    > * {
      flex-shrink: 0;
    }
  }
`;

/** Team selector row. */
export const TeamSelectorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const TeamSelectLabel = styled.label`
  color: #888;
  font-size: 13px;
  white-space: nowrap;
`;

export const TeamSelect = styled.select`
  background: #0d1b2e;
  color: #cce0ff;
  border: 1px solid #2a3a5a;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }

  option {
    background: #0a0a1a;
    color: #cce0ff;
  }
`;

/** Page header title. */
export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.4rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;

export {
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
} from "./teamSummaryStyles";
