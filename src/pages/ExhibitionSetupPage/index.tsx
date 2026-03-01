import * as React from "react";

import { useNavigate, useOutletContext } from "react-router";

import type { AppShellOutletContext } from "@components/AppShell";
import CustomTeamMatchup from "@components/NewGameDialog/CustomTeamMatchup";
import {
  FieldGroup,
  FieldLabel,
  Input,
  PlayBallButton,
  RadioLabel,
  SectionLabel,
  SeedHint,
  TeamValidationError,
} from "@components/NewGameDialog/styles";

import StarterPitcherSelector from "./StarterPitcherSelector";
import { BackBtn, PageContainer, PageHeader, PageTitle } from "./styles";
import { useExhibitionSetup } from "./useExhibitionSetup";

/**
 * Full-page Exhibition Setup — the primary "New Game" entry point.
 * Custom-teams-only: no MLB tab.
 */
const ExhibitionSetupPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { onStartGame } = useOutletContext<AppShellOutletContext>();

  const {
    managed,
    setManaged,
    seedInput,
    setSeedInput,
    teamValidationError,
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

  // Derive starting-pitcher selector values once (avoids IIFE in JSX).
  const isAwayManaged = managed === "0";
  const managedSpPitchers =
    managed !== "none" ? (isAwayManaged ? awaySpPitchers : homeSpPitchers) : [];
  const managedStarterIdx = isAwayManaged ? awayStarterIdx : homeStarterIdx;
  const managedSetStarterIdx = isAwayManaged ? setAwayStarterIdx : setHomeStarterIdx;
  const managedTeamLabel = isAwayManaged ? awayLabel : homeLabel;

  return (
    <PageContainer data-testid="exhibition-setup-page">
      <PageHeader>
        <BackBtn
          type="button"
          onClick={() => navigate("/")}
          data-testid="new-game-back-home-button"
          aria-label="Back to Home"
        >
          ← Back to Home
        </BackBtn>
      </PageHeader>
      <PageTitle>⚾ New Exhibition Game</PageTitle>
      <form onSubmit={handleSubmit}>
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

        {managed !== "none" && managedSpPitchers.length > 0 && (
          <StarterPitcherSelector
            teamLabel={managedTeamLabel}
            startIdx={managedStarterIdx}
            pitchers={managedSpPitchers}
            onSelect={managedSetStarterIdx}
          />
        )}

        <FieldGroup>
          <FieldLabel htmlFor="esp-seed">Seed</FieldLabel>
          <Input
            id="esp-seed"
            type="text"
            data-testid="seed-input"
            value={seedInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeedInput(e.target.value)}
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
