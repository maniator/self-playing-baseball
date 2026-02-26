import * as React from "react";

import { createBrowserRouter, Navigate, redirect } from "react-router-dom";

import AppShell from "@components/AppShell";
import RootLayout from "@components/RootLayout";

const ExhibitionSetupPage = React.lazy(() => import("./pages/ExhibitionSetupPage"));
const HelpPage = React.lazy(() => import("./pages/HelpPage"));
const SavesPage = React.lazy(() => import("./pages/SavesPage"));

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
 *       /saves               → SavesPage (exhibition saves)
 *       /help                → HelpPage (how to play)
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
              // Only redirect when the :teamId segment is missing entirely.
              // If the team document doesn't exist in the DB, ManageTeamsScreen
              // renders its own "Team not found" state (loading → not-found → loaded).
              if (!params.teamId) return redirect("/teams");
              return null;
            },
          },
          {
            path: "saves",
            element: (
              <React.Suspense fallback={null}>
                <SavesPage />
              </React.Suspense>
            ),
          },
          {
            path: "help",
            element: (
              <React.Suspense fallback={null}>
                <HelpPage />
              </React.Suspense>
            ),
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
