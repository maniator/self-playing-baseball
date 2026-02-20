import * as React from "react";

/**
 * Registers a keyup listener that triggers a pitch on Spacebar,
 * unless auto-play is active, the game has not started, or the user
 * is typing in a text input.
 */
export const useKeyboardPitch = (
  autoPlayRef: React.MutableRefObject<boolean>,
  handleClickRef: React.MutableRefObject<() => void>,
  gameStartedRef: React.MutableRefObject<boolean>,
): void => {
  const handlePitch = React.useCallback(
    (event: KeyboardEvent) => {
      if (autoPlayRef.current) return;
      if (!gameStartedRef.current) return;
      if ((event.target as HTMLInputElement).type !== "text") {
        handleClickRef.current();
      }
    },
    [autoPlayRef, handleClickRef, gameStartedRef],
  );

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handlePitch]);
};
