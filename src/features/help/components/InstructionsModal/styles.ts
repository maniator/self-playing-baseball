import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { HelpButton } from "@feat/gameplay/components/GameControls/styles";

export const Dialog = styled.dialog`
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textDialog};
  border: 2px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 14px;
  padding: 0;
  max-width: min(680px, 96vw);
  width: 100%;
  height: min(700px, 90vh);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;

  &[open] {
    display: flex;
    flex-direction: column;
  }

  &::backdrop {
    background: rgba(0, 0, 0, 0.75);
  }

  ${mq.mobile} {
    position: fixed;
    inset: 0;
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    border-radius: 0;
    border: none;
    margin: 0;
  }
`;

export const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(74, 96, 144, 0.4);
  flex-shrink: 0;
`;

export const DialogTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.accentPrimary};
`;

export const CloseXButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: rgba(74, 96, 144, 0.6);
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

export const ScrollBody = styled.div`
  overflow-y: auto;
  padding: 8px 24px 20px;
  flex: 1 1 0;
`;

export const CloseButton = styled.button`
  display: block;
  margin: 16px auto 0;
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 8px 24px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;
