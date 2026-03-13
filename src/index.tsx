import "@fontsource-variable/inter";
import "./index.scss";

import * as React from "react";
import { createRoot } from "react-dom/client";

import { theme } from "@shared/theme";
import { initSeed } from "@shared/utils/rng";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "styled-components";

import { router } from "./router";

initSeed();

createRoot(document.getElementById("game")!).render(
  <ThemeProvider theme={theme}>
    <RouterProvider router={router} />
  </ThemeProvider>,
);
