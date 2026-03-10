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
  padding: ${({ theme }) => theme.spacing.xxl};
  padding-bottom: calc(
    ${({ theme }) => theme.spacing.xxl} + ${({ theme }) => theme.sizes.bottomBar}
  );
  max-width: 900px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.lg};
    padding-bottom: calc(
      ${({ theme }) => theme.spacing.lg} + ${({ theme }) => theme.sizes.bottomBar}
    );
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
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.h2};
  margin: 0 0 ${({ theme }) => theme.spacing.xs};

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.h3};
  }
`;

/** Sub-label below the player name (role info). */
export const PlayerRoleLabel = styled.p`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin: 0 0 ${({ theme }) => theme.spacing.xl};
`;

/** Prev/Next navigation row. */
export const NavRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

/** Prev/Next button. */
export const NavBtn = styled.button`
  background: ${({ theme }) => theme.colors.bgSurfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderLog};
  color: ${({ theme }) => theme.colors.textLight};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s14};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bgPaginationHover};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
