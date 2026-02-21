import styled from "styled-components";

export const HelpButton = styled.button`
  background: rgba(47, 63, 105, 0.7);
  color: #aaccff;
  border: 1px solid #4a6090;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: rgba(74, 96, 144, 0.9);
    color: #fff;
  }
`;

export const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 28px 32px 24px;
  max-width: min(560px, 92vw);
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;

  &::backdrop {
    background: rgba(0, 0, 0, 0.65);
  }
`;

export const DialogTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 18px;
  color: aquamarine;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Section = styled.section`
  margin-bottom: 16px;
`;

export const SectionHeading = styled.h3`
  margin: 0 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
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
  margin: 20px auto 0;
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
