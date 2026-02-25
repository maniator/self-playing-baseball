import * as React from "react";

import type { PitchingRole } from "@components/SubstitutionPanel";
import SubstitutionPanel from "@components/SubstitutionPanel";
import { useGameContext } from "@context/index";
import { Strategy } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";

import { NotifBadge, Select, SubButton, ToggleLabel } from "./ManagerModeStyles";

type Props = {
  managerMode: boolean;
  strategy: Strategy;
  managedTeam: 0 | 1;
  teams: string[];
  notifPermission: NotificationPermission | "unavailable";
  gameStarted?: boolean;
  gameOver?: boolean;
  onManagerModeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStrategyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onManagedTeamChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRequestNotifPermission: () => void;
};

/** Inner sub-component that accesses game context for the substitution button. */
const SubstitutionButton: React.FunctionComponent<{
  managedTeam: 0 | 1;
  teams: string[];
}> = ({ managedTeam, teams }) => {
  const {
    dispatch,
    lineupOrder,
    rosterBench,
    rosterPitchers,
    activePitcherIdx,
    playerOverrides,
    substitutedOut,
    pitcherBattersFaced,
    teams: gameTeams,
  } = useGameContext();
  const { teams: customTeams } = useCustomTeams();
  const [showPanel, setShowPanel] = React.useState(false);

  // Derive pitcher roles from the custom team doc if this is a custom-team game.
  const pitcherRoles = React.useMemo((): Record<string, PitchingRole> => {
    const teamId = gameTeams[managedTeam];
    if (!teamId.startsWith("custom:")) return {};
    const ctId = teamId.slice("custom:".length);
    const doc = customTeams.find((t) => t.id === ctId);
    if (!doc) return {};
    const roles: Record<string, PitchingRole> = {};
    for (const p of doc.roster.pitchers) {
      if (p.pitchingRole) roles[p.id] = p.pitchingRole;
    }
    return roles;
  }, [gameTeams, managedTeam, customTeams]);

  return (
    <>
      <SubButton type="button" onClick={() => setShowPanel((v) => !v)} aria-label="Substitution">
        🔄 Substitution
      </SubButton>
      {showPanel && (
        <SubstitutionPanel
          key={managedTeam}
          teamName={teams[managedTeam] ?? "Team"}
          lineupOrder={lineupOrder[managedTeam]}
          rosterBench={rosterBench[managedTeam]}
          rosterPitchers={rosterPitchers[managedTeam]}
          activePitcherIdx={activePitcherIdx[managedTeam]}
          playerOverrides={playerOverrides[managedTeam]}
          substitutedOut={substitutedOut[managedTeam]}
          pitcherRoles={pitcherRoles}
          pitcherBattersFaced={pitcherBattersFaced[managedTeam]}
          onSubstitute={(payload) => {
            dispatch({ type: "make_substitution", payload: { teamIdx: managedTeam, ...payload } });
            setShowPanel(false);
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
};

const ManagerModeControls: React.FunctionComponent<Props> = ({
  managerMode,
  strategy,
  managedTeam,
  teams,
  notifPermission,
  gameStarted = false,
  gameOver = false,
  onManagerModeChange,
  onStrategyChange,
  onManagedTeamChange,
  onRequestNotifPermission,
}) => (
  <>
    <ToggleLabel>
      <input
        type="checkbox"
        checked={managerMode}
        onChange={onManagerModeChange}
        data-testid="manager-mode-toggle"
      />
      Manager Mode
    </ToggleLabel>
    {managerMode && (
      <>
        <ToggleLabel>
          Team
          <Select value={managedTeam} onChange={onManagedTeamChange}>
            <option value={0}>{teams[0]}</option>
            <option value={1}>{teams[1]}</option>
          </Select>
        </ToggleLabel>
        <ToggleLabel>
          Strategy
          <Select value={strategy} onChange={onStrategyChange}>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
            <option value="patient">Patient</option>
            <option value="contact">Contact</option>
            <option value="power">Power</option>
          </Select>
        </ToggleLabel>
        {gameStarted && !gameOver && <SubstitutionButton managedTeam={managedTeam} teams={teams} />}
        {notifPermission === "granted" && (
          <NotifBadge $ok={true} data-testid="notif-permission-badge">
            🔔 on
          </NotifBadge>
        )}
        {notifPermission === "denied" && (
          <NotifBadge
            $ok={false}
            title="Enable notifications in your browser settings"
            data-testid="notif-permission-badge"
          >
            🔕 blocked
          </NotifBadge>
        )}
        {notifPermission === "default" && (
          <NotifBadge
            $ok={false}
            onClick={onRequestNotifPermission}
            title="Click to grant notification permission"
            data-testid="notif-permission-badge"
          >
            🔔 click to enable
          </NotifBadge>
        )}
      </>
    )}
  </>
);

export default ManagerModeControls;
