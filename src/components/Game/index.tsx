import * as React from "react";

import styled from "styled-components";

import { GameProviderWrapper } from "@context/index";

import { ErrorBoundary } from "./ErrorBoundary";
import GameInner from "./GameInner";

const GithubRibbon = styled.a.attrs({
  href: "https://github.com/maniator/self-playing-baseball",
  "data-ribbon": "View on Github",
  title: "View on Github",
  className: "github-fork-ribbon left-bottom fixed",
  target: "_blank",
  rel: "noreferrer",
})`
  &:before {
    background-color: #2e8b57;
  }
`;

const Game: React.FunctionComponent = () => (
  <ErrorBoundary>
    <GameProviderWrapper>
      <GithubRibbon>View on GitHub</GithubRibbon>
      <GameInner />
    </GameProviderWrapper>
  </ErrorBoundary>
);

export default Game;
