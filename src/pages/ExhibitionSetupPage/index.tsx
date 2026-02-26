import * as React from "react";

import { useNavigate, useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/AppShell";
import CustomTeamMatchup from "@components/NewGameDialog/CustomTeamMatchup";
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

import MlbTeamsSection from "./MlbTeamsSection";
import { PageContainer } from "./styles";
import { useExhibitionSetup } from "./useExhibitionSetup";

/**
 * Full-page Exhibition Setup — the primary "New Game" entry point.
 * Replaces the New Game dialog for the Home → New Game path.
 * Defaults to Custom Teams tab; MLB tab remains as a secondary option.
 */
const ExhibitionSetupPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { onStartGame } = useOutletContext<AppShellOutletContext>();

  const {
    gameType,
    setGameType,
    managed,
    setManaged,
    seedInput,
    setSeedInput,
    teamValidationError,
    teamSelection,
    playerCustomization,
    customTeams,
    customAwayId,
    setCustomAwayId,
    customHomeId,
    setCustomHomeId,
    awaySpPitchers,
    homeSpPitchers,
    awayStarterIdx,
    setAwayStarterIdx,
    homeStarterIdx,
    setHomeStarterIdx,
    awayLabel,
    homeLabel,
    handleSubmit,
  } = useExhibitionSetup(onStartGame);

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
          <MlbTeamsSection
            {...teamSelection}
            {...playerCustomization}
            setHome={teamSelection.setHome}
            setAway={teamSelection.setAway}
          />
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
