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
    <GameInner homeTeam={homeTeam} awayTeam={awayTeam} />
  </GameProviderWrapper>
);

export default Game;
