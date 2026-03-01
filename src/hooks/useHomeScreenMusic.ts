import * as React from "react";

import { startHomeScreenMusic, stopHomeScreenMusic } from "@utils/announce";

/**
 * Starts the looping home-screen background music when the component mounts
 * (and when the user unmutes) and stops it on unmount or when muted.
 * Smooth volume changes via the master gain are handled inside audio.ts — this
 * hook only manages the muted ↔ unmuted lifecycle transition.
 */
export const useHomeScreenMusic = (alertVolume: number): void => {
  const isUnmuted = alertVolume > 0;
  React.useEffect(() => {
    if (isUnmuted) {
      startHomeScreenMusic();
    } else {
      stopHomeScreenMusic();
    }
    return () => stopHomeScreenMusic();
  }, [isUnmuted]);
};
