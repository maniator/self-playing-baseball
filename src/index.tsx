import "github-fork-ribbon-css/gh-fork-ribbon.css";
import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.scss";

import Game from "@components/Game";
import { initSeedFromUrl } from "@utils/rng";
import { appLog } from "@utils/logger";

initSeedFromUrl({ writeToUrl: true });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("./sw.ts", import.meta.url), { type: "module" })
    .then((reg) => appLog.log("SW registered — scope:", reg.scope))
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(<Game homeTeam="Yankees" awayTeam="Mets" />);
