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
  margin: 0 0 ${({ theme }) => theme.spacing.xl};

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
  margin: ${({ theme }) => theme.spacing.xxl} 0;
`;

export const ImportSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.borderFormAlpha30};
  padding-top: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

export const ImportSectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
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
  padding: ${({ theme }) => theme.spacing.sm} 10px;
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
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
`;

export const ImportLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  cursor: pointer;
`;

export const FileInput = styled.input`
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.label};
  color: ${({ theme }) => theme.colors.textSecondaryLink};

  &::file-selector-button {
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondaryLink};
    border: 1px solid ${({ theme }) => theme.colors.borderForm};
    border-radius: ${({ theme }) => theme.radii.md};
    padding: ${({ theme }) => theme.spacing.xs} 10px;
    font-size: ${({ theme }) => theme.fontSizes.label};
    font-family: inherit;
    cursor: pointer;
    margin-right: ${({ theme }) => theme.spacing.sm};

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
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-top: 10px;
`;
