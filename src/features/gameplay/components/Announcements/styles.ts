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
  margin-top: ${({ theme }) => theme.spacing.md};
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

export const AnnouncementsArea = styled.div`
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.sm};
  max-height: 300px;
  min-height: 60px;
  ${mq.mobile} {
    min-height: auto;
    max-height: none;
  }
`;

export const EmptyState = styled.div`
  color: ${({ theme }) => theme.colors.textDisabled};
  font-size: ${({ theme }) => theme.fontSizes.label};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s5};
`;

export const Log = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.label};
  padding: ${({ theme }) => theme.spacing.s3} ${({ theme }) => theme.spacing.s5};
  color: ${({ theme }) => theme.colors.textLight};
  ${mq.notMobile} {
    font-size: ${({ theme }) => theme.fontSizes.base};
  }
  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }
`;
