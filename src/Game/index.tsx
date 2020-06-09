import * as React  from "react";

import Diamond from "../Diamond";
import BatterButton from "../BatterButton";
import { GameProviderWrapper } from "../Context";
import Announcements from "../Announcements";
import ScoreBoard from "../ScoreBoard";
import GameInner from "./GameInner";

type Props = {
  homeTeam: string,
  awayTeam: string
}

const Game: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => (
  <GameProviderWrapper>
    <a class="github-fork-ribbon left-bottom fixed"
       href="https://github.com/maniator/self-playing-basebal"
       data-ribbon="View on GitHub"
       title="View on GitHub"
    >
	View on GitHub
    </a>
    <GameInner homeTeam={homeTeam} awayTeam={awayTeam} />
  </GameProviderWrapper>
);

export default Game;
