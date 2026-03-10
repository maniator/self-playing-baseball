import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Wrapper = styled.div`
  overflow-x: auto;
  margin: 8px 0 0;

  ${mq.mobile} {
    order: -1;
    background: ${({ theme }) => theme.colors.bgVoid};
    margin: 0 0 4px;
    padding-bottom: 4px;
  }
`;

export const Table = styled.table`
  border-collapse: collapse;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  background: ${({ theme }) => theme.colors.bgGame};
  color: ${({ theme }) => theme.colors.textScore};
  width: 100%;

  ${mq.notMobile} {
    font-size: 14px;
  }
`;

export const Th = styled.th<{ $accent?: boolean }>`
  padding: 3px 6px;
  text-align: center;
  color: ${({ $accent, theme }) =>
    $accent ? theme.colors.accentGold : theme.colors.textScoreHeader};
  border-bottom: 1px solid #1e3a5f;
  font-weight: normal;
  font-size: 11px;
  letter-spacing: 0.5px;
  white-space: nowrap;

  ${mq.notMobile} {
    font-size: 13px;
    padding: 3px 8px;
  }
`;

export const TeamTh = styled(Th)`
  text-align: left;
  min-width: 60px;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;

  ${mq.notMobile} {
    min-width: 90px;
    max-width: 140px;
  }
`;

export const Td = styled.td<{ $active?: boolean; $accent?: boolean; $dim?: boolean }>`
  padding: 4px 6px;
  text-align: center;
  font-weight: ${({ $accent }) => ($accent ? "bold" : "normal")};
  color: ${({ $active, $accent, $dim, theme }) =>
    $active
      ? theme.colors.textPrimary
      : $accent
        ? theme.colors.accentGold
        : $dim
          ? "#3d5a7a"
          : theme.colors.textScore};
  border-right: ${({ $accent }) => ($accent ? "none" : "1px solid #0f2540")};
  white-space: nowrap;

  ${mq.notMobile} {
    padding: 5px 8px;
  }
`;

export const TeamTd = styled(Td)`
  text-align: left;
  font-size: 12px;
  border-right: 1px solid #1e3a5f;
  padding-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;

  ${mq.notMobile} {
    font-size: 13px;
    max-width: 140px;
  }
`;

export const DividerTd = styled.td`
  border-left: 1px solid #1e3a5f;
  padding: 0;
  width: 4px;
`;

export const BsoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 8px 4px;
  background: ${({ theme }) => theme.colors.bgGame};
  font-family: "Courier New", Courier, monospace;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textScoreHeader};
  letter-spacing: 0.5px;

  ${mq.notMobile} {
    font-size: 12px;
  }
`;

export const BsoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const Dot = styled.span<{ $on: boolean; $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $on, $color }) => ($on ? $color : "#1e3a5f")};
  border: 1px solid ${({ $on, $color }) => ($on ? $color : "#2e4a6f")};
`;

export const ExtraInningsBanner = styled.div`
  background: ${({ theme }) => theme.colors.blueDark};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-weight: bold;
  font-size: 11px;
  padding: 2px 8px;
  letter-spacing: 1px;
  margin-left: auto;
`;

export const GameOverBanner = styled.div`
  background: ${({ theme }) => theme.colors.redBg};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  font-weight: bold;
  font-size: 12px;
  padding: 3px 8px;
  letter-spacing: 1px;
`;

/**
 * Visible only on mobile — shows the short team abbreviation (e.g. "NYY")
 * so the narrow team-name column does not need to truncate a long full name.
 */
export const TeamMobileLabel = styled.span`
  display: none;
  ${mq.mobile} {
    display: inline;
  }
`;

/**
 * Visible on tablet and desktop — shows the full team name with ellipsis
 * truncation handled by the parent `TeamTd`.
 */
export const TeamFullLabel = styled.span`
  display: inline;
  ${mq.mobile} {
    display: none;
  }
`;
