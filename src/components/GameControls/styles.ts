import styled, { css } from "styled-components";

import { mq } from "@utils/mediaQueries";

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

type ButtonVariant = "default" | "share" | "new" | "saves";

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  default: css`
    background: aquamarine;
    color: darkblue;
    border: none;
  `,
  share: css`
    background: #2f3f69;
    color: #fff;
    border: none;
  `,
  new: css`
    background: #22c55e;
    color: #fff;
    border: none;
    font-weight: bold;
  `,
  saves: css`
    background: #1a3a2a;
    color: #6effc0;
    border: 1px solid #3a7a5a;
    &:hover {
      background: #254f38;
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
  background: rgba(47, 63, 105, 0.5);
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
    accent-color: aquamarine;
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
  background: rgba(47, 63, 105, 0.7);
  color: #aaccff;
  border: 1px solid #4a6090;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: rgba(74, 96, 144, 0.9);
    color: #fff;
  }
`;

export const Select = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;
