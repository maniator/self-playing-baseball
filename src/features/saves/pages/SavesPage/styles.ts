import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export {
  ActionBtn,
  SaveActions,
  SaveCard,
  SaveDate,
  SaveInfo,
  SaveList,
  SaveName,
} from "@feat/saves/components/SaveSlotList/styles";
export { BackBtn, PageContainer, PageHeader } from "@shared/components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1.6rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.3rem;
  }
`;

export const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 0.95rem;
  text-align: center;
  margin: 40px 0;
`;

export const LoadingState = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 0.95rem;
  margin: 24px 0;
`;

export const ImportSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.borderFormAlpha30};
  padding-top: 20px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ImportSectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 8px;
`;

export const PasteTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  background: ${({ theme }) => theme.colors.bgImport};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textBody};
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: 8px 10px;
  resize: vertical;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textDimBlue};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
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
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: 13px;
  cursor: pointer;
`;

export const FileInput = styled.input`
  font-family: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondaryLink};

  &::file-selector-button {
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondaryLink};
    border: 1px solid ${({ theme }) => theme.colors.borderForm};
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    margin-right: 8px;

    &:hover {
      background: ${({ theme }) => theme.colors.bgSurface};
    }
  }
`;

export const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.dangerText};
  background: ${({ theme }) => theme.colors.errorBgTransparent};
  border: 1px solid ${({ theme }) => theme.colors.borderDanger};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-top: 10px;
`;
