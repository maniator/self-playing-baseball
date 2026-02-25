import * as React from "react";

import type { DecisionType, PinchHitterCandidate, Strategy } from "@context/index";

import { ActionButton, Odds, Prompt, SkipButton } from "./DecisionButtonStyles";

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
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string>(() => {
    if (pendingDecision.kind === "pinch_hitter" && pendingDecision.candidates.length > 0) {
      return pendingDecision.candidates[0].id;
    }
    return "";
  });

  // Reset the selected candidate whenever the decision changes (e.g. a new pinch_hitter
  // opportunity for a different batter — rare but possible in long extra-inning games).
  React.useEffect(() => {
    if (pendingDecision.kind === "pinch_hitter" && pendingDecision.candidates.length > 0) {
      setSelectedCandidateId(pendingDecision.candidates[0].id);
    } else {
      setSelectedCandidateId("");
    }
  }, [pendingDecision]);

  switch (pendingDecision.kind) {
    case "steal": {
      const { base, successPct } = pendingDecision;
      return (
        <>
          <Prompt>Steal attempt from {base === 0 ? "1st" : "2nd"} base?</Prompt>
          <Odds>Est. success: {successPct}%</Odds>
          <ActionButton
            onClick={() => onDispatch({ type: "steal_attempt", payload: { base, successPct } })}
          >
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
          <ActionButton
            onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "take" })}
          >
            Take (walk odds ↑)
          </ActionButton>
          <ActionButton
            onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "swing" })}
          >
            Swing away
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "count02":
      return (
        <>
          <Prompt>Count is 0-2. Protect or normal swing?</Prompt>
          <ActionButton
            onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "protect" })}
          >
            Protect (contact ↑)
          </ActionButton>
          <ActionButton
            onClick={() => onDispatch({ type: "set_one_pitch_modifier", payload: "normal" })}
          >
            Normal swing
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "ibb":
      return (
        <>
          <Prompt>Issue an intentional walk?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "intentional_walk" })}>
            Yes, walk them
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    case "ibb_or_steal": {
      const { base, successPct } = pendingDecision;
      return (
        <>
          <Prompt>Intentional walk or steal?</Prompt>
          <Odds>Steal success: {successPct}%</Odds>
          <ActionButton onClick={() => onDispatch({ type: "intentional_walk" })}>
            🥾 Intentional Walk
          </ActionButton>
          <ActionButton
            onClick={() => onDispatch({ type: "steal_attempt", payload: { base, successPct } })}
          >
            ⚡ Steal! ({successPct}%)
          </ActionButton>
          <SkipButton onClick={onSkip}>⏭ Skip</SkipButton>
        </>
      );
    }
    case "pinch_hitter": {
      const { candidates, teamIdx, lineupIdx } = pendingDecision;
      if (candidates.length === 0) {
        // No bench available — fall back to strategy selection
        return (
          <>
            <Prompt>Send up a pinch hitter? Pick a strategy:</Prompt>
            {(["contact", "patient", "power", "aggressive", "balanced"] as Strategy[]).map((s) => (
              <ActionButton
                key={s}
                onClick={() => onDispatch({ type: "set_pinch_hitter_strategy", payload: s })}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </ActionButton>
            ))}
            <SkipButton onClick={onSkip}>Skip</SkipButton>
          </>
        );
      }
      const handleConfirm = () => {
        if (!selectedCandidateId) return;
        onDispatch({
          type: "make_substitution",
          payload: { teamIdx, kind: "batter", lineupIdx, benchPlayerId: selectedCandidateId },
        });
        // Lock pinchHitterStrategy to prevent re-offering the decision for this at-bat.
        onDispatch({ type: "set_pinch_hitter_strategy", payload: strategy });
      };
      const candidateLabel = (c: PinchHitterCandidate) =>
        c.position ? `${c.name} (${c.position})` : c.name;
      return (
        <>
          <Prompt>Send up a pinch hitter:</Prompt>
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            aria-label="Select pinch hitter"
            data-testid="pinch-hitter-select"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {candidateLabel(c)}
              </option>
            ))}
          </select>
          <ActionButton onClick={handleConfirm} disabled={!selectedCandidateId}>
            Send up pinch hitter
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    }
    case "defensive_shift":
      return (
        <>
          <Prompt>Deploy defensive shift for this batter?</Prompt>
          <ActionButton onClick={() => onDispatch({ type: "set_defensive_shift", payload: true })}>
            Shift On (pop-outs ↑)
          </ActionButton>
          <ActionButton onClick={() => onDispatch({ type: "set_defensive_shift", payload: false })}>
            Normal Alignment
          </ActionButton>
          <SkipButton onClick={onSkip}>Skip</SkipButton>
        </>
      );
    default:
      return null;
  }
};

export default DecisionButtons;
