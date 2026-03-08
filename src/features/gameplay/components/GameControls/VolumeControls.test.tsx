import * as React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import VolumeControls from "./VolumeControls";

const noop = () => {};

describe("VolumeControls", () => {
  const defaultProps = {
    announcementVolume: 0.8,
    alertVolume: 0.5,
    onAnnouncementVolumeChange: noop,
    onAlertVolumeChange: noop,
    onToggleAnnouncementMute: noop,
    onToggleAlertMute: noop,
  };

  it("renders announcement and music volume sliders", () => {
    render(<VolumeControls {...defaultProps} />);
    expect(screen.getByRole("slider", { name: /announcement volume/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /music volume/i })).toBeTruthy();
  });

  it("shows 🔊 icon when announcement volume > 0", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0.8} />);
    expect(screen.getByRole("button", { name: /mute announcements/i })).toBeTruthy();
  });

  it("shows 🔇 icon when announcement volume is 0", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0} />);
    expect(screen.getByRole("button", { name: /unmute announcements/i })).toBeTruthy();
  });

  it("shows 🎵 icon when alert volume > 0", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0.5} />);
    expect(screen.getByRole("button", { name: /mute music/i })).toBeTruthy();
  });

  it("shows 🔇 icon when alert volume is 0", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0} />);
    expect(screen.getByRole("button", { name: /unmute music/i })).toBeTruthy();
  });

  it("calls onToggleAnnouncementMute when 🔊 clicked", async () => {
    const onToggle = vi.fn();
    render(<VolumeControls {...defaultProps} onToggleAnnouncementMute={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /mute announcements/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("calls onToggleAlertMute when 🎵 clicked", async () => {
    const onToggle = vi.fn();
    render(<VolumeControls {...defaultProps} onToggleAlertMute={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /mute music/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("renders announcement slider with correct value", () => {
    render(<VolumeControls {...defaultProps} announcementVolume={0.6} />);
    const slider = screen.getByRole("slider", { name: /announcement volume/i }) as HTMLInputElement;
    expect(slider.value).toBe("0.6");
  });

  it("renders alert slider with correct value", () => {
    render(<VolumeControls {...defaultProps} alertVolume={0.3} />);
    const slider = screen.getByRole("slider", { name: /music volume/i }) as HTMLInputElement;
    expect(slider.value).toBe("0.3");
  });
});
