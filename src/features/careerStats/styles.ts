/**
 * Shared styled-components for career stats tables.
 * Used by CareerStatsPage and PlayerCareerPage.
 */
import styled from "styled-components";

/** Row of tab buttons. */
export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

/** Individual tab button — active state controlled via $active transient prop. */
export const TabBtn = styled.button<{ $active: boolean }>`
  background: ${({ $active, theme }) => ($active ? theme.colors.greenBg : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentGreen : theme.colors.textSubdued)};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.borderGreen : theme.colors.borderSubtle)};
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  cursor: pointer;
  min-height: 36px;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.greenHover : theme.colors.bgSurface};
    color: ${({ $active, theme }) => ($active ? theme.colors.accentGreen : theme.colors.textLink)};
    border-color: ${({ $active, theme }) =>
      $active ? theme.colors.borderGreen : theme.colors.borderForm};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

/** Scrollable wrapper for the stats table on mobile. */
export const TableWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

/** Full-width stats table. */
export const StatsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
`;

/** Table header cell. */
export const Th = styled.th<{ $sortable?: boolean }>`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSubdued};
  font-weight: 600;
  white-space: nowrap;
  ${({ $sortable }) => $sortable && `cursor: pointer; user-select: none; &:hover { color: #ccc; }`}
`;

/** Table data cell. */
export const Td = styled.td`
  padding: 8px;
  border-bottom: 1px solid #1a1a2a;
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
`;

/** Shown when a page has no data to display. */
export const EmptyState = styled.p`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
`;

/** Highlighted totals row (used by PlayerCareerPage). */
export const TotalsRow = styled.tr`
  background: ${({ theme }) => theme.colors.bgSurface};

  td {
    color: ${({ theme }) => theme.colors.textLink};
    font-weight: 600;
    border-bottom: 2px solid ${({ theme }) => theme.colors.borderPanel};
  }
`;

/** Section label above a table (used by PlayerCareerPage). */
export const SectionLabel = styled.h2`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px;
  font-weight: 600;
`;

/** Clickable player name in a table row — navigates to player career page (used by CareerStatsPage). */
export const PlayerLink = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textLink};
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.colors.textBody};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;
