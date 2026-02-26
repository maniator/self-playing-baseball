import * as React from "react";

import { Outlet } from "react-router-dom";

import { ErrorBoundary } from "@components/Game/ErrorBoundary";

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
