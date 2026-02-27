import * as React from "react";

import { startHomeScreenMusic, stopHomeScreenMusic } from "@utils/announce";

/**
 * Starts the looping home-screen background music when the component mounts
 * and stops it on unmount (i.e. when the user navigates away from the home screen).
 */
export const useHomeScreenMusic = (): void => {
  React.useEffect(() => {
    startHomeScreenMusic();
    return () => stopHomeScreenMusic();
  }, []);
};
