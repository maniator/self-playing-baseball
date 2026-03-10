import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const SaveList = styled.ul`
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SaveCard = styled.li`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${mq.mobile} {
    flex-wrap: wrap;
    gap: 8px;
  }
`;

export const SaveInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const SaveName = styled.div`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SaveDate = styled.div`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin-top: 2px;
`;

export const SaveActions = styled.div`
  display: flex;
  gap: 8px;
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
  padding: 6px 12px;
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  min-height: 32px;

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
