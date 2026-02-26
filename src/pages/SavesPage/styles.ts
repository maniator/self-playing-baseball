import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

export const BackBtn = styled.button`
  background: transparent;
  color: #6680aa;
  border: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0;
  min-height: 36px;

  &:hover {
    color: #aaccff;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-radius: 3px;
  }
`;

export const PageTitle = styled.h1`
  color: white;
  font-size: 1.6rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.3rem;
  }
`;

export const EmptyState = styled.p`
  color: #6680aa;
  font-size: 0.95rem;
  text-align: center;
  margin: 40px 0;
`;

export const LoadingState = styled.p`
  color: #6680aa;
  font-size: 0.95rem;
  margin: 24px 0;
`;

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

export const ImportSection = styled.div`
  border-top: 1px solid rgba(74, 96, 144, 0.3);
  padding-top: 20px;
  margin-top: 8px;
`;

export const ImportLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #88bbee;
  font-size: 13px;
  cursor: pointer;
`;

export const FileInput = styled.input`
  font-family: inherit;
  font-size: 12px;
  color: #88bbee;

  &::file-selector-button {
    background: transparent;
    color: #88bbee;
    border: 1px solid #4a6090;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    margin-right: 8px;

    &:hover {
      background: #0d1b2e;
    }
  }
`;

export const ErrorMessage = styled.p`
  color: #ff7777;
  background: rgba(80, 0, 0, 0.3);
  border: 1px solid #883333;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  margin-top: 10px;
`;
