import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

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
  color: aquamarine;
  font-size: 1.3rem;
  margin: 0 0 20px;
`;

export const FormSection = styled.section`
  margin-bottom: 20px;
`;

export const SectionHeading = styled.h3`
  color: #88bbee;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 10px;
  border-bottom: 1px solid #1e3050;
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
  color: #6680aa;
`;

export const TextInput = styled.input`
  background: #1a2e4a;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 6px;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;

  &:focus {
    outline: 2px solid aquamarine;
    outline-offset: 1px;
  }

  &[aria-invalid="true"] {
    border-color: #ff7777;
  }
`;

export const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 140px;
`;

export const StatLabel = styled.label`
  font-size: 11px;
  color: #6680aa;
  width: 56px;
  flex-shrink: 0;
`;

export const StatInput = styled.input`
  flex: 1;
  accent-color: aquamarine;
  cursor: pointer;
`;

export const StatValue = styled.span`
  font-size: 12px;
  color: #aaccff;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
`;

export const PlayerCard = styled.div`
  background: #0d1b2e;
  border: 1px solid #2a3f60;
  border-radius: 8px;
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
  border: 1px solid #4a6090;
  color: #88bbee;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 28px;
  flex-shrink: 0;

  &:hover {
    background: #0d1b2e;
    border-color: #88bbee;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const RemoveBtn = styled(SmallIconBtn)`
  color: #ff7777;
  border-color: #883333;

  &:hover {
    background: #2a0000;
    border-color: #cc4444;
  }
`;

export const AddPlayerBtn = styled.button`
  background: transparent;
  color: #6effc0;
  border: 1px dashed #3a7a5a;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;

  &:hover {
    background: #0d1b2e;
    border-color: #6effc0;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;

export const ErrorMsg = styled.p`
  color: #ff8888;
  font-size: 13px;
  margin: 0 0 12px;
  background: #1a0000;
  border: 1px solid #883333;
  border-radius: 6px;
  padding: 8px 12px;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const SaveBtn = styled.button`
  background: aquamarine;
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 10px 28px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: #5fffbb;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

export const CancelBtn = styled.button`
  background: transparent;
  color: #bbb;
  border: 1px solid #444;
  border-radius: 20px;
  padding: 10px 24px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: #111;
    border-color: #666;
    color: #ddd;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;

export const GenerateBtn = styled.button`
  background: transparent;
  color: #88bbee;
  border: 1px solid #4a6090;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  min-height: 36px;

  &:hover {
    background: #0d1b2e;
    border-color: #88bbee;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;
