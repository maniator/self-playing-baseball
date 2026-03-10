import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

// ── Team Summary panel ────────────────────────────────────────────────────────

/** Container for the team summary + leaders section (above tabs). */
export const TeamSummarySection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const SummaryHeading = styled.h2`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  margin: 0;
`;

/** Grid of stat cells for the team summary. */
export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};

  ${mq.mobile} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

/** A single stat cell in the summary grid. */
export const SummaryCell = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

export const SummaryCellLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
`;

export const SummaryCellValue = styled.span`
  color: ${({ theme }) => theme.colors.textBody};
  font-size: ${({ theme }) => theme.fontSizes.display};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

// ── Leader cards ─────────────────────────────────────────────────────────────

/** Label above a group of leader cards. */
export const LeadersGroupLabel = styled.h3`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

export const LeaderCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};

  ${mq.mobile} {
    grid-template-columns: repeat(1, 1fr);
  }
`;

export const LeaderCard = styled.button`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px ${({ theme }) => theme.spacing.md};
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderForm};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const LeaderCardPlaceholder = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px dashed ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const LeaderStatLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
`;

export const LeaderName = styled.span`
  color: ${({ theme }) => theme.colors.textLink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const LeaderValue = styled.span`
  color: ${({ theme }) => theme.colors.accentGreen};
  font-size: ${({ theme }) => theme.fontSizes.dialogTitle};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const LeaderPlaceholderText = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;
