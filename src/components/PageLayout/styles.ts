/**
 * Shared styled-components for full-page route screens (SavesPage, HelpPage,
 * ManageTeamsScreen, etc.).  Import these instead of redefining them per-page.
 */
import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

/** Full-height scrollable page wrapper used by all route-level screens. */
export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* Flex children must not shrink so overflow-y: auto can scroll long pages. */
    > * {
      flex-shrink: 0;
    }
  }
`;

/** Top bar containing the back button (and optionally a title / actions). */
export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

/** Consistent back-navigation button used across all route-level screens. */
export const BackBtn = styled.button`
  background: transparent;
  color: #6680aa;
  border: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0;
  min-height: 36px;

  &:hover {
    color: #aaccff;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-radius: 3px;
  }
`;
