import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManagerModeControls from "./ManagerModeControls";

const noop = () => {};

describe("ManagerModeControls", () => {
  const defaultProps = {
    managerMode: false,
    strategy: "balanced" as const,
    managedTeam: 0 as const,
    teams: ["Yankees", "Red Sox"],
    notifPermission: "granted" as NotificationPermission,
    onManagerModeChange: noop,
    onStrategyChange: noop,
    onManagedTeamChange: noop,
    onRequestNotifPermission: noop,
  };

  it("renders Manager Mode checkbox", () => {
    render(<ManagerModeControls {...defaultProps} />);
    expect(screen.getByRole("checkbox")).toBeTruthy();
    expect(screen.getByText(/manager mode/i)).toBeTruthy();
  });

  it("does not show team/strategy selects when managerMode is false", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={false} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows team and strategy selects when managerMode is true", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} />);
    expect(screen.getAllByRole("combobox").length).toBe(2);
  });

  it("renders team names in the team selector", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} />);
    expect(screen.getByText("Yankees")).toBeTruthy();
    expect(screen.getByText("Red Sox")).toBeTruthy();
  });

  it("renders all 5 strategy options", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} />);
    ["balanced", "aggressive", "patient", "contact", "power"].forEach(s =>
      expect(screen.getByText(new RegExp(s, "i"))).toBeTruthy()
    );
  });

  it("calls onManagerModeChange when checkbox toggled", async () => {
    const onChange = vi.fn();
    render(<ManagerModeControls {...defaultProps} onManagerModeChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("shows 🔔 on badge when notifPermission is granted", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} notifPermission="granted" />);
    expect(screen.getByText(/🔔 on/)).toBeTruthy();
  });

  it("shows blocked badge when notifPermission is denied", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} notifPermission="denied" />);
    expect(screen.getByText(/blocked/i)).toBeTruthy();
  });

  it("shows click-to-enable badge when notifPermission is default", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} notifPermission="default" />);
    expect(screen.getByText(/click to enable/i)).toBeTruthy();
  });

  it("calls onRequestNotifPermission when click-to-enable badge is clicked", async () => {
    const onRequest = vi.fn();
    render(
      <ManagerModeControls {...defaultProps} managerMode={true} notifPermission="default" onRequestNotifPermission={onRequest} />
    );
    await userEvent.click(screen.getByText(/click to enable/i));
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it("does not show notification badge when notifPermission is unavailable", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} notifPermission="unavailable" />);
    expect(screen.queryByText(/🔔 on/)).toBeNull();
    expect(screen.queryByText(/blocked/)).toBeNull();
    expect(screen.queryByText(/click to enable/)).toBeNull();
  });
});
