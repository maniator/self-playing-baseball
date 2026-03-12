import * as React from "react";

import { ErrorBoundary } from "@feat/gameplay/components/Game/ErrorBoundary";
import UpdateBanner from "@shared/components/UpdateBanner";
import { useSeedDemoTeams } from "@shared/hooks/useSeedDemoTeams";
import { useServiceWorkerUpdate } from "@shared/hooks/useServiceWorkerUpdate";
import { Outlet } from "react-router";

/**
 * Thin root layout that wraps all routes with the application's ErrorBoundary
 * and renders the matched child route via <Outlet />.
 *
 * Also mounts the SW update banner: when a new version is deployed the service
 * worker posts SW_UPDATED after claiming clients, and the banner prompts the
 * user to reload before the outdated JS causes game issues.
 */
const RootLayout: React.FunctionComponent = () => {
  const { updateAvailable, dismiss } = useServiceWorkerUpdate();
  useSeedDemoTeams();

  return (
    <ErrorBoundary>
      <Outlet />
      {updateAvailable && <UpdateBanner onDismiss={dismiss} />}
    </ErrorBoundary>
  );
};

export default RootLayout;
