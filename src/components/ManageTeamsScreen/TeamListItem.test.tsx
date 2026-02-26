import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@features/customTeams/adapters/customTeamAdapter", () => ({
  customTeamToDisplayName: vi.fn((team: { name: string }) => team.name),
}));

// jsdom doesn't implement window.confirm; provide a controllable mock.
const confirmMock = vi.fn(() => true);
vi.stubGlobal("confirm", confirmMock);

import type { CustomTeamDoc } from "@storage/types";

import TeamListItem from "./TeamListItem";

const makeTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc =>
  ({
    id: "ct_test1",
    name: "Test Team",
    city: "Testville",
    abbreviation: "TST",
    roster: {
      lineup: Array(8).fill({
        id: "p1",
        name: "Player",
        position: "SS",
        contactMod: 0,
        powerMod: 0,
      }),
      pitchers: [{ id: "p9", name: "Pitcher", role: "SP" as const, contactMod: 0, powerMod: 0 }],
      bench: [{ id: "p10", name: "Bench", position: "OF", contactMod: 0, powerMod: 0 }],
    },
    ...overrides,
  }) as unknown as CustomTeamDoc;

describe("TeamListItem", () => {
  beforeEach(() => {
    confirmMock.mockReset();
    confirmMock.mockReturnValue(true);
  });

  it("renders the team name", () => {
    render(<TeamListItem team={makeTeam()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Test Team")).toBeInTheDocument();
  });

  it("renders player count metadata", () => {
    render(<TeamListItem team={makeTeam()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/8 batters/i)).toBeInTheDocument();
    expect(screen.getByText(/1 pitchers/i)).toBeInTheDocument();
    expect(screen.getByText(/1 bench/i)).toBeInTheDocument();
  });

  it("calls onEdit with team id when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<TeamListItem team={makeTeam()} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByTestId("custom-team-edit-button"));
    expect(onEdit).toHaveBeenCalledWith("ct_test1");
  });

  it("calls onDelete when Delete is clicked and confirm returns true", () => {
    const onDelete = vi.fn();
    render(<TeamListItem team={makeTeam()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("custom-team-delete-button"));
    expect(confirmMock).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith("ct_test1");
  });

  it("does NOT call onDelete when confirm returns false", () => {
    confirmMock.mockReturnValue(false);
    const onDelete = vi.fn();
    render(<TeamListItem team={makeTeam()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("custom-team-delete-button"));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
