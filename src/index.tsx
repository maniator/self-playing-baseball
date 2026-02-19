import * as React from "react";

import * as ReactDom from "react-dom";

import "./index.scss";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

initSeedFromUrl({ writeToUrl: true });

ReactDom.render(<Game homeTeam="Yankees" awayTeam="Mets" />, document.getElementById("game"));
