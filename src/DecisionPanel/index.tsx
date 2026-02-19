import * as React from "react";
import styled from "styled-components";
import { ContextValue, GameContext, Strategy } from "../Context";

const DECISION_TIMEOUT_SEC = 10;

const Panel = styled.div`
  background: rgba(0, 30, 60, 0.92);
  border: 2px solid aquamarine;
  border-radius: 12px;
  padding: 14px 18px 10px;
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

const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
`;

const CountdownTrack = styled.div`
  flex: 1;
  height: 4px;
  background: #1a2e1a;
  border-radius: 2px;
  overflow: hidden;
`;

const CountdownFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $pct }) => $pct > 50 ? "#44cc88" : $pct > 25 ? "#ffaa33" : "#ff4444"};
  border-radius: 2px;
  transition: width 0.95s linear, background 0.5s ease;
`;

const CountdownLabel = styled.span`
  color: #888;
  font-size: 11px;
  white-space: nowrap;
  min-width: 52px;
  text-align: right;
`;

type Props = {
  strategy: Strategy;
};

const DecisionPanel: React.FunctionComponent<Props> = ({ strategy }) => {
  const { dispatch, pendingDecision }: ContextValue = React.useContext(GameContext);
  const [secondsLeft, setSecondsLeft] = React.useState(DECISION_TIMEOUT_SEC);

  React.useEffect(() => {
    if (!pendingDecision) {
      setSecondsLeft(DECISION_TIMEOUT_SEC);
      return;
    }
    setSecondsLeft(DECISION_TIMEOUT_SEC);
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          dispatch({ type: "skip_decision" });
          return DECISION_TIMEOUT_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pendingDecision, dispatch]);

  if (!pendingDecision) return null;

  const skip = () => dispatch({ type: "skip_decision" });
  const pct = (secondsLeft / DECISION_TIMEOUT_SEC) * 100;

  const renderButtons = () => {
    switch (pendingDecision.kind) {
      case "steal": {
        const { base, successPct } = pendingDecision;
        return (
          <>
            <Prompt>Steal attempt from {base === 0 ? "1st" : "2nd"} base?</Prompt>
            <Odds>Est. success: {successPct}%</Odds>
            <ActionButton onClick={() => dispatch({ type: "steal_attempt", payload: { base, successPct } })}>
              Yes, steal!
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      }
      case "bunt":
        return (
          <>
            <Prompt>Sacrifice bunt?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "bunt_attempt", payload: { strategy } })}>
              Yes, bunt!
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "count30":
        return (
          <>
            <Prompt>Count is 3-0. Take or swing?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "take" })}>
              Take (walk odds ↑)
            </ActionButton>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "swing" })}>
              Swing away
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "count02":
        return (
          <>
            <Prompt>Count is 0-2. Protect or normal swing?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "protect" })}>
              Protect (contact ↑)
            </ActionButton>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "normal" })}>
              Normal swing
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "ibb":
        return (
          <>
            <Prompt>Issue an intentional walk (IBB)?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "intentional_walk" })}>
              Yes, IBB
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Panel>
      {renderButtons()}
      <CountdownRow>
        <CountdownTrack>
          <CountdownFill $pct={pct} />
        </CountdownTrack>
        <CountdownLabel>auto-skip {secondsLeft}s</CountdownLabel>
      </CountdownRow>
    </Panel>
  );
};

export default DecisionPanel;
