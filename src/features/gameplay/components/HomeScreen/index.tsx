import * as React from "react";

import { HomeContainer, HomeLogo, HomeSubtitle, LeagueTeaserBox, LeagueTeaserSub, LeagueTeaserTitle, MenuGroup, PrimaryBtn, SecondaryBtn } from "./styles"; // prettier-ignore

type Props = {
  onNewGame: () => void;
  onLoadSaves: () => void;
  onManageTeams: () => void;
  /** When provided, shows a "Resume Current Game" button above the other actions. */
  onResumeCurrent?: () => void;
  /** When provided, shows a "How to Play" button. */
  onHelp?: () => void;
  /** When provided, shows a "Career Stats" button. */
  onCareerStats?: () => void;
};

const HomeScreen: React.FunctionComponent<Props> = ({
  onNewGame,
  onLoadSaves,
  onManageTeams,
  onResumeCurrent,
  onHelp,
  onCareerStats,
}) => (
  <HomeContainer data-testid="home-screen">
    <HomeLogo>
      <img src="/images/blipit.svg" alt="BlipIt Baseball Legends" />
    </HomeLogo>
    <HomeSubtitle>Self-playing baseball simulator</HomeSubtitle>
    <MenuGroup>
      {onResumeCurrent && (
        <PrimaryBtn onClick={onResumeCurrent} data-testid="home-resume-current-game-button">
          ▶ Resume Current Game
        </PrimaryBtn>
      )}
      <PrimaryBtn onClick={onNewGame} data-testid="home-new-game-button">
        New Game
      </PrimaryBtn>
      <PrimaryBtn onClick={onLoadSaves} data-testid="home-load-saves-button">
        Load Saved Game
      </PrimaryBtn>
      <SecondaryBtn onClick={onManageTeams} data-testid="home-manage-teams-button">
        Manage Teams
      </SecondaryBtn>
      {onHelp && (
        <SecondaryBtn onClick={onHelp} data-testid="home-help-button">
          How to Play
        </SecondaryBtn>
      )}
      {onCareerStats && (
        <SecondaryBtn onClick={onCareerStats} data-testid="home-career-stats-button">
          Career Stats
        </SecondaryBtn>
      )}
    </MenuGroup>
    <LeagueTeaserBox data-testid="league-play-teaser">
      <LeagueTeaserTitle>
        <span aria-hidden="true">🏆</span> League play coming soon
      </LeagueTeaserTitle>
      <LeagueTeaserSub>
        Season schedules, standings, and playoffs are on the roadmap.
      </LeagueTeaserSub>
    </LeagueTeaserBox>
  </HomeContainer>
);

export default HomeScreen;
