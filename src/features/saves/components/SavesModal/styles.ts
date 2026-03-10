import styled from "styled-components";

export { Button as SavesButton } from "@feat/gameplay/components/GameControls/styles";

export const Dialog = styled.dialog`
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textDialog};
  border: 2px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 14px;
  padding: 24px 28px 20px;
  max-width: min(520px, 94vw);
  width: 100%;
  font-family: inherit;
  font-size: 14px;

  &::backdrop {
    background: ${({ theme }) => theme.colors.overlayMedDark};
  }
`;

export const DialogTitle = styled.h2`
  margin: 0 0 14px;
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.accentPrimary};
`;

export const SlotList = styled.ul`
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
`;

export const SlotItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.bgNavSection};
  margin-bottom: 6px;
`;

export const SlotName = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.textBody};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SlotDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textModalLink};
  flex-shrink: 0;
`;

export const SmallButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textLink};
  border-radius: 8px;
  padding: 3px 8px;
  font-size: ${({ theme }) => theme.fontSizes.label};
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.bgFormAlpha40};
  }
`;

export const DangerButton = styled(SmallButton)`
  border-color: ${({ theme }) => theme.colors.borderSavesDanger};
  color: ${({ theme }) => theme.colors.textError};

  &:hover {
    background: ${({ theme }) => theme.colors.bgSavesDangerHover};
  }
`;

export const SectionHeading = styled.h3`
  margin: 12px 0 6px;
  font-size: ${({ theme }) => theme.fontSizes.label};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
`;

export const ImportArea = styled.textarea`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgImport};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.textBody};
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.label};
  padding: 6px 8px;
  resize: vertical;
  box-sizing: border-box;
`;

export const ErrorMsg = styled.p`
  color: ${({ theme }) => theme.colors.redDanger};
  font-size: ${({ theme }) => theme.fontSizes.label};
  margin: 4px 0 0;
`;

export const Row = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
`;

export const CloseButton = styled.button`
  display: block;
  margin: 16px auto 0;
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 7px 22px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

export const EmptyMsg = styled.p`
  color: ${({ theme }) => theme.colors.textModalLink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin: 0 0 12px;
`;

export const FileInput = styled.input`
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.label};
  color: ${({ theme }) => theme.colors.textLink};
`;
