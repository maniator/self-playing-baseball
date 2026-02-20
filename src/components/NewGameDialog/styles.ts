import styled from "styled-components";

export const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 28px 32px 24px;
  max-width: min(420px, 92vw);
  width: 100%;
  max-height: min(90dvh, 820px);
  overflow-y: auto;
  font-family: inherit;
  font-size: 14px;

  &::backdrop {
    background: rgba(0, 0, 0, 0.75);
  }
`;

export const Title = styled.h2`
  margin: 0 0 20px;
  font-size: 18px;
  color: aquamarine;
`;

export const FieldGroup = styled.div`
  margin-bottom: 16px;
`;

export const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
  margin-bottom: 6px;
`;

export const Input = styled.input`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;
`;

export const Select = styled.select`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  cursor: pointer;
`;

export const SectionLabel = styled.p`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
  margin: 0 0 8px;
`;

export const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 13px;
  color: #cce0ff;

  & input[type="radio"] {
    accent-color: aquamarine;
    cursor: pointer;
  }
`;

export const ResumeButton = styled.button`
  display: block;
  width: 100%;
  background: #1a3a2a;
  color: #6effc0;
  border: 1px solid #3a7a5a;
  border-radius: 20px;
  padding: 10px 24px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 4px;

  &:hover {
    background: #254f38;
  }
`;

export const Divider = styled.p`
  text-align: center;
  color: #4a6090;
  font-size: 12px;
  margin: 12px 0 16px;
`;

export const PlayBallButton = styled.button`
  display: block;
  width: 100%;
  background: aquamarine;
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 10px 24px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 20px;
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
  grid-template-columns: 20px 30px 1fr repeat(3, 44px);
  gap: 4px;
  align-items: center;
`;

export const PitcherRow = styled.div`
  display: grid;
  grid-template-columns: 20px 30px 1fr repeat(3, 44px);
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

export const ModInput = styled.input`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #e0f0ff;
  border-radius: 4px;
  padding: 2px 2px;
  font-family: inherit;
  font-size: 11px;
  width: 100%;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const PanelSection = styled.div`
  margin-bottom: 16px;
  border: 1px solid #2a4060;
  border-radius: 8px;
  padding: 10px 12px 12px;
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
