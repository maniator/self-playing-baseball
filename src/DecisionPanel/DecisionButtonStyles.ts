import styled from "styled-components";

export const ActionButton = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  &:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
`;

export const SkipButton = styled(ActionButton)`
  background: #3a4a6a;
  color: #ccc;
`;

export const Prompt = styled.span`
  flex: 1 1 auto;
  color: #e0f8f0;
  font-weight: 600;
`;

export const Odds = styled.span`
  color: #aaffcc;
  font-size: 13px;
`;
