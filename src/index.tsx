import "@fontsource-variable/inter";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import { theme } from "@shared/theme";
import { appLog } from "@shared/utils/logger";
import { initSeed } from "@shared/utils/rng";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "styled-components";

import { router } from "./router";

initSeed();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((reg) => {
      appLog.log("SW registered — scope:", reg.scope);

      // --- Why explicit update checks are required for this PWA ---
      //
      // Browsers normally detect a new SW when a navigation request is made.
      // This app uses React Router (client-side routing), so after the initial
      // load there are NO further page-level network requests — every route
      // change is handled in JS.  When the app is installed as a PWA, even the
      // initial load is served from the SW cache, so the browser may never
      // make a network request at all.
      //
      // reg.update() bypasses the browser's 24-hour update-check throttle and
      // immediately fetches sw.js from the network to see if it has changed.
      // We call it in two complementary ways:
      //   1. visibilitychange — fires whenever the user returns to the tab/app
      //      after it was backgrounded (most common real-world trigger).
      //   2. setInterval every 60 min — catches the case where the game is
      //      running continuously in the foreground (auto-play left overnight).

      const checkForUpdate = () => reg.update().catch(() => {});

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });

      const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
      setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    })
    .catch((err) => appLog.error("SW registration failed:", err));
}

createRoot(document.getElementById("game")!).render(
  <ThemeProvider theme={theme}>
    <RouterProvider router={router} />
  </ThemeProvider>,
);
