import * as React from "react";
import styled from "styled-components";
import { DecisionType, Strategy } from "../Context";

const ActionButton = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
`;

const SkipButton = styled(ActionButton)`
  background: #3a4a6a;
  color: #ccc;
`;

const Prompt = styled.span`
  flex: 1 1 auto;
  color: #e0f8f0;
  font-weight: 600;
`;

const Odds = styled.span`
  color: #aaffcc;
  font-size: 13px;
`;

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
    default:
      return null;
  }
};

export default DecisionButtons;
