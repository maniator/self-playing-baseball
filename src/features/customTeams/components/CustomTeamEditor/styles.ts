import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  padding: 24px;

  ${mq.mobile} {
    padding: 16px;
  }
`;

export const EditorTitle = styled.h2`
  color: ${({ theme }) => theme.colors.accentPrimary};
  font-size: 1.3rem;
  margin: 0 0 20px;
`;

export const FormSection = styled.section`
  margin-bottom: 20px;
`;

export const SectionHeading = styled.h3`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding-bottom: 6px;
`;

export const FieldRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;

  ${mq.mobile} {
    gap: 8px;
  }
`;

export const FieldGroup = styled.div<{ $flex?: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: ${({ $flex }) => $flex ?? 1};
  min-width: 120px;
`;

export const FieldLabel = styled.label`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${({ theme }) => theme.colors.textHint};
`;

export const TextInput = styled.input`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 6px;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 1px;
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.dangerText};
  }
`;

export const StatsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
`;

export const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

export const StatLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textHint};
  width: 56px;
  flex-shrink: 0;
`;

export const StatInput = styled.input`
  flex: 1;
  accent-color: ${({ theme }) => theme.colors.accentPrimary};
  cursor: pointer;
`;

export const StatValue = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLink};
  width: 28px;
  text-align: right;
  flex-shrink: 0;
`;

export const PlayerCard = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderCard};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 10px 12px;
  margin-bottom: 8px;
`;

export const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

export const SmallIconBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 28px;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const RemoveBtn = styled(SmallIconBtn)`
  color: ${({ theme }) => theme.colors.dangerText};
  border-color: ${({ theme }) => theme.colors.borderDanger};

  &:hover {
    background: ${({ theme }) => theme.colors.dangerHoverBg};
    border-color: ${({ theme }) => theme.colors.dangerHoverBorder};
  }
`;

export const AddPlayerBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px dashed ${({ theme }) => theme.colors.borderGreen};
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.accentGreen};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const ErrorMsg = styled.p`
  color: ${({ theme }) => theme.colors.warnText};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin: 0 0 12px;
  background: ${({ theme }) => theme.colors.errorBg};
  border: 1px solid ${({ theme }) => theme.colors.borderDanger};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px 12px;
`;

export const SelectInput = styled.select`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 6px;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  min-height: 32px;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 1px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 1px;
  }
`;

/** Two-row Team Info layout: Name (full width) then Abbrev + City. Stacks cleanly on mobile. */
export const TeamInfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 10px;
`;

export const TeamInfoSecondRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  ${mq.desktop} {
    grid-template-columns: 150px 1fr;
    gap: 12px;
  }
`;

/** Row for position + handedness selects, below the name input. */
export const PlayerMeta = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
`;

export const MetaGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const SaveBtn = styled.button`
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 10px 28px;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: ${({ theme }) => theme.colors.accentGreenBright};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.textPrimary};
    outline-offset: 2px;
  }
`;

export const CancelBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSemiLight};
  border: 1px solid ${({ theme }) => theme.colors.borderMid};
  border-radius: 20px;
  padding: 10px 24px;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: ${({ theme }) => theme.colors.bgDropdown};
    border-color: ${({ theme }) => theme.colors.textDimmer};
    color: ${({ theme }) => theme.colors.textDropdown};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const GenerateBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  min-height: 36px;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const StatBudgetRow = styled.div<{ $overCap: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: ${({ $overCap, theme }) => ($overCap ? "#ff8888" : theme.colors.textHint)};
`;

export const ReadOnlyInput = styled(TextInput)`
  opacity: 0.7;
  cursor: default;
  background: rgba(255, 255, 255, 0.04);
  color: #8899bb;
  border-color: ${({ theme }) => theme.colors.borderPanel};
`;

export const IdentityLockHint = styled.p`
  font-size: 11px;
  color: #5577aa;
  margin: 2px 0 8px;
  font-style: italic;
`;

/** Import-player button — ghost blue style, mirrors AddPlayerBtn. */
export const ImportPlayerBtn = styled(AddPlayerBtn)`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border-color: ${({ theme }) => theme.colors.borderForm};
  margin-top: 4px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
    color: ${({ theme }) => theme.colors.textLink};
  }
`;

/** Warning banner shown when an imported player matches an existing one. */
export const PlayerDuplicateBanner = styled.div`
  background: #1a1a00;
  border: 1px solid #886600;
  border-radius: 6px;
  padding: 10px 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #ffdd88;
`;

export const PlayerDuplicateActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`;
