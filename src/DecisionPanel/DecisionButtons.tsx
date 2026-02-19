import * as React from "react";
import { DecisionType, Strategy } from "../Context";
import { ActionButton, SkipButton, Prompt, Odds } from "./DecisionButtonStyles";

type Props = {
  pendingDecision: DecisionType;
  strategy: Strategy;
  onSkip: () => void;
  onDispatch: (action: { type: string; payload?: unknown }) => void;
};

const DecisionButtons: React.FunctionComponent<Props> = ({
  pendingDecision,
  strategy,
  onSkip,
  onDispatch,
}) => {
  switch (pendingDecision.kind) {
    case "steal": {
      const { base, successPct } = pendingDecision;
      return (
        <>
          <Prompt>Steal attempt from {base === 0 ? "1st" : "2nd"} base?</Prompt>
          <Odds>Est. success: {successPct}%</Odds>
          <ActionButton onClick={() => onDispatch({ type: "steal_attempt", payload: { base, successPct } })}>
            Yes, steal!
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    }
    case "bunt":
      return (
        <>
          <Prompt>Sacrifice bunt?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "bunt_attempt", payload: { strategy } })}>
            Yes, bunt!
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "count30":
      return (
        <>
          <Prompt>Count is 3-0. Take or swing?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "take" })}>
            Take (walk odds ↑)
          </ActionButton>
          <ActionButton onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "swing" })}>
            Swing away
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "count02":
      return (
        <>
          <Prompt>Count is 0-2. Protect or normal swing?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "protect" })}>
            Protect (contact ↑)
          </ActionButton>
          <ActionButton onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "normal" })}>
            Normal swing
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "ibb":
      return (
        <>
          <Prompt>Issue an intentional walk (IBB)?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "intentional_walk" })}>
            Yes, IBB
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "ibb_or_steal": {
      const { base, successPct } = pendingDecision;
      return (
        <>
          <Prompt>Issue intentional walk (IBB) or steal?</Prompt>
          <Odds>Steal success: {successPct}%</Odds>
          <ActionButton onClick={() => onDispatch({ type: "intentional_walk" })}>🥾 Issue IBB</ActionButton>
          <ActionButton onClick={() => onDispatch({ type: "steal_attempt", payload: { base, successPct } })}>
            ⚡ Steal! ({successPct}%)
          </ActionButton>
          <SkipButton onClick={onSkip}>⏭ Skip</SkipButton>
        </>
      );
    }
    default:
      return null;
  }
};

export default DecisionButtons;
