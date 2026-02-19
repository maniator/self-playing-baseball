import * as React from "react";
import styled from "styled-components";
import { ContextValue, GameContext, DecisionType, Strategy } from "../Context";

const Panel = styled.div`
  background: rgba(0, 30, 60, 0.92);
  border: 2px solid aquamarine;
  border-radius: 12px;
  padding: 14px 18px;
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 14px;
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

type Props = {
  strategy: Strategy;
};

const DecisionPanel: React.FunctionComponent<Props> = ({ strategy }) => {
  const { dispatch, pendingDecision }: ContextValue = React.useContext(GameContext);

  if (!pendingDecision) return null;

  const skip = () => dispatch({ type: "skip_decision" });

  switch (pendingDecision.kind) {
    case "steal": {
      const { base, successPct } = pendingDecision;
      return (
        <Panel>
          <Prompt>Steal attempt from {base === 0 ? "1st" : "2nd"} base?</Prompt>
          <Odds>Est. success: {successPct}%</Odds>
          <ActionButton onClick={() => dispatch({ type: "steal_attempt", payload: { base, successPct } })}>
            Yes, steal!
          </ActionButton>
          <SkipButton onClick={skip}>Skip</SkipButton>
        </Panel>
      );
    }
    case "bunt": {
      return (
        <Panel>
          <Prompt>Sacrifice bunt?</Prompt>
          <ActionButton onClick={() => dispatch({ type: "bunt_attempt", payload: { strategy } })}>
            Yes, bunt!
          </ActionButton>
          <SkipButton onClick={skip}>Skip</SkipButton>
        </Panel>
      );
    }
    case "count30": {
      return (
        <Panel>
          <Prompt>Count is 3-0. Take or swing?</Prompt>
          <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "take" })}>
            Take (walk odds ↑)
          </ActionButton>
          <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "swing" })}>
            Swing away
          </ActionButton>
          <SkipButton onClick={skip}>Skip</SkipButton>
        </Panel>
      );
    }
    case "count02": {
      return (
        <Panel>
          <Prompt>Count is 0-2. Protect the plate or normal swing?</Prompt>
          <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "protect" })}>
            Protect (contact ↑)
          </ActionButton>
          <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "normal" })}>
            Normal swing
          </ActionButton>
          <SkipButton onClick={skip}>Skip</SkipButton>
        </Panel>
      );
    }
    case "ibb": {
      return (
        <Panel>
          <Prompt>Issue an intentional walk (IBB)?</Prompt>
          <ActionButton onClick={() => dispatch({ type: "intentional_walk" })}>
            Yes, IBB
          </ActionButton>
          <SkipButton onClick={skip}>Skip</SkipButton>
        </Panel>
      );
    }
    default:
      return null;
  }
};

export default DecisionPanel;
