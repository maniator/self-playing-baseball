import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

/**
 * Height of the fixed log panel on mobile.  Must stay in sync between
 * `LogPanel` (height) and `GameDiv` (padding-bottom) so the field area
 * is never obscured by the log.
 */
const MOBILE_LOG_HEIGHT = "33vh";

export const GameDiv = styled.main`
  color: white;
  display: flex;
  flex-direction: column;
  width: min(95vw, 1600px);
  border: 1px solid #884e4e;
  padding: 24px;
  margin: 0 auto;

  ${mq.tablet} {
    height: 100dvh;
    overflow: hidden;
    padding: 16px;
  }

  ${mq.mobile} {
    height: 100dvh;
    overflow: hidden;
    overflow-anchor: none;
    padding: 12px 16px;
    padding-bottom: calc(${MOBILE_LOG_HEIGHT} + env(safe-area-inset-bottom));
  }
`;

export const GameBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  margin-top: 14px;

  ${mq.desktop} {
    display: grid;
    grid-template-columns: 2.2fr 1fr;
    gap: 20px;
    align-items: stretch;
  }

  ${mq.tablet} {
    flex: 1;
    min-height: 0;
    margin-top: 10px;
    gap: 12px;
  }

  ${mq.mobile} {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    margin-top: 8px;
    gap: 0;
  }
`;

export const FieldPanel = styled.div`
  min-width: 0;

  ${mq.mobile} {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
`;

export const LoadingScreen = styled.p`
  color: #aaa;
  text-align: center;
  margin: 48px auto;
  font-family: monospace;
`;

export const DbResetNotice = styled.div`
  background: #7a3200;
  color: #fff;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9rem;

  button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: #fff;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 1rem;
  }
`;

export const LogPanel = styled.div`
  min-width: 0;
  overflow-y: auto;
  border-top: 1px solid #2a2a2a;
  padding-top: 8px;

  ${mq.desktop} {
    border-top: none;
    border-left: 1px solid #2a2a2a;
    padding-left: 16px;
    padding-top: 0;
  }

  ${mq.tablet} {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  ${mq.mobile} {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: ${MOBILE_LOG_HEIGHT};
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
