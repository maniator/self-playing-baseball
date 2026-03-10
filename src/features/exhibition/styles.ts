import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Dialog = styled.dialog`
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textDialog};
  border: 2px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.dialog};
  padding: ${({ theme }) => theme.spacing.s18} ${({ theme }) => theme.spacing.xxxl}
    ${({ theme }) => theme.spacing.s14};
  max-width: min(420px, 92vw);
  width: 100%;
  max-height: min(90dvh, 820px);
  overflow-y: auto;
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};

  &::backdrop {
    background: ${({ theme }) => theme.colors.overlayDark};
  }

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s14} ${({ theme }) => theme.spacing.s18}
      ${({ theme }) => theme.spacing.s14};
    max-height: min(96dvh, 820px);
    border-radius: ${({ theme }) => theme.radii.card};
  }
`;

export const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.fontSizes.dialogTitle};
  color: ${({ theme }) => theme.colors.accentPrimary};

  ${mq.mobile} {
    margin: 0 0 ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.fontSizes.display};
  }
`;

export const FieldGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  ${mq.mobile} {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
  }
`;

export const FieldLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.label};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacing.wider};
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  margin-bottom: ${({ theme }) => theme.spacing.s6};

  ${mq.mobile} {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    letter-spacing: ${({ theme }) => theme.letterSpacing.normal};
  }
`;

export const Input = styled.input`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.s10};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
  width: 100%;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s10};
  }
`;

export const Select = styled.select`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.s10};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
  width: 100%;
  cursor: pointer;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s10};
  }
`;

export const SectionLabel = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.label};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacing.wider};
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};

  ${mq.mobile} {
    margin: 0 0 ${({ theme }) => theme.spacing.xs};
    letter-spacing: ${({ theme }) => theme.letterSpacing.normal};
  }
`;

export const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.textBody};

  & input[type="radio"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
  }

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.xxs} 0;
    font-size: ${({ theme }) => theme.fontSizes.label};
  }
`;

export const ResumeButton = styled.button`
  display: block;
  width: 100%;
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.xxl};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing.xs};

  &:hover {
    background: ${({ theme }) => theme.colors.greenHover};
  }

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.s7} ${({ theme }) => theme.spacing.lg};
    font-size: ${({ theme }) => theme.fontSizes.base};
  }
`;

export const Divider = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.borderForm};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin: ${({ theme }) => theme.spacing.md} 0 ${({ theme }) => theme.spacing.lg};

  ${mq.mobile} {
    margin: ${({ theme }) => theme.spacing.s6} 0 ${({ theme }) => theme.spacing.sm};
  }
`;

export const PlayBallButton = styled.button`
  display: block;
  width: 100%;
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: darkblue;
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.xxl};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  cursor: pointer;
  margin-top: ${({ theme }) => theme.spacing.sm};

  ${mq.mobile} {
    margin-top: ${({ theme }) => theme.spacing.s6};
  }
`;

export const SeedHint = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textHint};
  margin: ${({ theme }) => theme.spacing.s5} 0 0;

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    line-height: 1.3;
    margin-top: ${({ theme }) => theme.spacing.s3};
  }
`;

export const ResumeLabel = styled.span`
  ${mq.mobile} {
    display: none;
  }
`;

export const BackHomeButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textHint};
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  padding: 0 0 ${({ theme }) => theme.spacing.s10};
  display: block;

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.s3};
  }

  ${mq.mobile} {
    padding: 0 0 ${({ theme }) => theme.spacing.s6};
  }
`;

export const TabRow = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border-bottom: 2px solid ${({ theme }) => theme.colors.borderCard};

  ${mq.mobile} {
    margin-bottom: ${({ theme }) => theme.spacing.s10};
  }
`;

export const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.accentPrimary : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentPrimary : theme.colors.textHint)};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  padding: ${({ theme }) => theme.spacing.s6} ${({ theme }) => theme.spacing.s14}
    ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  margin-bottom: -2px;

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.s3} ${({ theme }) => theme.radii.s3} 0 0;
  }
`;

export const TeamValidationError = styled.p`
  background: ${({ theme }) => theme.colors.bgExhibitionError};
  border: 1px solid ${({ theme }) => theme.colors.borderExhibitionError};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textError};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin: ${({ theme }) => theme.spacing.s6} 0 0;
  padding: ${({ theme }) => theme.spacing.s7} ${({ theme }) => theme.spacing.s10};
  line-height: 1.4;
`;
