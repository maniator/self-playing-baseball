import styled from "styled-components";

export const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 28px 32px 24px;
  max-width: min(420px, 92vw);
  width: 100%;
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
