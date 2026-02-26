import "@fontsource-variable/inter";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import { RouterProvider } from "react-router-dom";

import { appLog } from "@utils/logger";
import { initSeedFromUrl } from "@utils/rng";

import { router } from "./router";

initSeedFromUrl({ writeToUrl: true });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((reg) => appLog.log("SW registered — scope:", reg.scope))
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(<RouterProvider router={router} />);
