import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const SaveList = styled.ul`
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SaveCard = styled.li`
  background: #0d1b2e;
  border: 1px solid #4a6090;
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
  color: white;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SaveDate = styled.div`
  color: #6680aa;
  font-size: 12px;
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

const VARIANT_COLOR: Record<string, string> = {
  primary: "#6effc0",
  danger: "#ff7777",
  secondary: "#88bbee",
};

const VARIANT_BORDER: Record<string, string> = {
  primary: "#3a7a5a",
  danger: "#883333",
  secondary: "#4a6090",
};

const VARIANT_HOVER_BG: Record<string, string> = {
  primary: "#1a3a2a",
  danger: "#2a0000",
  secondary: "#0d1b2e",
};

export const ActionBtn = styled.button<{ $variant?: "primary" | "secondary" | "danger" }>`
  background: transparent;
  color: ${({ $variant }) => VARIANT_COLOR[$variant ?? "secondary"]};
  border: 1px solid ${({ $variant }) => VARIANT_BORDER[$variant ?? "secondary"]};
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 32px;

  &:hover {
    background: ${({ $variant }) => VARIANT_HOVER_BG[$variant ?? "secondary"]};
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;
