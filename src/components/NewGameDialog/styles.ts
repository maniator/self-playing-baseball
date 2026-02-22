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

export const SeedHint = styled.p`
  font-size: 11px;
  color: #6680aa;
  margin: 5px 0 0;
`;
