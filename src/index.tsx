import "@fontsource-variable/inter";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import { appLog } from "@shared/utils/logger";
import { initSeed } from "@shared/utils/rng";
import { RouterProvider } from "react-router";

import { router } from "./router";

initSeed();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((reg) => appLog.log("SW registered — scope:", reg.scope))
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(<RouterProvider router={router} />);
