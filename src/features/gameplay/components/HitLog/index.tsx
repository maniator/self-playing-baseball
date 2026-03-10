import * as React from "react";

import { resolveTeamLabel } from "@feat/customTeams/adapters/customTeamAdapter";
import { useGameContext } from "@feat/gameplay/context/index";
import { Hit } from "@shared/constants/hitTypes";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";

import { Area, EmptyState, Entry, HeadingRow, Label, Runs, Toggle } from "./styles";

const EVENT_LABEL: Record<Hit, string> = {
  [Hit.Single]: "1B",
  [Hit.Double]: "2B",
  [Hit.Triple]: "3B",
  [Hit.Homerun]: "HR",
  [Hit.Walk]: "BB",
};

const HALF_ARROW = ["▲", "▼"] as const;

const HitLog: React.FunctionComponent<{ activeTeam: 0 | 1 }> = ({ activeTeam }) => {
  const { playLog, teams } = useGameContext();
  const { teams: customTeams } = useCustomTeams();
  const [collapsed, setCollapsed] = React.useState(false);
  const teamLabel = (t: string) => resolveTeamLabel(t, customTeams);

  const filtered = playLog.filter((entry) => entry.team === activeTeam);

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
          {filtered.length === 0 ? (
            <EmptyState>No hits yet.</EmptyState>
          ) : (
            [...filtered].reverse().map((entry, idx) => {
              const key = `${entry.inning}-${entry.half}-${entry.team}-${entry.batterNum}-${idx}`;
              return (
                <Entry key={key}>
                  <Label $hr={entry.event === Hit.Homerun}>{EVENT_LABEL[entry.event]}</Label>
                  <span>
                    {HALF_ARROW[entry.half]}
                    {entry.inning} — {teamLabel(teams[entry.team])} #{entry.batterNum}
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
