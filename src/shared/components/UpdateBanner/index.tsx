import * as React from "react";

import { Actions, Banner, DismissButton, Message, ReloadButton } from "./styles";

interface Props {
  onDismiss: () => void;
}

/**
 * Persistent bottom banner shown when the service worker detects a new app
 * version has been deployed.  Warns the user that continuing without reloading
 * may cause unexpected game behavior, and offers a one-click reload — matching
 * the same direct window.location.reload() pattern used by ErrorBoundary.
 */
const UpdateBanner: React.FunctionComponent<Props> = ({ onDismiss }) => (
  <Banner role="alert" aria-live="polite" data-testid="update-banner">
    <Message>
      ⚠️ A new version of Ballgame is available. Running an outdated version may cause unexpected
      game behavior — reload now to update.
    </Message>
    <Actions>
      <ReloadButton onClick={() => window.location.reload()}>🔄 Reload app</ReloadButton>
      <DismissButton onClick={onDismiss} aria-label="Dismiss update notice">
        ✕
      </DismissButton>
    </Actions>
  </Banner>
);

export default UpdateBanner;
