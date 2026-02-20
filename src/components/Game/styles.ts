import styled from "styled-components";

export const GameDiv = styled.main`
  color: white;
  display: flex;
  flex-direction: column;
  width: min(960px, 94vw);
  border: 1px solid #884e4e;
  padding: 20px;
  margin: 0 auto;

  @media (max-width: 800px) {
    min-height: auto;
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    overflow-anchor: none;
    padding: 12px;
  }
`;

export const GameInfo = styled.div`
  padding: 15px 0;

  & > div {
    padding: 5px 0;
  }

  @media (max-width: 800px) {
    margin-bottom: 8px;
  }
`;

export const Input = styled.input`
  background: #000;
  color: #fff;
  width: 120px;
  margin: 0 5px;
  border: 1px solid #555;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
`;

export const GameBody = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-top: 8px;

  @media (max-width: 800px) {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
`;

export const LeftPanel = styled.div`
  flex: 1;
  min-width: 0;
  padding-right: 16px;
  border-right: 1px solid #2a2a2a;

  @media (max-width: 800px) {
    order: 2;
    min-width: auto;
    padding-right: 0;
    border-right: none;
    border-top: 1px solid #2a2a2a;
    border-bottom: none;
    padding-top: 8px;
    padding-bottom: 0;
  }
`;

export const RightPanel = styled.div`
  width: 310px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 800px) {
    order: 1;
    width: 100%;
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;
  }
`;
