import * as React from "react";

import { createBrowserRouter, Navigate, redirect, useOutletContext } from "react-router";

import type { AppShellOutletContext } from "@components/AppShell";
import AppShell from "@components/AppShell";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";
import RootLayout from "@components/RootLayout";

const ExhibitionSetupPage = React.lazy(() => import("./pages/ExhibitionSetupPage"));
const GamePage = React.lazy(() => import("./pages/GamePage"));
const HelpPage = React.lazy(() => import("./pages/HelpPage"));
const SavesPage = React.lazy(() => import("./pages/SavesPage"));

/** Route element for `/` — reads navigation callbacks from AppShell outlet context. */
function HomeRoute() {
  const ctx = useOutletContext<AppShellOutletContext>();
  return (
    <HomeScreen
      onNewGame={ctx.onNewGame}
      onLoadSaves={ctx.onLoadSaves}
      onManageTeams={ctx.onManageTeams}
      onResumeCurrent={ctx.hasActiveSession ? ctx.onResumeCurrent : undefined}
      onHelp={ctx.onHelp}
    />
  );
}

/** Route element for `/teams`, `/teams/new`, `/teams/:teamId/edit`. */
function TeamsRoute() {
  const ctx = useOutletContext<AppShellOutletContext>();
  return <ManageTeamsScreen onBack={ctx.onBackToHome} hasActiveGame={ctx.hasActiveSession} />;
}

/**
 * Route element for `/game`.
 * Renders GamePage as a real route element.
 */
function GameRoute() {
  return (
    <React.Suspense fallback={null}>
      <GamePage />
    </React.Suspense>
  );
}

/**
 * Application data router.
 *
 * Route tree:
 *   / (RootLayout – ErrorBoundary wrapper)
 *     AppShell – layout; provides outlet context for child routes
 *       /                    → HomeRoute        → HomeScreen
 *       /game                → GameRoute        → GamePage → Game
 *       /teams               → TeamsRoute       → ManageTeamsScreen (list)
 *       /teams/new           → TeamsRoute       → ManageTeamsScreen (create editor)
 *       /teams/:teamId/edit  → TeamsRoute       → ManageTeamsScreen (edit editor)
 *       /saves               → SavesPage
 *       /help                → HelpPage
 *       /exhibition/new      → ExhibitionSetupPage
 *     * → redirect to /
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRoute /> },
          { path: "game", element: <GameRoute /> },
          { path: "teams", element: <TeamsRoute /> },
          { path: "teams/new", element: <TeamsRoute /> },
          {
            path: "teams/:teamId/edit",
            element: <TeamsRoute />,
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
