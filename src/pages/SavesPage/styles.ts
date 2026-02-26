import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export { BackBtn, PageContainer, PageHeader } from "@components/PageLayout/styles";
export {
  ActionBtn,
  SaveActions,
  SaveCard,
  SaveDate,
  SaveInfo,
  SaveList,
  SaveName,
} from "@components/SaveSlotList/styles";

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

export const ImportSection = styled.div`
  border-top: 1px solid rgba(74, 96, 144, 0.3);
  padding-top: 20px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ImportSectionTitle = styled.h2`
  color: #88bbee;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 8px;
`;

export const PasteTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  background: #0a1525;
  border: 1px solid #4a6090;
  border-radius: 6px;
  color: #cce0ff;
  font-family: monospace;
  font-size: 11px;
  padding: 8px 10px;
  resize: vertical;
  box-sizing: border-box;

  &::placeholder {
    color: #3a5070;
  }

  &:focus {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-color: transparent;
  }
`;

export const PasteActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
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
