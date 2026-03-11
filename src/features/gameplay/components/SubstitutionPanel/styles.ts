import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderCard};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.s14};
  margin-top: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  max-width: 480px;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.md};
    max-width: 100%;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.s10};
`;

export const PanelTitle = styled.h4`
  color: ${({ theme }) => theme.colors.accentPrimary};
  font-size: ${({ theme }) => theme.fontSizes.sub};
  margin: 0;
  font-weight: 600;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  line-height: 1.4;

  &:hover {
    background: ${({ theme }) => theme.colors.bgInput};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.s10};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SectionTitle = styled.h5`
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  font-size: ${({ theme }) => theme.fontSizes.tiny};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacing.wide};
  margin: 0 0 ${({ theme }) => theme.spacing.s6};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.s6};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const SelectField = styled.select`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.label};
  cursor: pointer;
  min-height: 30px;
  flex: 1;
  min-width: 100px;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 1px;
  }
`;

export const ActionButton = styled.button`
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 5px ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 30px;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.accentBright};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.textPrimary};
    outline-offset: 2px;
  }
`;

export const EmptyNote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textHint};
  margin: 2px 0 ${({ theme }) => theme.spacing.xs};
  font-style: italic;
`;

export const FatigueBar = styled.div``;

export const FatigueLabel = styled.span<{ $level: "low" | "medium" | "high" }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  padding: 1px ${({ theme }) => theme.spacing.s6};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $level, theme }) =>
    $level === "high"
      ? theme.colors.textFatigueHigh
      : $level === "medium"
        ? theme.colors.textFatigueMed
        : theme.colors.textFaint};
`;

export const SubButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.s10};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.inputSm};
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;
