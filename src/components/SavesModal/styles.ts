import styled from "styled-components";

export const SavesButton = styled.button`
  background: #1a3a2a;
  color: #6effc0;
  border: 1px solid #3a7a5a;
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;

  &:hover {
    background: #254f38;
  }
`;

export const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 24px 28px 20px;
  max-width: min(520px, 94vw);
  width: 100%;
  font-family: inherit;
  font-size: 14px;

  &::backdrop {
    background: rgba(0, 0, 0, 0.65);
  }
`;

export const DialogTitle = styled.h2`
  margin: 0 0 14px;
  font-size: 17px;
  color: aquamarine;
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
  border-radius: 8px;
  background: rgba(47, 63, 105, 0.35);
  margin-bottom: 6px;
`;

export const SlotName = styled.span`
  flex: 1;
  font-size: 13px;
  color: #cce0ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SlotDate = styled.span`
  font-size: 11px;
  color: #7a9abf;
  flex-shrink: 0;
`;

export const SmallButton = styled.button`
  background: transparent;
  border: 1px solid #4a6090;
  color: #aaccff;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: rgba(74, 96, 144, 0.4);
  }
`;

export const DangerButton = styled(SmallButton)`
  border-color: #7a3030;
  color: #ff8080;

  &:hover {
    background: rgba(120, 48, 48, 0.4);
  }
`;

export const SectionHeading = styled.h3`
  margin: 12px 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
`;

export const ImportArea = styled.textarea`
  width: 100%;
  background: #0a1520;
  border: 1px solid #4a6090;
  border-radius: 8px;
  color: #cce0ff;
  font-family: monospace;
  font-size: 12px;
  padding: 6px 8px;
  resize: vertical;
  box-sizing: border-box;
`;

export const ErrorMsg = styled.p`
  color: #ff7070;
  font-size: 12px;
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
  background: aquamarine;
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
  color: #7a9abf;
  font-size: 13px;
  margin: 0 0 12px;
`;

export const FileInput = styled.input`
  font-family: inherit;
  font-size: 12px;
  color: #aaccff;
`;
