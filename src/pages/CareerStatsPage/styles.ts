import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

/** Wider page container for the career stats tables (up to 900px). */
export const CareerContainer = styled.div`
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

/** Team selector row. */
export const TeamSelectorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const TeamSelectLabel = styled.label`
  color: #888;
  font-size: 13px;
  white-space: nowrap;
`;

export const TeamSelect = styled.select`
  background: #0d1b2e;
  color: #cce0ff;
  border: 1px solid #2a3a5a;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }

  option {
    background: #0a0a1a;
    color: #cce0ff;
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

/** Clickable player name in a table row — navigates to player career page. */
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

/** Shown when a team has no completed game data. */
export const EmptyState = styled.p`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
`;

/** Page header title. */
export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.4rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;
