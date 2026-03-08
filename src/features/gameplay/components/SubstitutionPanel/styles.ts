import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const Panel = styled.div`
  background: #0d1b2e;
  border: 1px solid #2a3f60;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 8px;
  width: 100%;
  max-width: 480px;

  ${mq.mobile} {
    padding: 10px 12px;
    max-width: 100%;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

export const PanelTitle = styled.h4`
  color: aquamarine;
  font-size: 0.85rem;
  margin: 0;
  font-weight: 600;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: 1px solid #4a6090;
  color: #88bbee;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  line-height: 1.4;

  &:hover {
    background: #1a2e4a;
    border-color: #88bbee;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;

export const Section = styled.div`
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SectionTitle = styled.h5`
  color: #88bbee;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 6px;
  border-bottom: 1px solid #1e3050;
  padding-bottom: 4px;
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`;

export const SelectField = styled.select`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  min-height: 30px;
  flex: 1;
  min-width: 100px;

  &:focus {
    outline: 2px solid aquamarine;
    outline-offset: 1px;
  }
`;

export const ActionButton = styled.button`
  background: aquamarine;
  color: darkblue;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 30px;
  flex-shrink: 0;

  &:hover {
    background: #5fffbb;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

export const EmptyNote = styled.p`
  font-size: 11px;
  color: #6680aa;
  margin: 2px 0 4px;
  font-style: italic;
`;

export const FatigueBar = styled.div``;

export const FatigueLabel = styled.span<{ $level: "low" | "medium" | "high" }>`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  color: ${({ $level }) =>
    $level === "high" ? "#ff6b6b" : $level === "medium" ? "#ffd06b" : "#a0b4d0"};
`;

export const SubButton = styled.button`
  background: transparent;
  color: #88bbee;
  border: 1px solid #4a6090;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 30px;
  flex-shrink: 0;

  &:hover {
    background: #0d1b2e;
    border-color: #88bbee;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;
