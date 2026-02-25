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
  teamIdx: 0 | 1;
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

  const hasBench = rosterBench.length > 0;
  const currentPitcherId = rosterPitchers[activePitcherIdx] ?? "";
  const availablePitcherOptions = rosterPitchers
    .map((id, i) => ({ id, idx: i }))
    .filter(({ idx }) => idx !== activePitcherIdx);
  const hasPitcherReplacement = availablePitcherOptions.length > 0;

  // For the currently selected lineup slot, determine which positions are already
  // occupied by OTHER slots so we can flag duplicate-position bench candidates.
  const occupiedPositions = React.useMemo(() => {
    const set = new Set<string>();
    lineupOrder.forEach((id, i) => {
      if (i === selectedLineupIdx) return; // the slot being replaced — excluded
      const pos = playerOverrides[id]?.position;
      if (pos) set.add(pos);
    });
    return set;
  }, [lineupOrder, selectedLineupIdx, playerOverrides]);

  // Valid bench options: bench players whose position does NOT conflict with the
  // remaining active lineup positions. Bench players without a stored position are
  // always shown (no data to conflict on).
  const validBenchOptions = React.useMemo(
    () =>
      rosterBench.filter((id) => {
        const pos = playerOverrides[id]?.position;
        return !pos || !occupiedPositions.has(pos);
      }),
    [rosterBench, playerOverrides, occupiedPositions],
  );

  // Keep selectedBenchId valid when slot changes / bench changes.
  React.useEffect(() => {
    if (validBenchOptions.length > 0 && !validBenchOptions.includes(selectedBenchId)) {
      setSelectedBenchId(validBenchOptions[0]);
    }
  }, [validBenchOptions, selectedBenchId]);

  const handleBatterSub = () => {
    if (validBenchOptions.length === 0 || !selectedBenchId) return;
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
          validBenchOptions.length > 0 ? (
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
                {validBenchOptions.map((id) => (
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
            <EmptyNote>No valid bench replacements for this position.</EmptyNote>
          )
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
