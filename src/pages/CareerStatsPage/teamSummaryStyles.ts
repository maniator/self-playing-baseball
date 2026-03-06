import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

// ── Team Summary panel ────────────────────────────────────────────────────────

/** Container for the team summary + leaders section (above tabs). */
export const TeamSummarySection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const SummaryHeading = styled.h2`
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  margin: 0;
`;

/** Grid of stat cells for the team summary. */
export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  ${mq.mobile} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

/** A single stat cell in the summary grid. */
export const SummaryCell = styled.div`
  background: #0d1b2e;
  border: 1px solid #2a3a5a;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const SummaryCellLabel = styled.span`
  color: #888;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
`;

export const SummaryCellValue = styled.span`
  color: #cce0ff;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

// ── Leader cards ─────────────────────────────────────────────────────────────

/** Label above a group of leader cards. */
export const LeadersGroupLabel = styled.h3`
  color: #888;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
  margin: 0 0 8px;
`;

export const LeaderCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  ${mq.mobile} {
    grid-template-columns: repeat(1, 1fr);
  }
`;

export const LeaderCard = styled.button`
  background: #0d1b2e;
  border: 1px solid #2a3a5a;
  border-radius: 6px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: border-color 0.15s;

  &:hover {
    border-color: #4a6090;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;

export const LeaderCardPlaceholder = styled.div`
  background: #0d1b2e;
  border: 1px dashed #2a3a5a;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const LeaderStatLabel = styled.span`
  color: #888;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
`;

export const LeaderName = styled.span`
  color: #aaccff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const LeaderValue = styled.span`
  color: #6effc0;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const LeaderPlaceholderText = styled.span`
  color: #aaa;
  font-size: 11px;
`;
