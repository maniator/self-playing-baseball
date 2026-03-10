import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Banner = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textBody};
  border-top: 2px solid ${({ theme }) => theme.colors.borderForm};
  padding: 10px ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: 0.875rem;

  ${mq.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

export const Message = styled.p`
  margin: 0;
  flex: 1;
  line-height: 1.4;
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  flex-shrink: 0;
`;

export const ReloadButton = styled.button`
  background: ${({ theme }) => theme.colors.buttonNewBg};
  border: none;
  color: #000;
  cursor: pointer;
  padding: 5px 14px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: bold;
  min-height: 32px;

  &:hover {
    background: ${({ theme }) => theme.colors.buttonNewBgHover};
  }
`;

export const DismissButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textBody};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs} 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 32px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;
