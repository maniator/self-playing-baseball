import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.scss";
import "github-fork-ribbon-css/gh-fork-ribbon.css";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

const Root: React.FC = () => {
  React.useEffect(() => {
    initSeedFromUrl({ writeToUrl: true });
  }, []);

  return <Game homeTeam="Yankees" awayTeam="Mets" />;
};

const container = document.getElementById("game");
createRoot(container!).render(<Root />);
