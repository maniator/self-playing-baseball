import * as React from "react";

import styled from "styled-components";

import { Hit } from "@constants/hitTypes";
import { useGameContext } from "@context/index";
import { mq } from "@utils/mediaQueries";

const EVENT_LABEL: Record<Hit, string> = {
  [Hit.Single]: "1B",
  [Hit.Double]: "2B",
  [Hit.Triple]: "3B",
  [Hit.Homerun]: "HR",
  [Hit.Walk]: "BB",
};

const HALF_ARROW = ["▲", "▼"] as const;

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
  position: sticky;
  top: 0;
  background: #000;
  z-index: 1;
`;

const Toggle = styled.button`
  background: none;
  border: none;
  color: #555;
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
  &:hover {
    color: #aaa;
  }
`;

const Area = styled.div`
  overflow-y: auto;
  max-height: 200px;
  ${mq.mobile} {
    max-height: none;
  }
`;

const Entry = styled.div`
  font-size: 12px;
  padding: 3px 5px;
  color: #ccc;
  display: flex;
  gap: 6px;
  align-items: baseline;
`;

const Label = styled.span<{ $hr?: boolean }>`
  font-weight: bold;
  color: ${({ $hr }) => ($hr ? "#f5c842" : "#8abadf")};
  min-width: 22px;
`;

const Runs = styled.span`
  color: #e07070;
  font-size: 11px;
`;

const EmptyState = styled.div`
  color: #555;
  font-size: 12px;
  padding: 6px 5px;
`;

const HitLog: React.FunctionComponent = () => {
  const { playLog, teams } = useGameContext();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <>
      <HeadingRow>
        <span>Hit Log</span>
        <Toggle
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand hit log" : "Collapse hit log"}
        >
          {collapsed ? "▶ show" : "▼ hide"}
        </Toggle>
      </HeadingRow>
      {!collapsed && (
        <Area data-testid="hit-log">
          {playLog.length === 0 ? (
            <EmptyState>No hits yet.</EmptyState>
          ) : (
            [...playLog].reverse().map((entry, idx) => {
              const key = `${entry.inning}-${entry.half}-${entry.team}-${entry.batterNum}-${idx}`;
              return (
                <Entry key={key}>
                  <Label $hr={entry.event === Hit.Homerun}>{EVENT_LABEL[entry.event]}</Label>
                  <span>
                    {HALF_ARROW[entry.half]}
                    {entry.inning} — {teams[entry.team]} #{entry.batterNum}
                  </span>
                  {entry.runs > 0 && (
                    <Runs>
                      +{entry.runs} run{entry.runs !== 1 ? "s" : ""}
                    </Runs>
                  )}
                </Entry>
              );
            })
          )}
        </Area>
      )}
    </>
  );
};

export default HitLog;
