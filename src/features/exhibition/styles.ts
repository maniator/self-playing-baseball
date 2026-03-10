import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Dialog = styled.dialog`
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textDialog};
  border: 2px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 14px;
  padding: 18px 32px 14px;
  max-width: min(420px, 92vw);
  width: 100%;
  max-height: min(90dvh, 820px);
  overflow-y: auto;
  font-family: inherit;
  font-size: 14px;

  &::backdrop {
    background: rgba(0, 0, 0, 0.75);
  }

  ${mq.mobile} {
    padding: 14px 18px 14px;
    max-height: min(96dvh, 820px);
    border-radius: 10px;
  }
`;

export const Title = styled.h2`
  margin: 0 0 16px;
  font-size: ${({ theme }) => theme.fontSizes.dialogTitle};
  color: ${({ theme }) => theme.colors.accentPrimary};

  ${mq.mobile} {
    margin: 0 0 8px;
    font-size: ${({ theme }) => theme.fontSizes.display};
  }
`;

export const FieldGroup = styled.div`
  margin-bottom: 8px;

  ${mq.mobile} {
    margin-bottom: 4px;
  }
`;

export const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  margin-bottom: 6px;

  ${mq.mobile} {
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }
`;

export const Input = styled.input`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;

  ${mq.mobile} {
    padding: 6px 10px;
  }
`;

export const Select = styled.select`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  cursor: pointer;

  ${mq.mobile} {
    padding: 6px 10px;
  }
`;

export const SectionLabel = styled.p`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  margin: 0 0 8px;

  ${mq.mobile} {
    margin: 0 0 4px;
    letter-spacing: 0.5px;
  }
`;

export const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textBody};

  & input[type="radio"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
  }

  ${mq.mobile} {
    padding: 2px 0;
    font-size: 12px;
  }
`;

export const ResumeButton = styled.button`
  display: block;
  width: 100%;
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: 20px;
  padding: 10px 24px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.greenHover};
  }

  ${mq.mobile} {
    padding: 7px 16px;
    font-size: 13px;
  }
`;

export const Divider = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.borderForm};
  font-size: 12px;
  margin: 12px 0 16px;

  ${mq.mobile} {
    margin: 6px 0 8px;
  }
`;

export const PlayBallButton = styled.button`
  display: block;
  width: 100%;
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 10px 24px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;

  ${mq.mobile} {
    margin-top: 6px;
  }
`;

export const SeedHint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textHint};
  margin: 5px 0 0;

  ${mq.mobile} {
    font-size: 10px;
    line-height: 1.3;
    margin-top: 3px;
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
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  padding: 0 0 10px;
  display: block;

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: 3px;
  }

  ${mq.mobile} {
    padding: 0 0 6px;
  }
`;

export const TabRow = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.borderCard};

  ${mq.mobile} {
    margin-bottom: 10px;
  }
`;

export const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.accentPrimary : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentPrimary : theme.colors.textHint)};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  padding: 6px 14px 8px;
  cursor: pointer;
  margin-bottom: -2px;

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: 3px 3px 0 0;
  }
`;

export const TeamValidationError = styled.p`
  background: ${({ theme }) => theme.colors.bgExhibitionError};
  border: 1px solid ${({ theme }) => theme.colors.borderExhibitionError};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textError};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin: 6px 0 0;
  padding: 7px 10px;
  line-height: 1.4;
`;
