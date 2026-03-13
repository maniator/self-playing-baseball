import * as React from "react";

import type { PinchHitterCandidate, Strategy } from "@feat/gameplay/context/index";

import { ActionButton, Odds, Prompt, SkipButton } from "./styles";

type Props = {
  candidates: PinchHitterCandidate[];
  teamIdx: 0 | 1;
  lineupIdx: number;
  pitcherHandedness?: "R" | "L";
  currentBatterMatchupDeltaPct?: number;
  onSkip: () => void;
  onDispatch: (action: { type: string; payload?: unknown }) => void;
};

const PinchHitterDecisionButtons: React.FunctionComponent<Props> = ({
  candidates,
  teamIdx,
  lineupIdx,
  pitcherHandedness,
  currentBatterMatchupDeltaPct,
  onSkip,
  onDispatch,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string>(() =>
    candidates.length > 0 ? candidates[0].id : "",
  );

  React.useEffect(() => {
    setSelectedCandidateId(candidates.length > 0 ? candidates[0].id : "");
  }, [candidates, teamIdx, lineupIdx]);

  if (candidates.length === 0) {
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
    onDispatch({ type: "set_pinch_hitter_strategy", payload: "contact" });
  };

  const candidateLabel = (c: PinchHitterCandidate) =>
    c.position ? `${c.name} (${c.position})` : c.name;
  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0];
  const formatPct = (value: number) => `${value >= 0 ? "+" : ""}${value}%`;

  return (
    <>
      <Prompt>
        Send up a pinch hitter{pitcherHandedness ? ` vs ${pitcherHandedness}HP` : ""}:
      </Prompt>
      {currentBatterMatchupDeltaPct !== undefined && (
        <Odds>Current batter platoon edge: {formatPct(currentBatterMatchupDeltaPct)}</Odds>
      )}
      {selectedCandidate?.matchupDeltaPct !== undefined && (
        <Odds>Selected hitter platoon edge: {formatPct(selectedCandidate.matchupDeltaPct)}</Odds>
      )}
      <select
        value={selectedCandidateId}
        onChange={(e) => setSelectedCandidateId(e.target.value)}
        aria-label="Select pinch hitter"
        data-testid="pinch-hitter-select"
      >
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {candidateLabel(c)}
            {c.matchupDeltaPct !== undefined
              ? ` [${c.matchupDeltaPct >= 0 ? "+" : ""}${c.matchupDeltaPct}%]`
              : ""}
          </option>
        ))}
      </select>
      <ActionButton onClick={handleConfirm} disabled={!selectedCandidateId}>
        Send up pinch hitter
      </ActionButton>
      <SkipButton onClick={onSkip}>Skip</SkipButton>
    </>
  );
};

export default PinchHitterDecisionButtons;
