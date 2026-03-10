import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { BackBtn } from "@shared/components/PageLayout/styles";

export const ScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing.xxl};
  padding-bottom: calc(
    ${({ theme }) => theme.spacing.xxl} + ${({ theme }) => theme.sizes.bottomBar}
  );
  gap: 0;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.lg};
    padding-bottom: calc(
      ${({ theme }) => theme.spacing.lg} + ${({ theme }) => theme.sizes.bottomBar}
    );
    /* On mobile body has overflow:hidden (game styles). Provide own scroll. */
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const ScreenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

export const ScreenTitle = styled.h1`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.h1};
  margin: 0 0 ${({ theme }) => theme.spacing.lg};

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.xxl};
  }
`;

export const InfoBanner = styled.p`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.s14};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
`;

export const CreateBtn = styled.button`
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.fontSizes.body};
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.btnLg};
  align-self: center;
  width: min(100%, 340px);
  margin-top: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

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
  gap: ${({ theme }) => theme.spacing.s10};
`;

export const TeamListItemCard = styled.li`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: ${({ theme }) => theme.spacing.s14} ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const TeamInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TeamName = styled.div`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.bodyLg};
  font-weight: 600;
`;

export const TeamMeta = styled.div`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin-top: ${({ theme }) => theme.spacing.xxs};
`;

export const TeamActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-shrink: 0;
`;

export const ActionBtn = styled.button<{ $danger?: boolean }>`
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.dangerText : theme.colors.textSecondaryLink};
  border: 1px solid
    ${({ $danger, theme }) => ($danger ? theme.colors.borderDanger : theme.colors.borderForm)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.inputMd};

  &:hover {
    background: ${({ $danger, theme }) =>
      $danger ? theme.colors.dangerHoverBg : theme.colors.bgSurface};
    border-color: ${({ $danger, theme }) =>
      $danger ? theme.colors.dangerHoverBorder : theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.body};
  text-align: center;
  margin: ${({ theme }) => theme.spacing.s40} 0;
`;

/** Wrapper for the inline editor view — provides its own scroll on mobile. */
export const EditorShell = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  min-height: 100dvh;
  padding-bottom: ${({ theme }) => theme.sizes.bottomBar};

  ${mq.mobile} {
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const EditorShellHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xxl} 0;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.lg} 0;
  }
`;

export const EditorLoading = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.body};
  padding: ${({ theme }) => theme.spacing.xxl};
`;

export const NotFoundMsg = styled.p`
  color: ${({ theme }) => theme.colors.textWarnOrange};
  font-size: ${({ theme }) => theme.fontSizes.body};
  padding: ${({ theme }) => theme.spacing.xxl};
`;

export const TeamListLink = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textHint};
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.base};
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
  margin-top: ${({ theme }) => theme.spacing.xxl};
  padding-top: ${({ theme }) => theme.spacing.xl};
`;

export const ImportExportTitle = styled.p`
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  letter-spacing: ${({ theme }) => theme.letterSpacing.tight};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

export const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.accentGreen};
  background: ${({ theme }) => theme.colors.successBg};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.s14};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

export const FileInput = styled.input`
  display: none;
`;

export const ImportExportRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
`;

export const ImportExportBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.s14};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.btnMd};

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
  color: ${({ theme }) => theme.colors.textWarnOrange};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

export const PasteTextarea = styled.textarea`
  width: 100%;
  min-height: ${({ theme }) => theme.sizes.pasteTextarea};
  background: ${({ theme }) => theme.colors.bgImport};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textBody};
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.s10};
  resize: vertical;
  box-sizing: border-box;
  margin-top: ${({ theme }) => theme.spacing.s10};

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
  margin-top: ${({ theme }) => theme.spacing.s6};
`;

/** Banner shown when a team import is blocked due to duplicate players. */
export const DuplicateConfirmBanner = styled.div`
  background: ${({ theme }) => theme.colors.bgWarnDeep};
  border: 1px solid ${({ theme }) => theme.colors.borderWarn};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.s14};
  margin-top: ${({ theme }) => theme.spacing.s10};
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.textWarnGold};
`;

export const DuplicateConfirmTitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textWarnBright};
`;

export const DuplicateConfirmList = styled.ul`
  margin: 0 0 ${({ theme }) => theme.spacing.s10};
  padding-left: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textWarnGold};
`;

export const DuplicateConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

export const DuplicateConfirmNote = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.label};
  color: ${({ theme }) => theme.colors.textTeamInfo};
`;
