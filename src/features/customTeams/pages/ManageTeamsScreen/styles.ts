import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { BackBtn } from "@shared/components/PageLayout/styles";

export const ScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  padding-bottom: calc(24px + 80px);
  gap: 0;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    padding-bottom: calc(16px + 80px);
    /* On mobile body has overflow:hidden (game styles). Provide own scroll. */
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const ScreenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

export const ScreenTitle = styled.h1`
  color: white;
  font-size: 1.6rem;
  margin: 0 0 16px;

  ${mq.mobile} {
    font-size: 1.3rem;
  }
`;

export const InfoBanner = styled.p`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin: 0 0 16px;
`;

export const CreateBtn = styled.button`
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;
  align-self: center;
  width: min(100%, 340px);
  margin-top: 8px;
  margin-bottom: 20px;

  &:hover {
    background: ${({ theme }) => theme.colors.greenHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const TeamList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const TeamListItemCard = styled.li`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const TeamInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TeamName = styled.div`
  color: white;
  font-size: 1rem;
  font-weight: 600;
`;

export const TeamMeta = styled.div`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 12px;
  margin-top: 2px;
`;

export const TeamActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

export const ActionBtn = styled.button<{ $danger?: boolean }>`
  background: transparent;
  color: ${({ $danger, theme }) => ($danger ? "#ff7777" : theme.colors.textSecondaryLink)};
  border: 1px solid
    ${({ $danger, theme }) => ($danger ? theme.colors.borderDanger : theme.colors.borderForm)};
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 32px;

  &:hover {
    background: ${({ $danger, theme }) => ($danger ? "#2a0000" : theme.colors.bgSurface)};
    border-color: ${({ $danger, theme }) => ($danger ? "#cc4444" : theme.colors.textSecondaryLink)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 0.95rem;
  text-align: center;
  margin: 40px 0;
`;

/** Wrapper for the inline editor view — provides its own scroll on mobile. */
export const EditorShell = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  min-height: 100dvh;
  padding-bottom: 80px;

  ${mq.mobile} {
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const EditorShellHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 0;

  ${mq.mobile} {
    padding: 16px 16px 0;
  }
`;

export const EditorLoading = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 0.95rem;
  padding: 24px;
`;

export const NotFoundMsg = styled.p`
  color: #ff9977;
  font-size: 0.95rem;
  padding: 24px;
`;

export const TeamListLink = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textHint};
  border: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }
`;

export const ImportExportSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.borderForm};
  margin-top: 24px;
  padding-top: 20px;
`;

export const ImportExportTitle = styled.p`
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textHint};
  font-size: 11px;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
`;

export const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.accentGreen};
  background: #0d2016;
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 8px;
`;

export const FileInput = styled.input`
  display: none;
`;

export const ImportExportRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

export const ImportExportBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 36px;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const ErrorMessage = styled.p`
  color: #ff9977;
  font-size: 13px;
  margin-top: 8px;
`;

export const PasteTextarea = styled.textarea`
  width: 100%;
  min-height: 72px;
  background: #0a1525;
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.textBody};
  font-family: monospace;
  font-size: 11px;
  padding: 8px 10px;
  resize: vertical;
  box-sizing: border-box;
  margin-top: 10px;

  &::placeholder {
    color: #3a5070;
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
  margin-top: 6px;
`;

/** Banner shown when a team import is blocked due to duplicate players. */
export const DuplicateConfirmBanner = styled.div`
  background: #1a1a00;
  border: 1px solid #886600;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 10px;
  font-size: 13px;
  color: #ffdd88;
`;

export const DuplicateConfirmTitle = styled.p`
  margin: 0 0 8px;
  font-weight: 600;
  color: #ffcc44;
`;

export const DuplicateConfirmList = styled.ul`
  margin: 0 0 10px;
  padding-left: 18px;
  color: #ffdd88;
`;

export const DuplicateConfirmActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;
