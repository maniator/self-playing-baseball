import * as React from "react";

import { createRoot } from "react-dom/client";

import "github-fork-ribbon-css/gh-fork-ribbon.css";
import "./index.scss";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

initSeedFromUrl({ writeToUrl: true });

createRoot(document.getElementById("game")!).render(
  <Game homeTeam="Yankees" awayTeam="Mets" />
);
