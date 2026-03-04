import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

/** Full-height page container for the player career page. */
export const PlayerCareerContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  padding-bottom: calc(24px + 80px);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    padding-bottom: calc(16px + 80px);
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    > * {
      flex-shrink: 0;
    }
  }
`;

/** Player name heading. */
export const PlayerName = styled.h1`
  color: white;
  font-size: 1.4rem;
  margin: 0 0 4px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;

/** Sub-label below the player name (role info). */
export const PlayerRoleLabel = styled.p`
  color: #888;
  font-size: 13px;
  margin: 0 0 20px;
`;

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
  min-width: 500px;
`;

/** Table header cell. */
export const Th = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #2a2a3a;
  font-size: 12px;
  color: #888;
  font-weight: 600;
  white-space: nowrap;
`;

/** Table data cell. */
export const Td = styled.td`
  padding: 8px;
  border-bottom: 1px solid #1a1a2a;
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
`;

/** Highlighted totals row. */
export const TotalsRow = styled.tr`
  background: #0d1b2e;

  td {
    color: #aaccff;
    font-weight: 600;
    border-bottom: 2px solid #2a3a5a;
  }
`;

/** Shown when the player has no data for a given stat type. */
export const EmptyState = styled.p`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
`;

/** Section label above a table. */
export const SectionLabel = styled.h2`
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px;
  font-weight: 600;
`;

/** Prev/Next navigation row. */
export const NavRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

/** Prev/Next button. */
export const NavBtn = styled.button`
  background: #1a1a2e;
  border: 1px solid #333;
  color: #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  &:hover:not(:disabled) {
    background: #25254a;
    color: #fff;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
