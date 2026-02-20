import "github-fork-ribbon-css/gh-fork-ribbon.css";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import Game from "@components/Game";
import { ErrorBoundary } from "@components/Game/ErrorBoundary";
import { appLog } from "@utils/logger";
import { initSeedFromUrl } from "@utils/rng";

initSeedFromUrl({ writeToUrl: true });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("./sw.ts", import.meta.url), { type: "module" })
    .then((reg) => appLog.log("SW registered — scope:", reg.scope))
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(
  <ErrorBoundary>
    <Game />
  </ErrorBoundary>,
);
