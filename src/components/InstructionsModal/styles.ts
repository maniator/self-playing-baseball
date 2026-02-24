import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export { HelpButton } from "@components/GameControls/styles";

export const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
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
  color: aquamarine;
`;

export const CloseXButton = styled.button`
  background: transparent;
  color: #aaccff;
  border: 1px solid #4a6090;
  border-radius: 6px;
  width: 44px;
  height: 44px;
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
    color: #fff;
  }
`;

export const ScrollBody = styled.div`
  overflow-y: auto;
  padding: 8px 24px 20px;
  flex: 1 1 0;
`;

export const SectionDetails = styled.details`
  border: 1px solid rgba(74, 96, 144, 0.35);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;

  &[open] > summary {
    border-bottom: 1px solid rgba(74, 96, 144, 0.35);
  }
`;

export const SectionSummary = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
  cursor: pointer;
  user-select: none;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    content: "▸";
    font-size: 11px;
    color: #7799bb;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  details[open] > &::after {
    transform: rotate(90deg);
  }

  &:hover {
    background: rgba(74, 96, 144, 0.15);
  }
`;

export const SectionBody = styled.div`
  padding: 10px 14px 12px;
`;

export const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #cce0ff;
`;

export const Li = styled.li`
  margin-bottom: 4px;
`;

export const CloseButton = styled.button`
  display: block;
  margin: 16px auto 0;
  background: aquamarine;
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 8px 24px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;
