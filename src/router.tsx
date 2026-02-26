import * as React from "react";

import { createBrowserRouter, Navigate, redirect } from "react-router-dom";

import AppShell from "@components/AppShell";
import RootLayout from "@components/RootLayout";
import { CustomTeamStore } from "@storage/customTeamStore";

const ExhibitionSetupPage = React.lazy(() => import("./pages/ExhibitionSetupPage"));

/**
 * Application data router.
 *
 * Route tree:
 *   / (RootLayout – ErrorBoundary wrapper)
 *     AppShell – persistent layout; keeps Game mounted via display:none
 *       /                    → HomeScreen
 *       /game                → Game view (display block)
 *       /teams               → ManageTeamsScreen (list)
 *       /teams/new           → ManageTeamsScreen (create editor)
 *       /teams/:teamId/edit  → ManageTeamsScreen (edit editor; redirects if team not found)
 *       /exhibition/new      → ExhibitionSetupPage (via <Outlet />)
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
          { path: "teams/new" },
          {
            path: "teams/:teamId/edit",
            loader: async ({ params }) => {
              const team = await CustomTeamStore.getCustomTeam(params.teamId!);
              if (!team) return redirect("/teams");
              return null;
            },
          },
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
