import * as React  from "react";

import styled from "styled-components"

import Diamond from "../Diamond";
import GameControls from "../GameControls";
import { GameProviderWrapper } from "../Context";
import Announcements from "../Announcements";
import ScoreBoard from "../ScoreBoard";
import GameInner from "./GameInner";

type Props = {
  homeTeam: string,
  awayTeam: string
}

const GithubRibbon = styled.a.attrs({
  href: "https://github.com/maniator/self-playing-baseball",
  "data-ribbon": "View on Github",
  title: "View on Github",
  className: "github-fork-ribbon left-bottom fixed",
  target: "_blank",
  rel: "noreferrer"
})`
  &:before {
   background-color: #2e8b57;
  }
`;

const Game: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => (
  <GameProviderWrapper>
    <GithubRibbon>
	View on GitHub
    </GithubRibbon>
    <GameInner homeTeam={homeTeam} awayTeam={awayTeam} />
  </GameProviderWrapper>
);

export default Game;
