import * as React from "react";

import { ErrorBoundary } from "@feat/gameplay/components/Game/ErrorBoundary";
import { Outlet } from "react-router";

/**
 * Thin root layout that wraps all routes with the application's ErrorBoundary
 * and renders the matched child route via <Outlet />.
 */
const RootLayout: React.FunctionComponent = () => (
  <ErrorBoundary>
    <Outlet />
  </ErrorBoundary>
);

export default RootLayout;
