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
import { useNavigate, useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/AppShell";
import { getSpEligiblePitchers } from "@components/NewGameDialog";
import CustomTeamMatchup from "@components/NewGameDialog/CustomTeamMatchup";
import PlayerCustomizationPanel from "@components/NewGameDialog/PlayerCustomizationPanel";
import {
  BackHomeButton,
  FieldGroup,
  FieldLabel,
  Input,
  PlayBallButton,
  RadioLabel,
  SectionLabel,
  SeedHint,
  Select,
  Tab,
  TabRow,
  TeamValidationError,
  Title,
} from "@components/NewGameDialog/styles";
import { usePlayerCustomization } from "@components/NewGameDialog/usePlayerCustomization";
import { useTeamSelection } from "@components/NewGameDialog/useTeamSelection";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { getSeed, reinitSeed } from "@utils/rng";

import { PageContainer } from "./styles";

type ManagedTeam = 0 | 1 | null;
type GameType = "mlb" | "custom";

/**
 * Full-page Exhibition Setup — the primary "New Game" entry point.
 * Replaces the New Game dialog for the Home → New Game path.
 * Defaults to Custom Teams tab; MLB tab remains as a secondary option.
 */
const ExhibitionSetupPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { onStartGame } = useOutletContext<AppShellOutletContext>();

  // Default to custom teams — key requirement of Stage 4A.
  const [gameType, setGameType] = React.useState<GameType>("custom");
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");
  const [seedInput, setSeedInput] = React.useState(() => getSeed()?.toString(36) ?? "");
  const [teamValidationError, setTeamValidationError] = React.useState<string>("");

  const {
    mode,
    homeLeague,
    home,
    setHome,
    away,
    setAway,
    homeList,
    awayList,
    handleModeChange,
    handleHomeLeagueChange,
  } = useTeamSelection();
  const {
    homeOverrides,
    setHomeOverrides,
    awayOverrides,
    setAwayOverrides,
    homeOrder,
    setHomeOrder,
    awayOrder,
    setAwayOrder,
  } = usePlayerCustomization(home, away);

  const { teams: customTeams } = useCustomTeams();
  const [customAwayId, setCustomAwayId] = React.useState<string>("");
  const [customHomeId, setCustomHomeId] = React.useState<string>("");

  React.useEffect(() => {
    if (customTeams.length === 0) return;
    const ids = customTeams.map((t) => t.id);
    if (!customAwayId || !ids.includes(customAwayId)) setCustomAwayId(customTeams[0].id);
    if (!customHomeId || !ids.includes(customHomeId))
      setCustomHomeId(customTeams[customTeams.length > 1 ? 1 : 0].id);
  }, [customTeams, customAwayId, customHomeId]);

  const awayDoc = customTeams.find((t) => t.id === customAwayId);
  const homeDoc = customTeams.find((t) => t.id === customHomeId);
  const awaySpPitchers = getSpEligiblePitchers(awayDoc?.roster?.pitchers ?? []);
  const homeSpPitchers = getSpEligiblePitchers(homeDoc?.roster?.pitchers ?? []);

  const [awayStarterIdx, setAwayStarterIdx] = React.useState<number>(0);
  const [homeStarterIdx, setHomeStarterIdx] = React.useState<number>(0);

  React.useEffect(() => {
    const doc = customTeams.find((t) => t.id === customAwayId);
    const sp = getSpEligiblePitchers(doc?.roster?.pitchers ?? []);
    setAwayStarterIdx(sp[0]?.idx ?? 0);
  }, [customAwayId, customTeams]);

  React.useEffect(() => {
    const doc = customTeams.find((t) => t.id === customHomeId);
    const sp = getSpEligiblePitchers(doc?.roster?.pitchers ?? []);
    setHomeStarterIdx(sp[0]?.idx ?? 0);
  }, [customHomeId, customTeams]);

  React.useEffect(() => {
    setTeamValidationError("");
  }, [customAwayId, customHomeId, gameType]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reinitSeed(seedInput.trim());
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);

    if (gameType === "custom") {
      const awayDocForSubmit = customTeams.find((t) => t.id === customAwayId);
      const homeDocForSubmit = customTeams.find((t) => t.id === customHomeId);
      if (!awayDocForSubmit || !homeDocForSubmit) return;

      if (customAwayId === customHomeId) {
        setTeamValidationError(
          "Away and home teams must be different — choose two different teams.",
        );
        return;
      }

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

      if (mt !== null) {
        const managedSpPitchers = mt === 0 ? awaySpPitchers : homeSpPitchers;
        const managedLabel = mt === 0 ? awayLabel : homeLabel;
        if (managedSpPitchers.length === 0) {
          setTeamValidationError(
            `${managedLabel} has no SP-eligible pitchers. Add at least one SP or SP/RP pitcher to start a managed game.`,
          );
          return;
        }
      }

      setTeamValidationError("");
      onStartGame({
        homeTeam: customTeamToGameId(homeDocForSubmit),
        awayTeam: customTeamToGameId(awayDocForSubmit),
        managedTeam: mt,
        playerOverrides: {
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
        },
      });
    } else {
      onStartGame({
        homeTeam: home,
        awayTeam: away,
        managedTeam: mt,
        playerOverrides: { away: awayOverrides, home: homeOverrides, awayOrder, homeOrder },
      });
    }
  };

  return (
    <PageContainer data-testid="exhibition-setup-page">
      <BackHomeButton
        type="button"
        onClick={() => navigate("/")}
        data-testid="new-game-back-home-button"
      >
        ← Home
      </BackHomeButton>
      <Title>⚾ New Exhibition Game</Title>
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
              <FieldLabel htmlFor="esp-home">Home team</FieldLabel>
              <Select
                id="esp-home"
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
              <FieldLabel htmlFor="esp-away">Away team</FieldLabel>
              <Select
                id="esp-away"
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
              onManageTeams={() => navigate("/teams")}
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

        {gameType === "custom" &&
          managed !== "none" &&
          (() => {
            const isAway = managed === "0";
            const spPitchers = isAway ? awaySpPitchers : homeSpPitchers;
            const starterIdx = isAway ? awayStarterIdx : homeStarterIdx;
            const setStarterIdx = isAway ? setAwayStarterIdx : setHomeStarterIdx;
            const teamLabel = isAway ? awayLabel : homeLabel;
            if (spPitchers.length === 0) return null;
            return (
              <FieldGroup>
                <FieldLabel htmlFor="esp-starter">{teamLabel} starting pitcher</FieldLabel>
                <Select
                  id="esp-starter"
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
          <FieldLabel htmlFor="esp-seed">Seed</FieldLabel>
          <Input
            id="esp-seed"
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
    </PageContainer>
  );
};

export default ExhibitionSetupPage;
