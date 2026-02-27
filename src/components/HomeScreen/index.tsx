import * as React from "react";

import { HomeContainer, HomeLogo, HomeSubtitle, HomeTitle, MenuGroup, PrimaryBtn, SecondaryBtn } from "./styles"; // prettier-ignore

type Props = {
  onNewGame: () => void;
  onLoadSaves: () => void;
  onManageTeams: () => void;
  /** When provided, shows a "Resume Current Game" button above the other actions. */
  onResumeCurrent?: () => void;
  /** When provided, shows a "How to Play" button. */
  onHelp?: () => void;
};

const HomeScreen: React.FunctionComponent<Props> = ({
  onNewGame,
  onLoadSaves,
  onManageTeams,
  onResumeCurrent,
  onHelp,
}) => (
  <HomeContainer data-testid="home-screen">
    <HomeLogo>⚾</HomeLogo>
    <HomeTitle>Ballgame</HomeTitle>
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
    </MenuGroup>
  </HomeContainer>
);

export default HomeScreen;
