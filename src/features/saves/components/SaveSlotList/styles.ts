import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const SaveList = styled.ul`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.spacing.xxl};
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.s10};
`;

export const SaveCard = styled.li`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: ${({ theme }) => theme.spacing.s14} ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};

  ${mq.mobile} {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

export const SaveInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const SaveName = styled.div`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.bodyLg};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SaveDate = styled.div`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin-top: ${({ theme }) => theme.spacing.xxs};
`;

export const SaveActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-shrink: 0;

  ${mq.mobile} {
    width: 100%;
    justify-content: flex-end;
  }
`;

export const ActionBtn = styled.button<{ $variant?: "primary" | "secondary" | "danger" }>`
  background: transparent;
  color: ${({ $variant, theme }) =>
    $variant === "primary"
      ? theme.colors.accentGreen
      : $variant === "danger"
        ? theme.colors.dangerText
        : theme.colors.textSecondaryLink};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === "primary"
        ? theme.colors.borderGreen
        : $variant === "danger"
          ? theme.colors.borderDanger
          : theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.inputMd};

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === "primary"
        ? theme.colors.greenBg
        : $variant === "danger"
          ? theme.colors.dangerHoverBg
          : theme.colors.bgSurface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;
