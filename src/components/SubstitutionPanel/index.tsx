import * as React from "react";

import type { TeamCustomPlayerOverrides } from "@context/index";

import {
  ActionButton,
  CloseButton,
  EmptyNote,
  Panel,
  PanelHeader,
  PanelTitle,
  Row,
  Section,
  SectionTitle,
  SelectField,
  StageNote,
} from "./styles";

type SubstitutePayload =
  | { kind: "batter"; lineupIdx: number; benchPlayerId: string }
  | { kind: "pitcher"; pitcherIdx: number };

type Props = {
  teamName: string;
  lineupOrder: string[];
  rosterBench: string[];
  rosterPitchers: string[];
  activePitcherIdx: number;
  playerOverrides: TeamCustomPlayerOverrides;
  onSubstitute: (payload: SubstitutePayload) => void;
  onClose: () => void;
};

const getPlayerName = (id: string, overrides: TeamCustomPlayerOverrides): string =>
  overrides[id]?.nickname ?? id.slice(0, 8);

const getPlayerLabel = (id: string, overrides: TeamCustomPlayerOverrides): string => {
  const name = getPlayerName(id, overrides);
  const pos = overrides[id]?.position;
  return pos ? `${name} (${pos})` : name;
};

const SubstitutionPanel: React.FunctionComponent<Props> = ({
  teamName,
  lineupOrder,
  rosterBench,
  rosterPitchers,
  activePitcherIdx,
  playerOverrides,
  onSubstitute,
  onClose,
}) => {
  const [selectedLineupIdx, setSelectedLineupIdx] = React.useState(0);
  const [selectedBenchId, setSelectedBenchId] = React.useState(rosterBench[0] ?? "");
  const [selectedPitcherIdx, setSelectedPitcherIdx] = React.useState<number>(() => {
    const alt = rosterPitchers.findIndex((_, i) => i !== activePitcherIdx);
    return alt >= 0 ? alt : activePitcherIdx;
  });

  // Re-clamp lineup index when lineup length changes (e.g. team change or substitution).
  React.useEffect(() => {
    setSelectedLineupIdx((prev) => {
      if (lineupOrder.length === 0) return 0;
      const max = lineupOrder.length - 1;
      return prev > max ? max : prev < 0 ? 0 : prev;
    });
  }, [lineupOrder.length]);

  // Re-sync bench selection when bench roster changes.
  React.useEffect(() => {
    setSelectedBenchId((prev) => {
      if (rosterBench.length === 0) return "";
      if (prev && rosterBench.includes(prev)) return prev;
      return rosterBench[0];
    });
  }, [rosterBench]);

  // Re-sync pitcher selection when pitcher roster or active pitcher changes.
  React.useEffect(() => {
    setSelectedPitcherIdx(() => {
      const alt = rosterPitchers.findIndex((_, i) => i !== activePitcherIdx);
      return alt >= 0 ? alt : activePitcherIdx;
    });
  }, [rosterPitchers, activePitcherIdx]);

  const hasBench = rosterBench.length > 0;
  const currentPitcherId = rosterPitchers[activePitcherIdx] ?? "";
  const availablePitcherOptions = rosterPitchers
    .map((id, i) => ({ id, idx: i }))
    .filter(({ idx }) => idx !== activePitcherIdx);
  const hasPitcherReplacement = availablePitcherOptions.length > 0;

  const handleBatterSub = () => {
    if (!hasBench || !selectedBenchId) return;
    onSubstitute({ kind: "batter", lineupIdx: selectedLineupIdx, benchPlayerId: selectedBenchId });
  };

  const handlePitcherChange = () => {
    if (!hasPitcherReplacement) return;
    onSubstitute({ kind: "pitcher", pitcherIdx: selectedPitcherIdx });
  };

  return (
    <Panel data-testid="substitution-panel">
      <PanelHeader>
        <PanelTitle>🔄 {teamName} Substitutions</PanelTitle>
        <CloseButton type="button" onClick={onClose} aria-label="Close substitution panel">
          ✕
        </CloseButton>
      </PanelHeader>

      <Section>
        <SectionTitle>Batter Substitution</SectionTitle>
        {hasBench ? (
          <Row>
            <SelectField
              value={selectedLineupIdx}
              onChange={(e) => setSelectedLineupIdx(Number(e.target.value))}
              aria-label="Player to replace"
            >
              {lineupOrder.map((id, i) => (
                <option key={id} value={i}>
                  {i + 1}. {getPlayerLabel(id, playerOverrides)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={selectedBenchId}
              onChange={(e) => setSelectedBenchId(e.target.value)}
              aria-label="Bench player to bring in"
            >
              {rosterBench.map((id) => (
                <option key={id} value={id}>
                  {getPlayerLabel(id, playerOverrides)}
                </option>
              ))}
            </SelectField>
            <ActionButton type="button" onClick={handleBatterSub} disabled={!selectedBenchId}>
              Sub In
            </ActionButton>
          </Row>
        ) : (
          <EmptyNote>No bench players available.</EmptyNote>
        )}
      </Section>

      <Section>
        <SectionTitle>Pitching Change</SectionTitle>
        {rosterPitchers.length > 0 ? (
          <>
            <Row>
              <span style={{ fontSize: "12px", color: "#a0b4d0" }}>
                Current: {getPlayerLabel(currentPitcherId, playerOverrides)}
              </span>
            </Row>
            {hasPitcherReplacement ? (
              <Row>
                <SelectField
                  value={selectedPitcherIdx}
                  onChange={(e) => setSelectedPitcherIdx(Number(e.target.value))}
                  aria-label="Replacement pitcher"
                >
                  {availablePitcherOptions.map(({ id, idx }) => (
                    <option key={id} value={idx}>
                      {getPlayerLabel(id, playerOverrides)}
                    </option>
                  ))}
                </SelectField>
                <ActionButton type="button" onClick={handlePitcherChange}>
                  Change Pitcher
                </ActionButton>
              </Row>
            ) : (
              <EmptyNote>No other pitchers available.</EmptyNote>
            )}
          </>
        ) : (
          <EmptyNote>No pitchers on roster.</EmptyNote>
        )}
        <StageNote>Full pitching strategy (fatigue, matchups) coming in Stage 3C.</StageNote>
      </Section>
    </Panel>
  );
};

export default SubstitutionPanel;
