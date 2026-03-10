/**
 * Shared styled-components for full-page route screens (SavesPage, HelpPage,
 * ManageTeamsScreen, etc.).  Import these instead of redefining them per-page.
 */
import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

/** Full-height scrollable page wrapper used by all route-level screens. */
export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing.xxl};
  padding-bottom: calc(${({ theme }) => theme.spacing.xxl} + 80px);
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: ${({ theme }) => theme.spacing.lg};
    padding-bottom: calc(${({ theme }) => theme.spacing.lg} + 80px);
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
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

/** Consistent back-navigation button used across all route-level screens. */
export const BackBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textHint};
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs} 0;
  min-height: ${({ theme }) => theme.spacing.s40};

  &:hover {
    color: ${({ theme }) => theme.colors.textLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;
