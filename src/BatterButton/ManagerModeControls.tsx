import * as React from "react";
import styled from "styled-components";
import { Strategy } from "../Context";

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: aquamarine;
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
`;

const Select = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;

const NotifBadge = styled.span<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? "#4ade80" : "#fbbf24")};
  cursor: ${({ $ok }) => ($ok ? "default" : "pointer")};
  white-space: nowrap;
`;

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
      <input type="checkbox" checked={managerMode} onChange={onManagerModeChange} />
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
          <NotifBadge $ok={true}>🔔 on</NotifBadge>
        )}
        {notifPermission === "denied" && (
          <NotifBadge $ok={false} title="Enable notifications in your browser settings">
            🔕 blocked
          </NotifBadge>
        )}
        {notifPermission === "default" && (
          <NotifBadge $ok={false} onClick={onRequestNotifPermission} title="Click to grant notification permission">
            🔔 click to enable
          </NotifBadge>
        )}
      </>
    )}
  </>
);

export default ManagerModeControls;
