import styled from "styled-components";

export const PanelSection = styled.div`
  margin-bottom: 16px;
  border: 1px solid #2a4060;
  border-radius: 8px;
  padding: 10px 12px 12px;
`;

export const PanelToggle = styled.button`
  background: none;
  border: none;
  color: #88bbee;
  font-family: inherit;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  background: ${({ $active }) => ($active ? "#1a4a6a" : "#0d1b2e")};
  border: 1px solid ${({ $active }) => ($active ? "#6ab0e0" : "#4a6090")};
  color: ${({ $active }) => ($active ? "#e0f0ff" : "#88bbee")};
  border-radius: 6px;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

export const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
`;

export const PlayerRow = styled.div`
  display: grid;
  grid-template-columns: 20px 30px 1fr repeat(3, 56px);
  gap: 4px;
  align-items: center;
`;

export const PitcherRow = styled.div`
  display: grid;
  grid-template-columns: 20px 30px 1fr repeat(3, 56px);
  gap: 4px;
  align-items: center;
  margin-top: 2px;
`;

export const PosTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #6ab0e0;
  text-transform: uppercase;
  text-align: center;
`;

export const NicknameInput = styled.input`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 4px;
  padding: 3px 5px;
  font-family: inherit;
  font-size: 11px;
  width: 100%;
  min-width: 0;
`;

export const ModLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-size: 9px;
  color: #6a8aae;
  text-transform: uppercase;
`;

export const BaseStat = styled.span`
  font-size: 8px;
  color: #4a6090;
  font-weight: 700;
  line-height: 1.2;
`;

export const ModSelect = styled.select`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #e0f0ff;
  border-radius: 4px;
  padding: 2px 1px;
  font-family: inherit;
  font-size: 10px;
  width: 100%;
  cursor: pointer;
`;

export const DragHandle = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a6090;
  cursor: grab;
  font-size: 13px;
  line-height: 1;
  touch-action: none;

  &:active {
    cursor: grabbing;
    color: #88bbee;
  }
`;

export const PitcherDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px;
  color: #6a8aae;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid #2a4060;
  }
`;
