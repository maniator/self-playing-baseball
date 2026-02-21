import * as React from "react";

import { Strategy } from "@context/index";

import { NotifBadge, Select, ToggleLabel } from "./ManagerModeStyles";

type Props = {
  managerMode: boolean;
  strategy: Strategy;
  managedTeam: 0 | 1;
  teams: string[];
  notifPermission: NotificationPermission | "unavailable";
  onManagerModeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStrategyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onManagedTeamChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRequestNotifPermission: () => void;
};

const ManagerModeControls: React.FunctionComponent<Props> = ({
  managerMode,
  strategy,
  managedTeam,
  teams,
  notifPermission,
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
        data-testid="manager-mode-checkbox"
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
        {notifPermission === "granted" && (
          <NotifBadge $ok={true} data-testid="notif-badge">
            🔔 on
          </NotifBadge>
        )}
        {notifPermission === "denied" && (
          <NotifBadge
            $ok={false}
            title="Enable notifications in your browser settings"
            data-testid="notif-badge"
          >
            🔕 blocked
          </NotifBadge>
        )}
        {notifPermission === "default" && (
          <NotifBadge
            $ok={false}
            onClick={onRequestNotifPermission}
            title="Click to grant notification permission"
            data-testid="notif-badge"
          >
            🔔 click to enable
          </NotifBadge>
        )}
      </>
    )}
  </>
);

export default ManagerModeControls;
