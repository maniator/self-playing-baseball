import * as React from "react";

import {
  customTeamToBenchRoster,
  customTeamToDisplayName,
  customTeamToGameId,
  customTeamToLineupOrder,
  customTeamToPitcherRoster,
  customTeamToPlayerOverrides,
  validateCustomTeamForGame,
} from "@features/customTeams/adapters/customTeamAdapter";

import type { TeamCustomPlayerOverrides } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { getSeed, reinitSeed } from "@utils/rng";

import CustomTeamMatchup from "./CustomTeamMatchup";
import PlayerCustomizationPanel from "./PlayerCustomizationPanel";
import {
  BackHomeButton,
  Dialog,
  Divider,
  FieldGroup,
  FieldLabel,
  Input,
  PlayBallButton,
  RadioLabel,
  ResumeButton,
  ResumeLabel,
  SectionLabel,
  SeedHint,
  Select,
  Tab,
  TabRow,
  TeamValidationError,
  Title,
} from "./styles";
import { usePlayerCustomization } from "./usePlayerCustomization";
import { useTeamSelection } from "./useTeamSelection";

export { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";

type ManagedTeam = 0 | 1 | null;
type GameType = "mlb" | "custom";

export type PlayerOverrides = {
  away: TeamCustomPlayerOverrides;
  home: TeamCustomPlayerOverrides;
  awayOrder: string[];
  homeOrder: string[];
  awayBench?: string[];
  homeBench?: string[];
  awayPitchers?: string[];
  homePitchers?: string[];
  /**
   * Starting pitcher index into awayPitchers/homePitchers for each team.
   * null = use index 0 (default). Only meaningful for managed custom-team games.
   */
  startingPitcherIdx?: [number | null, number | null];
};

type Props = {
  onStart: (
    homeTeam: string,
    awayTeam: string,
    managedTeam: ManagedTeam,
    playerOverrides: PlayerOverrides,
  ) => void;
  autoSaveName?: string;
  onResume?: () => void;
  /** When provided, shows a "← Home" button that routes back to the Home screen. */
  onBackToHome?: () => void;
  /** When provided, the custom-team empty-state CTA navigates here. */
  onManageTeams?: () => void;
};

const NewGameDialog: React.FunctionComponent<Props> = ({
  onStart,
  autoSaveName,
  onResume,
  onBackToHome,
  onManageTeams,
}) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");
  const [gameType, setGameType] = React.useState<GameType>("mlb");
  // Pre-fill with the current seed so it's visible and shareable at a glance.
  const [seedInput, setSeedInput] = React.useState(() => getSeed()?.toString(36) ?? "");

  React.useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const { mode, homeLeague, home, setHome, away, setAway, homeList, awayList, handleModeChange, handleHomeLeagueChange } = useTeamSelection(); // prettier-ignore
  const { homeOverrides, setHomeOverrides, awayOverrides, setAwayOverrides, homeOrder, setHomeOrder, awayOrder, setAwayOrder } = usePlayerCustomization(home, away); // prettier-ignore

  const { teams: customTeams } = useCustomTeams();
  const [customAwayId, setCustomAwayId] = React.useState<string>("");
  const [customHomeId, setCustomHomeId] = React.useState<string>("");
  const [teamValidationError, setTeamValidationError] = React.useState<string>("");

  // Keep custom selectors in sync with loaded teams list.
  // Resets to first/second team if the previously-selected ID was deleted.
  React.useEffect(() => {
    if (customTeams.length === 0) return;
    const ids = customTeams.map((t) => t.id);
    if (!customAwayId || !ids.includes(customAwayId)) setCustomAwayId(customTeams[0].id);
    if (!customHomeId || !ids.includes(customHomeId))
      setCustomHomeId(customTeams[customTeams.length > 1 ? 1 : 0].id);
  }, [customTeams, customAwayId, customHomeId]);

  // Starting pitcher selection for managed custom-team games.
  // Tracks the chosen starter pitcher index (into the team's pitchers array) per team.
  const [awayStarterIdx, setAwayStarterIdx] = React.useState<number>(0);
  const [homeStarterIdx, setHomeStarterIdx] = React.useState<number>(0);

  // Reset starter index when the selected team changes.
  React.useEffect(() => {
    setAwayStarterIdx(0);
  }, [customAwayId]);
  React.useEffect(() => {
    setHomeStarterIdx(0);
  }, [customHomeId]);

  // Derive SP-eligible pitchers for each custom team (SP or SP/RP roles, or unset).
  const awayDoc = customTeams.find((t) => t.id === customAwayId);
  const homeDoc = customTeams.find((t) => t.id === customHomeId);
  const spEligiblePitchers = (pitchers: { id: string; name: string; pitchingRole?: string }[]) =>
    pitchers
      .map((p, i) => ({ ...p, idx: i }))
      .filter((p) => !p.pitchingRole || p.pitchingRole === "SP" || p.pitchingRole === "SP/RP");
  const awaySpPitchers = spEligiblePitchers(awayDoc?.roster?.pitchers ?? []);
  const homeSpPitchers = spEligiblePitchers(homeDoc?.roster?.pitchers ?? []);

  // Clear validation error when selections change.
  React.useEffect(() => {
    setTeamValidationError("");
  }, [customAwayId, customHomeId, gameType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply the seed before game state is initialized; updates URL too.
    reinitSeed(seedInput.trim());
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);

    if (gameType === "custom") {
      const awayDocForSubmit = customTeams.find((t) => t.id === customAwayId);
      const homeDocForSubmit = customTeams.find((t) => t.id === customHomeId);
      if (!awayDocForSubmit || !homeDocForSubmit) return;

      // Block self-matchup: a team cannot play against itself.
      if (customAwayId === customHomeId) {
        setTeamValidationError(
          "Away and home teams must be different — choose two different teams.",
        );
        return;
      }

      // Validate both teams before starting the game.
      const awayError = validateCustomTeamForGame(awayDocForSubmit);
      if (awayError) {
        setTeamValidationError(`Away team — ${awayError}`);
        return;
      }
      const homeError = validateCustomTeamForGame(homeDocForSubmit);
      if (homeError) {
        setTeamValidationError(`Home team — ${homeError}`);
        return;
      }
      setTeamValidationError("");

      onStart(customTeamToGameId(homeDocForSubmit), customTeamToGameId(awayDocForSubmit), mt, {
        away: customTeamToPlayerOverrides(awayDocForSubmit),
        home: customTeamToPlayerOverrides(homeDocForSubmit),
        awayOrder: customTeamToLineupOrder(awayDocForSubmit),
        homeOrder: customTeamToLineupOrder(homeDocForSubmit),
        awayBench: customTeamToBenchRoster(awayDocForSubmit),
        homeBench: customTeamToBenchRoster(homeDocForSubmit),
        awayPitchers: customTeamToPitcherRoster(awayDocForSubmit),
        homePitchers: customTeamToPitcherRoster(homeDocForSubmit),
        startingPitcherIdx:
          mt !== null
            ? [
                awaySpPitchers.find((p) => p.idx === awayStarterIdx)?.idx ?? 0,
                homeSpPitchers.find((p) => p.idx === homeStarterIdx)?.idx ?? 0,
              ]
            : undefined,
      });
    } else {
      onStart(home, away, mt, { away: awayOverrides, home: homeOverrides, awayOrder, homeOrder });
    }
    ref.current?.close();
  };

  const awayLabel =
    gameType === "custom"
      ? customTeams.find((t) => t.id === customAwayId)
        ? customTeamToDisplayName(customTeams.find((t) => t.id === customAwayId)!)
        : "Away"
      : away;
  const homeLabel =
    gameType === "custom"
      ? customTeams.find((t) => t.id === customHomeId)
        ? customTeamToDisplayName(customTeams.find((t) => t.id === customHomeId)!)
        : "Home"
      : home;

  return (
    <Dialog ref={ref} onCancel={(e) => e.preventDefault()} data-testid="new-game-dialog">
      {onBackToHome && (
        <BackHomeButton
          type="button"
          onClick={onBackToHome}
          data-testid="new-game-back-home-button"
        >
          ← Home
        </BackHomeButton>
      )}
      <Title>⚾ New Game</Title>
      {onResume && autoSaveName && (
        <>
          <ResumeButton type="button" onClick={onResume}>
            ▶ <ResumeLabel>Resume:</ResumeLabel> {autoSaveName}
          </ResumeButton>
          <Divider>— or start a new game —</Divider>
        </>
      )}
      <form onSubmit={handleSubmit}>
        <TabRow role="tablist" aria-label="Team type">
          <Tab
            type="button"
            role="tab"
            aria-selected={gameType === "mlb"}
            $active={gameType === "mlb"}
            onClick={() => setGameType("mlb")}
            data-testid="new-game-mlb-teams-tab"
          >
            MLB Teams
          </Tab>
          <Tab
            type="button"
            role="tab"
            aria-selected={gameType === "custom"}
            $active={gameType === "custom"}
            onClick={() => setGameType("custom")}
            data-testid="new-game-custom-teams-tab"
          >
            Custom Teams
          </Tab>
        </TabRow>

        {gameType === "mlb" ? (
          <>
            <FieldGroup data-testid="matchup-mode-select">
              <SectionLabel>Matchup</SectionLabel>
              {(
                [
                  ["al", "AL vs AL"],
                  ["nl", "NL vs NL"],
                  ["interleague", "Interleague"],
                ] as const
              ).map(([v, label]) => (
                <RadioLabel key={v}>
                  <input
                    type="radio"
                    name="mode"
                    value={v}
                    checked={mode === v}
                    onChange={() => handleModeChange(v)}
                  />
                  {label}
                </RadioLabel>
              ))}
            </FieldGroup>
            {mode === "interleague" && (
              <FieldGroup>
                <SectionLabel>Home team league</SectionLabel>
                {(
                  [
                    ["al", "AL"],
                    ["nl", "NL"],
                  ] as const
                ).map(([v, label]) => (
                  <RadioLabel key={v}>
                    <input
                      type="radio"
                      name="homeLeague"
                      value={v}
                      checked={homeLeague === v}
                      onChange={() => handleHomeLeagueChange(v)}
                    />
                    {label}
                  </RadioLabel>
                ))}
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel htmlFor="ng-home">Home team</FieldLabel>
              <Select
                id="ng-home"
                data-testid="home-team-select"
                value={home}
                onChange={(e) => setHome(e.target.value)}
              >
                {homeList.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="ng-away">Away team</FieldLabel>
              <Select
                id="ng-away"
                data-testid="away-team-select"
                value={away}
                onChange={(e) => setAway(e.target.value)}
              >
                {awayList.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </>
        ) : (
          <>
            <CustomTeamMatchup
              teams={customTeams}
              awayTeamId={customAwayId}
              homeTeamId={customHomeId}
              onAwayChange={setCustomAwayId}
              onHomeChange={setCustomHomeId}
              onManageTeams={onManageTeams}
            />
            {teamValidationError && (
              <TeamValidationError role="alert" data-testid="team-validation-error">
                ⚠ {teamValidationError}
              </TeamValidationError>
            )}
          </>
        )}
        <FieldGroup>
          <SectionLabel>Manage a team?</SectionLabel>
          {(["none", "0", "1"] as const).map((v) => (
            <RadioLabel key={v}>
              <input
                type="radio"
                name="managed"
                value={v}
                checked={managed === v}
                onChange={() => setManaged(v)}
              />
              {v === "none"
                ? "None — just watch"
                : v === "0"
                  ? `Away (${awayLabel})`
                  : `Home (${homeLabel})`}
            </RadioLabel>
          ))}
        </FieldGroup>
        {gameType === "custom" && managed !== "none" && (
          <>
            {(managed === "0" || managed === "1") &&
              (() => {
                const isAway = managed === "0";
                const spPitchers = isAway ? awaySpPitchers : homeSpPitchers;
                const starterIdx = isAway ? awayStarterIdx : homeStarterIdx;
                const setStarterIdx = isAway ? setAwayStarterIdx : setHomeStarterIdx;
                const teamLabel = isAway ? awayLabel : homeLabel;
                if (spPitchers.length === 0) return null;
                return (
                  <FieldGroup>
                    <FieldLabel htmlFor="ng-starter">{teamLabel} starting pitcher</FieldLabel>
                    <Select
                      id="ng-starter"
                      data-testid="starting-pitcher-select"
                      value={starterIdx}
                      onChange={(e) => setStarterIdx(Number(e.target.value))}
                    >
                      {spPitchers.map((p) => (
                        <option key={p.id} value={p.idx}>
                          {p.name}
                          {p.pitchingRole ? ` (${p.pitchingRole})` : ""}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                );
              })()}
          </>
        )}
        {gameType === "mlb" && (
          <PlayerCustomizationPanel
            awayTeam={away}
            homeTeam={home}
            awayOverrides={awayOverrides}
            homeOverrides={homeOverrides}
            onAwayChange={setAwayOverrides}
            onHomeChange={setHomeOverrides}
            awayOrder={awayOrder}
            homeOrder={homeOrder}
            onAwayOrderChange={setAwayOrder}
            onHomeOrderChange={setHomeOrder}
          />
        )}
        <FieldGroup>
          <FieldLabel htmlFor="ng-seed">Seed</FieldLabel>
          <Input
            id="ng-seed"
            type="text"
            data-testid="seed-input"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="random"
            autoComplete="off"
            spellCheck={false}
          />
          <SeedHint>
            Leave blank for a random game. Share the URL after starting to replay.
          </SeedHint>
        </FieldGroup>
        <PlayBallButton type="submit" data-testid="play-ball-button">
          Play Ball!
        </PlayBallButton>
      </form>
    </Dialog>
  );
};

export default NewGameDialog;
