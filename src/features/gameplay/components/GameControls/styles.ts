import { mq } from "@shared/utils/mediaQueries";
import styled, { css } from "styled-components";

export const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} 0;

  ${mq.mobile} {
    gap: 6px;
    padding: ${({ theme }) => theme.spacing.xs} 0;
  }
`;

type ButtonVariant = "default" | "new" | "saves" | "home";

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  default: css`
    background: ${({ theme }) => theme.colors.accentPrimary};
    color: darkblue;
    border: none;
  `,
  new: css`
    background: ${({ theme }) => theme.colors.buttonNewBg};
    color: ${({ theme }) => theme.colors.textPrimary};
    border: none;
    font-weight: bold;
  `,
  saves: css`
    background: ${({ theme }) => theme.colors.greenBg};
    color: ${({ theme }) => theme.colors.accentGreen};
    border: 1px solid ${({ theme }) => theme.colors.borderGreen};
    &:hover {
      background: ${({ theme }) => theme.colors.greenHover};
    }
  `,
  home: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    border: 1px solid ${({ theme }) => theme.colors.borderMid};
    &:hover {
      background: ${({ theme }) => theme.colors.bgDropdown};
      border-color: ${({ theme }) => theme.colors.textDimmer};
      color: ${({ theme }) => theme.colors.textDropdown};
    }
  `,
};

export const Button = styled.button<{ $variant?: ButtonVariant }>`
  padding: ${({ theme }) => theme.spacing.md} 18px;
  border-radius: 30px;
  cursor: pointer;
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
  ${({ $variant = "default" }) => variantStyles[$variant]}

  ${mq.desktop} {
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    font-size: ${({ theme }) => theme.fontSizes.base};
  }
`;

export const AutoPlayGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  background: ${({ theme }) => theme.colors.navGroupBg};
  border-radius: 10px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};

  ${mq.mobile} {
    padding: 5px ${({ theme }) => theme.spacing.sm};
    gap: 6px;
  }
`;

export const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.fontSizes.base};
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
    width: 14px;
    height: 14px;
  }

  ${mq.notMobile} {
    font-size: ${({ theme }) => theme.fontSizes.md};
  }
`;

export const BatterUpButton = styled(Button)`
  font-size: ${({ theme }) => theme.fontSizes.dialogTitle};
  padding: ${({ theme }) => theme.spacing.lg} 28px;
  font-weight: bold;

  ${mq.desktop} {
    font-size: 20px;
    padding: 18px ${({ theme }) => theme.spacing.xxxl};
  }
`;

export const HelpButton = styled.button`
  background: ${({ theme }) => theme.colors.helpButtonBg};
  color: ${({ theme }) => theme.colors.textLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 50%;
  width: 25px;
  height: 25px;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-family: inherit;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.helpButtonBgHover};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

export const Select = styled.select`
  background: ${({ theme }) => theme.colors.bgInputSm};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 3px 6px;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
`;
