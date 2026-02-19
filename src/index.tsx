import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.scss";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

initSeedFromUrl({ writeToUrl: true });

const container = document.getElementById("game");

if (container) {
  const root = createRoot(container);
  root.render(<Game homeTeam="Yankees" awayTeam="Mets" />);
}
