import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.label};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacing.widest};
  color: ${({ theme }) => theme.colors.textSubdued};
  margin-bottom: ${({ theme }) => theme.spacing.s6};
  padding-bottom: ${({ theme }) => theme.spacing.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLog};
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.bgVoid};
  z-index: 1;
`;

export const Toggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textDisabled};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  padding: 0 ${({ theme }) => theme.spacing.xxs};
  &:hover {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export const Area = styled.div`
  overflow-y: auto;
  max-height: 200px;
  ${mq.mobile} {
    max-height: none;
  }
`;

export const Entry = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.label};
  padding: ${({ theme }) => theme.spacing.s3} ${({ theme }) => theme.spacing.s5};
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  gap: ${({ theme }) => theme.spacing.s6};
  align-items: baseline;
  ${mq.notMobile} {
    font-size: ${({ theme }) => theme.fontSizes.base};
  }
`;

export const Label = styled.span<{ $hr?: boolean }>`
  font-weight: bold;
  color: ${({ $hr, theme }) => ($hr ? theme.colors.accentPrimary : theme.colors.textScoreHeader)};
  min-width: 22px;
`;

export const Runs = styled.span`
  color: ${({ theme }) => theme.colors.textDanger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const EmptyState = styled.div`
  color: ${({ theme }) => theme.colors.textDisabled};
  font-size: ${({ theme }) => theme.fontSizes.label};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s5};
`;
