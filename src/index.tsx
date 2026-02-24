import "@fontsource-variable/inter";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import AppShell from "@components/AppShell";
import { ErrorBoundary } from "@components/Game/ErrorBoundary";
import { appLog } from "@utils/logger";
import { initSeedFromUrl } from "@utils/rng";

initSeedFromUrl({ writeToUrl: true });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((reg) => appLog.log("SW registered — scope:", reg.scope))
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(
  <ErrorBoundary>
    <AppShell />
  </ErrorBoundary>,
);
