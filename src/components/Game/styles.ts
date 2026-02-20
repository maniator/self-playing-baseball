import styled from "styled-components";

export const GameDiv = styled.main`
  color: white;
  display: flex;
  flex-direction: column;
  width: min(960px, 94vw);
  border: 1px solid #884e4e;
  padding: 24px;
  margin: 0 auto;

  @media (max-width: 768px) {
    height: 100dvh;
    overflow: hidden;
    overflow-anchor: none;
    padding: 12px 16px;
    padding-bottom: calc(33vh + env(safe-area-inset-bottom));
  }
`;

export const GameBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  margin-top: 14px;

  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    align-items: stretch;
  }

  @media (max-width: 768px) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    margin-top: 8px;
    gap: 0;
  }
`;

export const FieldPanel = styled.div`
  min-width: 0;

  @media (max-width: 768px) {
    flex: 1;
    min-height: 0;
  }
`;

export const LogPanel = styled.div`
  min-width: 0;
  overflow-y: auto;
  border-top: 1px solid #2a2a2a;
  padding-top: 8px;

  @media (min-width: 1024px) {
    border-top: none;
    border-left: 1px solid #2a2a2a;
    padding-left: 16px;
    padding-top: 0;
  }

  @media (max-width: 768px) {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 33vh;
    overflow-y: auto;
    background: #000;
    border-top: 1px solid #333;
    border-left: none;
    padding: 8px 16px;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -6px 12px rgba(0, 0, 0, 0.9);
    z-index: 10;
  }
`;
