import { mq } from "@shared/utils/mediaQueries";
import styled, { css } from "styled-components";

export const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 0;

  ${mq.mobile} {
    gap: 6px;
    padding: 4px 0;
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
  padding: 12px 18px;
  border-radius: 30px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  ${({ $variant = "default" }) => variantStyles[$variant]}

  ${mq.desktop} {
    font-size: 15px;
  }

  ${mq.mobile} {
    padding: 8px 12px;
    font-size: 13px;
  }
`;

export const AutoPlayGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  background: ${({ theme }) => theme.colors.navGroupBg};
  border-radius: 10px;
  padding: 8px 12px;

  ${mq.mobile} {
    padding: 5px 8px;
    gap: 6px;
  }
`;

export const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
    width: 14px;
    height: 14px;
  }

  ${mq.notMobile} {
    font-size: 14px;
  }
`;

export const BatterUpButton = styled(Button)`
  font-size: 18px;
  padding: 16px 28px;
  font-weight: bold;

  ${mq.desktop} {
    font-size: 20px;
    padding: 18px 32px;
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
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;
