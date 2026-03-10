import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

/**
 * Height of the fixed log panel on mobile.  Must stay in sync between
 * `LogPanel` (height) and `GameDiv` (padding-bottom) so the field area
 * is never obscured by the log.
 */
const MOBILE_LOG_HEIGHT = "33vh";

export const GameDiv = styled.main`
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  flex-direction: column;
  width: min(95vw, 1600px);
  border: 1px solid ${({ theme }) => theme.colors.borderGameError};
  padding: ${({ theme }) => theme.spacing.xxl};
  margin: 0 auto;

  ${mq.tablet} {
    height: 100dvh;
    overflow: hidden;
    padding: ${({ theme }) => theme.spacing.lg};
  }

  ${mq.mobile} {
    height: 100dvh;
    overflow: hidden;
    overflow-anchor: none;
    padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
    padding-bottom: calc(${MOBILE_LOG_HEIGHT} + env(safe-area-inset-bottom));
  }
`;

export const GameBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: stretch;
  margin-top: 14px;

  ${mq.desktop} {
    display: grid;
    grid-template-columns: 2.2fr 1fr;
    gap: ${({ theme }) => theme.spacing.xl};
    align-items: stretch;
  }

  ${mq.tablet} {
    flex: 1;
    min-height: 0;
    margin-top: 10px;
    gap: ${({ theme }) => theme.spacing.md};
  }

  ${mq.mobile} {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    margin-top: ${({ theme }) => theme.spacing.sm};
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
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  margin: 48px auto;
  font-family: monospace;
`;

export const DbResetNotice = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: ${({ theme }) => theme.colors.goldWarn};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 10px ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: 0.9rem;

  button {
    background: none;
    border: 1px solid ${({ theme }) => theme.colors.borderWhiteAlpha};
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;
    padding: 2px ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: 1rem;
  }
`;

export const LogPanel = styled.div`
  min-width: 0;
  overflow-y: auto;
  border-top: 1px solid ${({ theme }) => theme.colors.borderGameSection};
  padding-top: ${({ theme }) => theme.spacing.sm};

  ${mq.desktop} {
    border-top: none;
    border-left: 1px solid ${({ theme }) => theme.colors.borderGameSection};
    padding-left: ${({ theme }) => theme.spacing.lg};
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
    background: ${({ theme }) => theme.colors.bgVoid};
    border-top: 1px solid ${({ theme }) => theme.colors.borderLog};
    border-left: none;
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -6px 12px ${({ theme }) => theme.colors.shadowDark};
    z-index: 10;
  }
`;
