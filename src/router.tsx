import * as React from "react";

import { createBrowserRouter, Navigate } from "react-router-dom";

import AppShell from "@components/AppShell";
import RootLayout from "@components/RootLayout";

const ExhibitionSetupPage = React.lazy(() => import("./pages/ExhibitionSetupPage"));

/**
 * Application data router.
 *
 * Route tree:
 *   / (RootLayout – ErrorBoundary wrapper)
 *     AppShell – persistent layout; keeps Game mounted via display:none
 *       /               → HomeScreen
 *       /game           → Game view (display block)
 *       /teams          → ManageTeamsScreen
 *       /exhibition/new → ExhibitionSetupPage (via <Outlet />)
 *     * → redirect to /
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true },
          { path: "game" },
          { path: "teams" },
          {
            path: "exhibition/new",
            element: (
              <React.Suspense fallback={null}>
                <ExhibitionSetupPage />
              </React.Suspense>
            ),
          },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
