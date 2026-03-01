import * as React from "react";

import type { TeamCustomPlayerOverrides } from "@context/index";

import {
  ActionButton,
  CloseButton,
  EmptyNote,
  FatigueLabel,
  Panel,
  PanelHeader,
  PanelTitle,
  Row,
  Section,
  SectionTitle,
  SelectField,
} from "./styles";

type SubstitutePayload =
  | { kind: "batter"; lineupIdx: number; benchPlayerId: string }
  | { kind: "pitcher"; pitcherIdx: number };

/** Role eligibility for a pitcher: SP = starter, RP = reliever, SP/RP = both. */
export type PitchingRole = "SP" | "RP" | "SP/RP";

type Props = {
  teamName: string;
  lineupOrder: string[];
  rosterBench: string[];
  rosterPitchers: string[];
  activePitcherIdx: number;
  playerOverrides: TeamCustomPlayerOverrides;
  /** Player IDs that have been substituted out (no-reentry). */
  substitutedOut?: string[];
  /** Map from pitcher ID to their role eligibility. Used to filter reliever candidates. */
  pitcherRoles?: Record<string, PitchingRole>;
  /** Batters faced by the current pitcher (for fatigue display). */
  pitcherBattersFaced?: number;
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

/** Returns true if a pitcher with the given role can be used as an in-game reliever. */
const isRelieverEligible = (role?: PitchingRole): boolean =>
  role === "RP" || role === "SP/RP" || role === undefined;

/** Fatigue threshold above which a pitching change is strongly recommended. */
const FATIGUE_HIGH = 18;
const FATIGUE_MED = 12;

const SubstitutionPanel: React.FunctionComponent<Props> = ({
  teamName,
  lineupOrder,
  rosterBench,
  rosterPitchers,
  activePitcherIdx,
  playerOverrides,
  substitutedOut = [],
  pitcherRoles = {},
  pitcherBattersFaced = 0,
  onSubstitute,
  onClose,
}) => {
  // Filter bench to only players who haven't been substituted out (no-reentry).
  const eligibleBench = rosterBench.filter((id) => !substitutedOut.includes(id));
  const [selectedLineupIdx, setSelectedLineupIdx] = React.useState(0);
  const [selectedBenchId, setSelectedBenchId] = React.useState(eligibleBench[0] ?? "");
  const [selectedPitcherIdx, setSelectedPitcherIdx] = React.useState<number>(() => {
    const alt = rosterPitchers.findIndex(
      (id, i) => i !== activePitcherIdx && isRelieverEligible(pitcherRoles[id]),
    );
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
    setSelectedBenchId(() => {
      if (eligibleBench.length === 0) return "";
      return eligibleBench[0];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterBench, substitutedOut]);

  // Re-sync pitcher selection when pitcher roster, active pitcher, or roles change.
  React.useEffect(() => {
    setSelectedPitcherIdx(() => {
      const alt = rosterPitchers.findIndex(
        (id, i) =>
          i !== activePitcherIdx &&
          !substitutedOut.includes(id) &&
          isRelieverEligible(pitcherRoles[id]),
      );
      return alt >= 0 ? alt : activePitcherIdx;
    });
  }, [rosterPitchers, activePitcherIdx, substitutedOut, pitcherRoles]);

  const hasBench = eligibleBench.length > 0;
  const currentPitcherId = rosterPitchers[activePitcherIdx] ?? "";
  // Only show reliever-eligible pitchers that haven't been substituted out.
  const availablePitcherOptions = rosterPitchers
    .map((id, i) => ({ id, idx: i }))
    .filter(
      ({ id, idx }) =>
        idx !== activePitcherIdx &&
        !substitutedOut.includes(id) &&
        isRelieverEligible(pitcherRoles[id]),
    );
  const hasPitcherReplacement = availablePitcherOptions.length > 0;

  // Fatigue UI: show the current pitcher's batters-faced and a warning if high.
  const fatigueLevel =
    pitcherBattersFaced >= FATIGUE_HIGH
      ? "high"
      : pitcherBattersFaced >= FATIGUE_MED
        ? "medium"
        : "low";

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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLineupIdx(Number(e.target.value))}
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBenchId(e.target.value)}
              aria-label="Bench player to bring in"
            >
              {eligibleBench.map((id) => (
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
              {pitcherBattersFaced > 0 && (
                <FatigueLabel data-testid="fatigue-label" $level={fatigueLevel}>
                  {pitcherBattersFaced} BF
                  {fatigueLevel === "high" ? " ⚠ tired" : fatigueLevel === "medium" ? " ~" : ""}
                </FatigueLabel>
              )}
            </Row>
            {hasPitcherReplacement ? (
              <Row>
                <SelectField
                  value={selectedPitcherIdx}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPitcherIdx(Number(e.target.value))}
                  aria-label="Replacement pitcher"
                >
                  {availablePitcherOptions.map(({ id, idx }) => (
                    <option key={id} value={idx}>
                      {getPlayerLabel(id, playerOverrides)}
                      {pitcherRoles[id] ? ` [${pitcherRoles[id]}]` : ""}
                    </option>
                  ))}
                </SelectField>
                <ActionButton type="button" onClick={handlePitcherChange}>
                  Change Pitcher
                </ActionButton>
              </Row>
            ) : (
              <EmptyNote>No eligible relievers available.</EmptyNote>
            )}
          </>
        ) : (
          <EmptyNote>No pitchers on roster.</EmptyNote>
        )}
      </Section>
    </Panel>
  );
};

export default SubstitutionPanel;
