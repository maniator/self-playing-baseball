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
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.base};
  white-space: nowrap;
`;

export const TeamSelect = styled.select`
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textBody};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }

  option {
    background: ${({ theme }) => theme.colors.bgDeep};
    color: ${({ theme }) => theme.colors.textBody};
  }
`;

/** Page header title. */
export const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.accentPrimary};
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
