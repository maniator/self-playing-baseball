import "github-fork-ribbon-css/gh-fork-ribbon.css";
import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.scss";

import Game from "./Game";
import { initSeedFromUrl } from "./utilities/rng";

initSeedFromUrl({ writeToUrl: true });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("./sw.ts", import.meta.url))
    .catch(() => {/* SW not supported or blocked — graceful degradation */});
}

createRoot(document.getElementById("game")!).render(<Game homeTeam="Yankees" awayTeam="Mets" />);
