import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VolumeControls from "../BatterButton/VolumeControls";
import ManagerModeControls from "../BatterButton/ManagerModeControls";

const noop = () => {};

// ---------------------------------------------------------------------------
// VolumeControls
// ---------------------------------------------------------------------------
describe("VolumeControls", () => {
  const defaultProps = {
    announcementVolume: 0.8,
    alertVolume: 0.5,
    onAnnouncementVolumeChange: noop,
    onAlertVolumeChange: noop,
    onToggleAnnouncementMute: noop,
    onToggleAlertMute: noop,
  };

  it("renders announcement and alert volume sliders", () => {
    render(<VolumeControls {...defaultProps} />);
    expect(screen.getByRole("slider", { name: /announcement volume/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /alert volume/i })).toBeTruthy();
  });

  it("shows 🔊 icon when announcement volume > 0", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0.8} />);
    expect(screen.getByRole("button", { name: /mute announcements/i })).toBeTruthy();
  });

  it("shows 🔇 icon when announcement volume is 0", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0} />);
    expect(screen.getByRole("button", { name: /unmute announcements/i })).toBeTruthy();
  });

  it("shows 🔔 icon when alert volume > 0", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0.5} />);
    expect(screen.getByRole("button", { name: /mute alerts/i })).toBeTruthy();
  });

  it("shows 🔕 icon when alert volume is 0", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0} />);
    expect(screen.getByRole("button", { name: /unmute alerts/i })).toBeTruthy();
  });

  it("calls onToggleAnnouncementMute when 🔊 clicked", async () => {
    const onToggle = vi.fn();
    render(<VolumeControls {...defaultProps} onToggleAnnouncementMute={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /mute announcements/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("calls onToggleAlertMute when 🔔 clicked", async () => {
    const onToggle = vi.fn();
    render(<VolumeControls {...defaultProps} onToggleAlertMute={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /mute alerts/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("renders announcement slider with correct value", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0.6} />);
    const slider = screen.getByRole("slider", { name: /announcement volume/i }) as HTMLInputElement;
    expect(slider.value).toBe("0.6");
  });

  it("renders alert slider with correct value", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0.3} />);
    const slider = screen.getByRole("slider", { name: /alert volume/i }) as HTMLInputElement;
    expect(slider.value).toBe("0.3");
  });
});

// ---------------------------------------------------------------------------
// ManagerModeControls
// ---------------------------------------------------------------------------
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
    const combos = screen.getAllByRole("combobox");
    expect(combos.length).toBe(2); // Team + Strategy
  });

  it("renders team names in the team selector", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} />);
    expect(screen.getByText("Yankees")).toBeTruthy();
    expect(screen.getByText("Red Sox")).toBeTruthy();
  });

  it("renders all 5 strategy options", () => {
    render(<ManagerModeControls {...defaultProps} managerMode={true} />);
    expect(screen.getByText(/balanced/i)).toBeTruthy();
    expect(screen.getByText(/aggressive/i)).toBeTruthy();
    expect(screen.getByText(/patient/i)).toBeTruthy();
    expect(screen.getByText(/contact/i)).toBeTruthy();
    expect(screen.getByText(/power/i)).toBeTruthy();
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
      <ManagerModeControls
        {...defaultProps}
        managerMode={true}
        notifPermission="default"
        onRequestNotifPermission={onRequest}
      />
    );
    await userEvent.click(screen.getByText(/click to enable/i));
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it("does not show notification badge when notifPermission is unavailable", () => {
    render(
      <ManagerModeControls
        {...defaultProps}
        managerMode={true}
        notifPermission="unavailable"
      />
    );
    expect(screen.queryByText(/🔔 on/)).toBeNull();
    expect(screen.queryByText(/blocked/)).toBeNull();
    expect(screen.queryByText(/click to enable/)).toBeNull();
  });
});
