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
  background: ${({ $active }) => ($active ? "#1a3a2a" : "transparent")};
  color: ${({ $active }) => ($active ? "#6effc0" : "#888")};
  border: 1px solid ${({ $active }) => ($active ? "#3a7a5a" : "#2a2a3a")};
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  cursor: pointer;
  min-height: 36px;

  &:hover {
    background: ${({ $active }) => ($active ? "#254f38" : "#0d1b2e")};
    color: ${({ $active }) => ($active ? "#6effc0" : "#aaccff")};
    border-color: ${({ $active }) => ($active ? "#3a7a5a" : "#4a6090")};
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
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
  border-bottom: 1px solid #2a2a3a;
  font-size: 12px;
  color: #888;
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
  background: #0d1b2e;

  td {
    color: #aaccff;
    font-weight: 600;
    border-bottom: 2px solid #2a3a5a;
  }
`;

/** Section label above a table (used by PlayerCareerPage). */
export const SectionLabel = styled.h2`
  color: #888;
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
  color: #aaccff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;

  &:hover {
    color: #cce0ff;
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-radius: 2px;
  }
`;
