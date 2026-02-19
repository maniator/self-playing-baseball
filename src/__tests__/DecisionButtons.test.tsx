import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DecisionButtons from "../DecisionPanel/DecisionButtons";
import { DecisionType } from "../Context";

const noop = () => {};

describe("DecisionButtons", () => {
  // ---------------------------------------------------------------------------
  // steal
  // ---------------------------------------------------------------------------
  describe("steal", () => {
    const decision: DecisionType = { kind: "steal", base: 0, successPct: 75 };

    it("renders prompt, odds, Yes and Skip buttons for steal from 1st", () => {
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={noop}
        />
      );
      expect(screen.getByText(/steal attempt from 1st base/i)).toBeTruthy();
      expect(screen.getByText(/est\. success: 75%/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /yes, steal!/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
    });

    it("renders 2nd base label for steal from base 1", () => {
      const d: DecisionType = { kind: "steal", base: 1, successPct: 80 };
      render(
        <DecisionButtons pendingDecision={d} strategy="balanced" onSkip={noop} onDispatch={noop} />
      );
      expect(screen.getByText(/steal attempt from 2nd base/i)).toBeTruthy();
    });

    it("calls onDispatch with steal_attempt on Yes click", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /yes, steal!/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "steal_attempt",
        payload: { base: 0, successPct: 75 },
      });
    });

    it("calls onSkip on Skip click", async () => {
      const onSkip = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={onSkip}
          onDispatch={noop}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /skip/i }));
      expect(onSkip).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // bunt
  // ---------------------------------------------------------------------------
  describe("bunt", () => {
    const decision: DecisionType = { kind: "bunt" };

    it("renders prompt, Yes and Skip buttons", () => {
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="contact"
          onSkip={noop}
          onDispatch={noop}
        />
      );
      expect(screen.getByText(/sacrifice bunt\?/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /yes, bunt!/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
    });

    it("calls onDispatch with bunt_attempt and strategy on Yes click", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="contact"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /yes, bunt!/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "bunt_attempt",
        payload: { strategy: "contact" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // count30
  // ---------------------------------------------------------------------------
  describe("count30", () => {
    const decision: DecisionType = { kind: "count30" };

    it("renders Take and Swing away buttons", () => {
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="patient"
          onSkip={noop}
          onDispatch={noop}
        />
      );
      expect(screen.getByText(/count is 3-0/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /take/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /swing away/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
    });

    it("calls onDispatch with take modifier on Take click", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="patient"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /take/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "set_one_pitch_modifier",
        payload: "take",
      });
    });

    it("calls onDispatch with swing modifier on Swing away click", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="patient"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /swing away/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "set_one_pitch_modifier",
        payload: "swing",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // count02
  // ---------------------------------------------------------------------------
  describe("count02", () => {
    const decision: DecisionType = { kind: "count02" };

    it("renders Protect and Normal swing buttons", () => {
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={noop}
        />
      );
      expect(screen.getByText(/count is 0-2/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /protect/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /normal swing/i })).toBeTruthy();
    });

    it("calls onDispatch with protect modifier", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /protect/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "set_one_pitch_modifier",
        payload: "protect",
      });
    });

    it("calls onDispatch with normal modifier", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /normal swing/i }));
      expect(onDispatch).toHaveBeenCalledWith({
        type: "set_one_pitch_modifier",
        payload: "normal",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ibb
  // ---------------------------------------------------------------------------
  describe("ibb", () => {
    const decision: DecisionType = { kind: "ibb" };

    it("renders IBB prompt, Yes and Skip buttons", () => {
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={noop}
        />
      );
      expect(screen.getByText(/intentional walk/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /yes, ibb/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
    });

    it("calls onDispatch with intentional_walk on Yes click", async () => {
      const onDispatch = vi.fn();
      render(
        <DecisionButtons
          pendingDecision={decision}
          strategy="balanced"
          onSkip={noop}
          onDispatch={onDispatch}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /yes, ibb/i }));
      expect(onDispatch).toHaveBeenCalledWith({ type: "intentional_walk" });
    });
  });

  // ---------------------------------------------------------------------------
  // unknown kind → null
  // ---------------------------------------------------------------------------
  it("renders nothing for an unknown decision kind", () => {
    const decision = { kind: "unknown" } as unknown as DecisionType;
    const { container } = render(
      <DecisionButtons
        pendingDecision={decision}
        strategy="balanced"
        onSkip={noop}
        onDispatch={noop}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
