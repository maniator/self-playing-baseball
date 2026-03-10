import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export {
  EmptyState,
  SectionLabel,
  StatsTable,
  TabBar,
  TabBtn,
  TableWrapper,
  Td,
  Th,
  TotalsRow,
} from "../../styles";

/** Full-height page container for the player career page. */
export const PlayerCareerContainer = styled.div`
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

/** Player name heading. */
export const PlayerName = styled.h1`
  color: white;
  font-size: 1.4rem;
  margin: 0 0 4px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;

/** Sub-label below the player name (role info). */
export const PlayerRoleLabel = styled.p`
  color: #888;
  font-size: 13px;
  margin: 0 0 20px;
`;

/** Prev/Next navigation row. */
export const NavRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

/** Prev/Next button. */
export const NavBtn = styled.button`
  background: #1a1a2e;
  border: 1px solid #333;
  color: #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  &:hover:not(:disabled) {
    background: #25254a;
    color: ${({ theme }) => theme.colors.textPrimary};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
