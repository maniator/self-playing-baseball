import { mq } from "@shared/utils/mediaQueries";
import styled, { css } from "styled-components";

export const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.s10};
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} 0;

  ${mq.mobile} {
    gap: ${({ theme }) => theme.spacing.s6};
    padding: ${({ theme }) => theme.spacing.xs} 0;
  }
`;

type ButtonVariant = "default" | "new" | "saves" | "home";

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  default: css`
    background: ${({ theme }) => theme.colors.accentPrimary};
    color: ${({ theme }) => theme.colors.btnTextDark};
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
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.s18};
  border-radius: ${({ theme }) => theme.radii.pill};
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
  border-radius: ${({ theme }) => theme.radii.card};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s5} ${({ theme }) => theme.spacing.sm};
    gap: ${({ theme }) => theme.spacing.s6};
  }
`;

export const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.s6};
  font-size: ${({ theme }) => theme.fontSizes.base};
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
    width: ${({ theme }) => theme.sizes.iconSm};
    height: ${({ theme }) => theme.sizes.iconSm};
  }

  ${mq.notMobile} {
    font-size: ${({ theme }) => theme.fontSizes.md};
  }
`;

export const BatterUpButton = styled(Button)`
  font-size: ${({ theme }) => theme.fontSizes.dialogTitle};
  padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.s28};
  font-weight: bold;

  ${mq.desktop} {
    font-size: ${({ theme }) => theme.fontSizes.f20};
    padding: ${({ theme }) => theme.spacing.s18} ${({ theme }) => theme.spacing.xxxl};
  }
`;

export const HelpButton = styled.button`
  background: ${({ theme }) => theme.colors.helpButtonBg};
  color: ${({ theme }) => theme.colors.textLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 50%;
  width: ${({ theme }) => theme.sizes.icon};
  height: ${({ theme }) => theme.sizes.icon};
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
  padding: ${({ theme }) => theme.spacing.s3} ${({ theme }) => theme.spacing.s6};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
`;
