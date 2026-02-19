import * as React from "react";
import * as ReactDom from "react-dom";

import "./index.scss";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

const Root: React.FC = () => {
  React.useEffect(() => {
    initSeedFromUrl({ writeToUrl: true });
  }, []);

  return <Game homeTeam="Yankees" awayTeam="Mets" />;
};

ReactDom.render(<Root />, document.getElementById("game"));
