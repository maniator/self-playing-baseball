import * as React from "react";

import * as ReactDom from "react-dom";

import "./index.scss";

import Game from "./Game";

ReactDom.render(<Game homeTeam="Yankees" awayTeam="Mets" />, document.getElementById("game"));